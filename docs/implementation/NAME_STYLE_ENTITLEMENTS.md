# Name-style access and saving

## Problem and authority

The Name Style tab used `GameState.account.entitlements` to decide whether to
show name-colour controls. Badges and the name-style save RPC used the effective
commerce entitlement helper instead. Online game snapshots did not project that
helper's result, so an account with valid promotional VIP+/Supporter grants could
show its Supporter badge while the colour editor reported LOCKED.

There was a second problem in the mobile save path. The editor inside Name Style
submitted a local account-state change to the generic gameplay save handler,
which correctly rejected it as server-owned progress. A duplicate editor outside
the tab called the name-style RPC but then submitted the same unsupported local
change and did not wait for a confirmed profile refresh.

## Backend correction

`20261101000000_online_game_commerce_projection.sql` adds the internal
`private.project_online_game_commerce_v1` helper. It uses the existing commerce
helper, which combines verified store entitlements with redeemed promotional
entitlements and evaluates Supporter expiry. It does not grant purchases or
change entitlement records.

The projection changes only these game-state paths:

- `account.entitlements`: refresh `vip`, `vip_plus`, and `supporter`; clear stale
  compatibility aliases; preserve unrelated flags.
- `account.playerNameStyle`: use the canonical saved preference, or the default
  when none exists.
- `account.vipPlusNameColor`: use the saved permanent VIP+ fallback.

Saved gradients remain stored after expiry. Effective rendering still applies
the normal entitlement rules and the VIP+ solid fallback. Accounts without paid
access cannot save premium styles, and can always choose the default.

The existing load, commit, and receipt-read RPCs apply the projection. Duplicate
request replay retains its original gameplay outcome, revision, and envelope,
while returning current commerce/name-style metadata. Reads do not rewrite stored
progress or receipts. Null initial-state sentinels remain unchanged. RPC
signatures and grants remain unchanged; the new helper is invoker-only and has no
client or direct service-role EXECUTE grant.

The shared Edge handler and its generated bundle preserve this metadata. No Edge
function rebuild or redeployment is required for this SQL correction.

## Mobile correction

`ProfileEditor` owns one `PlayerNameStyleEditor` inside Name Style, alongside the
existing badge controls. Paid controls remain visible with their requirements and
are disabled when unavailable. Preview, reset, draft preservation between tabs,
and unsaved-change tracking remain part of the profile editor. Hidden name-style
previews respect Reduced Motion.

Both app entry points provide a dedicated asynchronous name-style save callback.
Online saves call `update_player_name_style_v1`, then load and accept a confirmed
server snapshot. They never submit a local gameplay state or invent entitlement
flags. The RPC uses the intended account's checked access token, so an account
switch cannot redirect it to another account. A late response cannot hydrate a
new account. Failed writes, failed refreshes, and mismatched readback do not report
success, and input stays available for retry. Existing pending gameplay commands
remain intact. Offline mode continues to use the local repository.

## Deployment and Android build

The SQL was applied to the Veldryn production project on 2026-10-04 and recorded
by the migration API as `20261004215500_online_game_commerce_projection`.
Production gameplay load was verified to return the reported account's already
owned VIP, VIP+, and lifetime Supporter benefits. No identifying account data is
included in this repository.

The checked-in migration is ordered after the repository's existing
forward-numbered chain, which currently extends through `20261040000000`.
`20261101000000` is a valid timestamp after that chain, ensuring a fresh install
cannot overwrite this fix with an older RPC definition. The live API timestamp
and source ordering differ; check linked migration history before the next CLI
push, as required by `START_HERE_CODEX.md`. No existing migration history was
rewritten during this repair.

Existing installed builds can receive the corrected permissions after a fresh
online gameplay load, such as reopening the app. The complete editor and save
correction changes mobile JavaScript. The current app has no `expo-updates`
dependency or configured update channel, so it needs a new Android AAB for this
client correction. This pass does not build or upload an AAB.

## Verification

Completed backend verification:

- PostgreSQL and PL/pgSQL parsing of the migration; migration-version and
  dollar-quote validation.
- Exact comparison of affected live function bodies and grants before replacing
  them; unchanged public RPC grants after deployment.
- Nine read-only projection invariants and a real production gameplay-load check.
- `backend/supabase/tests/online_game_commerce_projection.sql`: transactional
  regression fixture covering paid access, source combinations, expiry,
  authenticated solid/gradient saves, default reset, stale aliases, saved
  fallback, progress preservation, null initialization, wallet/revision/hash
  guards, and receipt replay.
- `backend/supabase/tests/online_gameplay.sql`: existing gameplay, roster,
  idempotency, wallet race, RLS, and legacy mutation restrictions.
- Both SQL fixtures passed against the deployed functions and rolled back their
  generated test identities; zero test accounts remained.
- Security-advisor findings unchanged from the pre-deployment baseline.
- Backend `pnpm run typecheck` and `pnpm run build` passed.

Completed mobile verification:

- Full mobile TypeScript check and `pnpm run typecheck:core` passed.
- Core compilation and focused `player-name-style-save`,
  `vip-supporter-entitlements`, `profile-presentation-ui-contract`,
  `online-gameplay`, and `v40-preferences-loadouts` checks passed.
- `node tests/localization-creation-profile-focused.mjs` passed.
- `pnpm run test:pre-codex` passed, including offline smoke, equipment-screen,
  quick-navigation, and save-schema checks.
- The new save regression test is registered in `tools/mobile-core-tests.json`.
- `git diff --check` passed.

The complete local `pnpm run test:core` was attempted but stopped at an omitted
`assets/card-backgrounds/guild_plaza_square.png` in this sparse checkout. The
repository CI uses a complete checkout for the full suite. Native Android UI and
an installed release build have not been exercised during this pass.
