# World Boss V59–V60 — verified chest proof and secure gathering gear resolution

**19 November 2026 — hidden draft, no live route, no migrations, no rewards, no inventory writes.**
Continuation of draft [#1407](https://github.com/elroynbenjamins/Veldryn/pull/1407).
The older separate V64–V65 draft [#1402](https://github.com/elroynbenjamins/Veldryn/pull/1402)
guaranteed a gathering item from every earned milestone chest. That conflicts with the
later, shared Party/World chest policy. **This integration preserves the later
three earned chests with a 1% equipment chance each**; the earlier V64 catalog and
V65 rarity/quality/affix distributions are reused ONLY after a successful 1% roll.
Do not merge or activate both reward policies independently.

## Pass 1 — canonical V59 evidence bridge
- `backend/src/server/combat/world-boss-chest-proof-v59.ts` maps a future
  **private DB read** into the existing V58 account/event chest preview.
- **War Camp Chest:** two distinct Tier-I community War Camp tracks plus at
  least one own committed V27 donation. Maximum two account donations.
- **Warrior Chest:** all three account-wide attack ordinals are committed
  **and** each has the V28 immutable replay proof. Reservations, voids,
  duplicates and pending/absent proofs do not count.
- **Realm Victory Chest:** authoritative V18 global HP at or below 30% of
  initial HP (70% damaged) and one personally replay-verified committed attack.
- Account and event UUIDs, read identity, boss, tracks, donation and attempt
  receipts, unique request IDs/committed ordinals, HP range and proof statuses
  fail closed. The authenticated wrapper accepts only an event UUID and token;
  it never accepts a claimed boss, account, damage, inventory or hero roster.
- The real DB adapter must query V18/V26/V27/V28 canonical tables with event
  and authenticated account joins, verify immutable replay digests, and apply
  the account-deletion fence. This adapter does **not** yet exist.

## Pass 2 — canonical gear catalog and V60 nonpaying resolution
- Reuses 30 authored V64 catalog entries: Hollowroot Woodcutting, Solbrand
  (internal `sunscar`) Mining, Rimewarden (internal `frostmarch`) Fishing;
  **10 distinct gathering-only slots per boss**.
- V58 1% hit is derived using the existing domain-separated HMAC-SHA256
  source-key roll; missing slots are preferred only **after** a gear hit.
  A missed gear roll still carries the proposed guaranteed chest resources.
- On a hit, V66 rolls the chosen *exact slot* with existing V65 six-grade
  rarity weights, Q0–Q100 and 1–2 unique gathering-only affixes.
  Base stat is Gathering Speed for that boss skill. No combat stat or
  cross-skill bonus is created.
- An independent HMAC gear draw stream uses the same server secret and
  immutable canonical chest ID, with per-draw domain separation and unbiased
  bounded ranges. No client seed, source, item, entropy or collection ownership
  is accepted by this server-only proposal.
- The returned V60 resolution explicitly reports
  `accountWalletCredited=false`, `equipmentInstanceCreated=false` and
  `inboxReceiptCreated=false`; no Sigils are minted. **It is not a claim.**
- Keep the existing V28 World Sigil cap (100 per event) and locked
  personal-impact payout unchanged. The optional 80-Sigil targeted exchange
  remains a disabled quote, not a purchase.

## Refinement and validation
- Compile V64/V59/V60 together with the existing V51/V58 chest contract.
- V59 assertions cover 70% exact/below boundary, two distinct War Camp tracks,
  own donation, pending replay vs fully committed proof, duplicate receipt,
  cross-account proof, duplicate ordinal and invalid HP.
- V60 assertions cover 1% hit and miss, missing-slot prioritization, boss set/
  skill parity, V65 roll validation, replay-stable identical resolutions, weak
  secret and forged owned-slot rejection, and no grant/wallet/inbox writes.
- Existing hidden gates in CI remain unchanged and are augmented for V59/V60.
  GitHub Actions checks may be queued; no passing exact-head CI or device/staging
  claim is implied by this document.

## Remaining launch blockers
1. Private, transactionally consistent V18/V26/V27/V28 proof query and owned
   inventory reader; approved account-erasure locks and external replay cleanup.
2. Database **unique(account,event,boss,chest kind)** source entitlement,
   escrowed first resolution, single-use opening and immutable result receipt
   in the same transaction as Gold/materials, real gear instance, Inbox and
   anti-duplication. A retry (even after key rotation) must return the stored
   first result before asking the roller again; rolling an uncommitted
   first result is not a safe way to grant.
3. Finish Equipment 2.0's real tier selection, rolled instance schema,
   gathering action speed/XP/yield/rare-find calculation and anti-duplication,
   plus market/erasure policy for rolled event gear.
4. Finish actual Android chest/collection/claim UI, accessibility and
   small-screen checks. Validate exact-head CI, DB concurrency, 1–3 hero
   account behavior, first-claim crash recovery, rollback, emergency stops
   and launch/no-go before enabling an event.

**No rehearsed battle is required by product direction. Nothing in these
two passes starts an event or changes production/staging.**
