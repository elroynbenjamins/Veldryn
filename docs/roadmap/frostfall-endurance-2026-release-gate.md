# Frostfall 2026 — Aurora Hollow Endurance (review branch)

Status: **source candidate only**. Do not merge, deploy, activate Frostfall, release seasonal rewards, or update production flags without explicit appearance/theme approval and staging verification.

## Authoritative calendar
- Playable December 3–26, 2026 UTC; server cutoff December 27 00:00 UTC.
- Claim-only December 27–28 UTC; server cutoff December 29 00:00 UTC.
- Production `live_events.enabled = false`, client `FROSTFALL_REWARDS_RELEASED = false`. Leave both unchanged.

## Current limits (verified in production)
- No weekly attempt cap.
- Two **rewarded boss completions per account per UTC day**; not per character and not per tier.
- The database `claim_event_expedition_clear_slot` enforces the production cap at reward claim time. The shared TypeScript service also enforces two claims/day in a long-lived instance; the production database is the authoritative cross-request guard.
- Unlimited new attempts are possible after a finished or failed run, but only one active co-op run/account at a time.
- Review branch implementation: after two rewarded clears, the backend creates **practice-only** Frostfall runs that settle with 0 currency, status `claimed` and no unclaimable pending reward. A server-owned account-wide budget is frozen on entry. The compact UI still needs the 2/2 indicator and design sign-off.
- Staging migration `20261122110752_frostfall_endurance_daily_reward_budget_v1.sql` applied November 22. Read-back verified table/RPC, function guards and RLS; service-role budget query passed; a transaction-rolled-back 2-claim-limit fixture passed. Production remains unchanged and must receive the exact reviewed migration only before activation. Full authenticated end-to-end, reset, concurrency and account-character isolation tests remain blocking.

## Proposed route and economy (review implementation)
- All five tiers retained, minimum combat levels 10/15/20/25/30.
- New runs: 42-room bounded seasonal Endurance-v2 graph. Same simultaneous Campfire / Boon / Boss exit at depths 8, 15, 22, 29, 36; final forced boss at 43 after 42 cleared non-boss rooms.
- Boss is always the frozen Rimebell Colossus; defeating it ends a run. Continuing retains current HP, boons, artifacts and potions, with server-owned persistence.
- All old `event-route-v5` saved runs remain six-room routes with old settlement math and campfire recovery.
- Event checkpoint Campfire heals using standard Endurance-v2 20%/15% recovery; shrine awards deterministic shared boon and +12 Warmth. Campfire grants +18 Warmth and a Festival Hearth objective point.
- Repeated themed winter room choices restore Warmth in exchange for risk. Base seasonal battles drain 4 Warmth; two or more hearths soften the cold. Warmth under critical thresholds boosts elite attack; objective maximum and pre-boss heal remain capped at three hearths / 24% maximum HP.
- Encounter depth scaling *after the opening*: HP ×1.035, attack ×1.022, defense ×1.012 each extra depth. Balance simulation required, particularly potion attrition and boon stacking.
- Base Frostbell Token tier reward × depth factor at defeated boss checkpoint:
  - 7 cleared: 1.00×
  - 14: 1.15×
  - 21: 1.28×
  - 28: 1.38×
  - 35: 1.46×
  - 42: 1.52×
- Apply rounded depth-adjusted **base tier Frostbell Tokens once per rewarded clear**, then the existing Warmth/objective bonus, followed by the authoritative **-25% common event currency adjustment**. No intermediate clear currency on checkpoint continue. This is not a cumulative reward across floors.
- All regular dungeon combat-room Marks rules remain separate: do not award unlimited Marks because seasonal Frostbell Tokens scale with depth. **Aurora Chimes remain prestige-only and do not scale with dungeon depth.**

## Mandatory release gates
1. Backend daily reward budget and practice-only settlement are implemented in the review branch. **Still required:** approve/implement visible reward budget, practice badge, depth information and claim/exit UI before release.
2. Staging parity migration applied and read back November 22. Production migration remains pending; verify session UTC boundaries and concurrent account/character claims before activation.
3. Present/approve the actual compact event dungeon screen and themes; the server preview now exposes 42-room **maximum** and hides the old six-stage label, but the actual UI must show this clearly, and show checkpoint choices, depth reward, Warmth, daily 2/2 counter, final exit and failed-run explanation. Do not merge UI into release before approval.
4. Run backend/mobile TS checks and event-route, Q-Mode/Live, legacy save, boss win/loss, reconnect, daily rollover, duplicate requests, potion, boons, Guild Boss coexistence, rewards and shop regression suites. Test physical Android small screen.
5. Rebuild and verify canonical gameplay/co-op Edge functions from exact source SHA; deploy to staging only for authenticated E2E before a separate production authorization.
6. Verify seasonal pets, companions, 20-offer Shop, currency asset and server flags/catalogue; production `modules` currently excludes `expedition`, unlike staging. Gate full release on parity and deliberate activation.
7. Assess 2/day reward availability vs longer run time, and run best/worst role simulation for the proposed depth multipliers before locking economy.

## Deployment audit, November 22 2026
- Staging DB only: seasonal budget RPC, daily clear cap and practice/claim guards installed; RLS enabled on the counter table. UTC yesterday/today rollover and claim-cap rollback fixtures passed.
- Review branch only: the backend returns `rewardedClearsRemaining` for the active Frostfall event; no unapproved UI redesign is merged.
- Staging co-op Edge runtime v39 deployed from review-branch generated source on November 22; event remains disabled.
- Production unchanged: event disabled, rewards hidden, expedition module not yet enabled, migrations/Edge bundle not deployed.
- Direct run/simulation, client preview, locale-theme approval, signed Android build and full CI remain necessary; do not claim launch readiness solely from SQL read-back.
