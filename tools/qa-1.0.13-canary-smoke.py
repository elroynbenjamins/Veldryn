"""Staging-only authenticated 1.0.13 smoke. Python 3, no dependencies.
Credentials are entered locally, never printed, never sent to any other host.
Default is read-only except normal sign-in and activity telemetry. Optional
--claim tests one idle settlement and exact replay; --equip-sakura requires an
already-authorized Sakura grant and explicit confirmation. No grant is issued.
"""
import argparse
import getpass
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request
import uuid

STAGE = "https://iqfmmpvwanvvmxcftfxw.supabase.co"
CANARY = "/functions/v1/gameplay-113-qa"
SAKURA = "ascendant-sakura-enchantment"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

OPENER = urllib.request.build_opener(NoRedirect())

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def request(key, path, method="GET", token=None, body=None):
    require(path.startswith("/") and not path.startswith("//"), "Invalid route")
    headers = {"apikey": key, "Content-Type": "application/json",
               "x-app-version": "1.0.13", "x-app-platform": "android"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(STAGE + path, data=data, headers=headers, method=method)
    try:
        with OPENER.open(req, timeout=30) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeError):
        result = None
    return status, result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--claim", action="store_true")
    parser.add_argument("--equip-sakura", action="store_true")
    opts = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / "apps/mobile/eas.json").read_text(encoding="utf-8"))
    env = config["build"]["staging"]["env"]
    require(env["EXPO_PUBLIC_SUPABASE_URL"] == STAGE, "Staging host mismatch")
    key = env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
    status, _ = request(key, CANARY)
    require(status == 401, "Unauthenticated canary request was not rejected")
    status, _ = request(key, CANARY, token="deliberately-invalid-qa-token")
    require(status == 401, "Invalid token was not rejected")
    email = input("Existing disposable staging email (@example.invalid): ").strip()
    require(email.lower().endswith("@example.invalid"), "Not a disposable staging email")
    password = getpass.getpass("Staging password (not displayed): ")
    status, auth = request(key, "/auth/v1/token?grant_type=password", "POST",
                           body={"email": email, "password": password})
    del password
    require(status == 200 and isinstance(auth, dict), f"Staging sign-in failed (HTTP {status})")
    token = auth.get("access_token")
    user = auth.get("user") or {}
    account = user.get("id")
    require(isinstance(token, str) and isinstance(account, str) and
            str(user.get("email", "")).lower() == email.lower(), "Unexpected authenticated identity")
    del auth
    try:
        status, before = request(key, CANARY, token=token)
        require(status == 200 and isinstance(before, dict) and before.get("accountId") == account,
                f"Canary snapshot not authenticated for this account (HTTP {status})")
        status, old = request(key, "/functions/v1/gameplay", token=token)
        require(status == 200 and isinstance(old, dict) and old.get("accountId") == account,
                f"Original endpoint snapshot failed (HTTP {status})")
        require(old.get("version") == before.get("version"), "Snapshot versions differ; close other sessions and retry")
        status, collection = request(key, "/rest/v1/rpc/ultra_luxe_collection_self_v1", "POST", token, {})
        require(status == 200 and collection.get("accountId") == account and
                isinstance(collection.get("collectionIds"), list), "Collection self readback failed")
        status, names = request(key, "/rest/v1/rpc/ultra_luxe_name_self_v1", "POST", token, {})
        require(status == 200 and names.get("accountId") == account and
                isinstance(names.get("ownedIds"), list), "Name self readback failed")
        print("PASS authenticated canary + original snapshot + collection and name self readback")
        print("Disposable QA account ID:", account)
        print("Verified premium collection count:", len(collection["collectionIds"]))
        if opts.claim or opts.equip_sakura:
            require(before["state"].get("activity") is None and
                    not (before["state"].get("character") or {}).get("classTraining"),
                    "Stop any activity/class training before this opt-in mutation test")
            require(input("Type TEST QA to allow writes to this disposable staging account: ") == "TEST QA",
                    "Mutation not confirmed")
        if opts.claim:
            hero = before["state"].get("character") or {}
            gold = hero.get("gold")
            require(hero.get("id") and isinstance(gold, int), "An existing active QA hero is required")
            body = {"requestId": "qa-claim-" + uuid.uuid4().hex,
                    "expectedVersion": before["version"], "command": {"type": "claim"}}
            status, saved = request(key, CANARY, "POST", token, body)
            require(status == 200 and saved.get("accountId") == account and
                    saved.get("version") == before["version"] + 1 and
                    saved["state"]["character"]["gold"] == gold, f"Idle claim failed (HTTP {status})")
            status, replay = request(key, CANARY, "POST", token, body)
            require(status == 200 and replay.get("version") == saved["version"] and
                    replay["state"]["character"]["gold"] == gold, "Claim replay mismatch")
            before = saved
            print("PASS idle claim and exact idempotent replay, Gold unchanged")
        if opts.equip_sakura:
            require(SAKURA in collection["collectionIds"], "No verified Sakura grant; request an additive staging grant first")
            hero = before["state"].get("character") or {}
            gold = hero.get("gold")
            require(hero.get("id") and isinstance(gold, int), "Active QA hero required")
            body = {"requestId": "luxe_full_set_" + uuid.uuid4().hex,
                    "expectedVersion": before["version"], "command": {
                        "type": "ultra_luxe_full_set", "args": {"collectionId": SAKURA,
                        "characterId": hero["id"], "expectedNameId": names.get("selectedId")}}}
            status, result = request(key, CANARY, "POST", token, body)
            require(status == 200 and result.get("replayed") is False, f"Sakura equip failed (HTTP {status})")
            snapshot = result["gameplay"]
            equipped = snapshot["state"]["character"]
            require(snapshot["accountId"] == account and snapshot["version"] == before["version"] + 1 and
                    equipped["id"] == hero["id"] and equipped["gold"] == gold and
                    equipped["profileBackgroundId"] == "ascendant-sakura-petal-sanctuary" and
                    equipped["profileBorderId"] == "ascendant-sakura-blossom-crown" and
                    equipped["selectedCosmeticPetId"] == "ascendant-sakura-spirit-fox" and
                    equipped["profileTitle"] == "Sakura Dreamkeeper" and
                    result["nameSelection"]["accountId"] == account and
                    result["nameSelection"]["selectedId"] == "ascendant-sakura-name", "Sakura readback mismatch")
            status, replay = request(key, CANARY, "POST", token, body)
            require(status == 200 and replay.get("replayed") is True and
                    replay["gameplay"]["version"] == snapshot["version"] and
                    replay["gameplay"]["state"]["character"]["gold"] == gold, "Sakura replay mismatch")
            print("PASS Sakura atomic equip and replay, name and Gold verified")
        print("PASS requested staging canary checks. No production calls.")
    finally:
        try:
            request(key, "/auth/v1/logout?scope=local", "POST", token)
        except Exception:
            pass

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, urllib.error.URLError, KeyError, TypeError, ValueError, TimeoutError) as err:
        # Never print server payloads, tokens, passwords or full snapshots.
        print("FAIL:", str(err) if isinstance(err, RuntimeError) else type(err).__name__, file=sys.stderr)
        sys.exit(1)
