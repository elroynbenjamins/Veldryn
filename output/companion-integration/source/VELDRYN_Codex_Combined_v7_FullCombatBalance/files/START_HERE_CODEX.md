# LATEST — FULL COMBAT BALANCE PASS V1

The current handoff now includes a whole-game combat balance authority in `backend/src/server/balance/combat-balance.ts` plus `docs/implementation/FULL_COMBAT_BALANCE_V1.md`. It extends the Combat Companion balance pass across classes, ordinary combat, elites, regional bosses, co-op/Expeditions, character Trials, PvP, guild bosses, raids, gear pressure and combat reward pacing.

Important: do not use the old `18–30 active-equivalent hours to Level 25` vertical-slice row as the live character-XP authority. The implemented idle-combat model uses a separate productive-combat/calendar pacing target. Do not overwrite newer real-repository class/raid/combat code with the older `veldryn_backend_v2.1` reference; use the new balance contracts as targets and run the current repository's real combat simulations.

---

# LATEST — COMBAT COMPANION BALANCE PASS V1 (schema 13 unchanged)

Read `docs/implementation/COMBAT_COMPANION_BALANCE_V1.md` first, then `docs/implementation/COMBAT_COMPANIONS_ECOSYSTEM_V3.md` for the underlying ecosystem implementation. This pass rebalances companion-only combat, rarity endpoints, monthly Trial progression, repeat rewards, Sanctuary Assignment economy, Bond XP consistency and the first special Prestige unlock boss. Passive Pets remain separate.

Critical balance rule: `Recommended Companion Power` is UI guidance only. Trial enemy combat stats use the separate configured enemy-growth curve and companion-only mitigation constant. Do not reconnect Team Power directly to enemy stat scaling. Changing the Trial enemy-growth constant requires a new seeded combat balance study.

Run backend `npm run typecheck:companions` and `npm run test:companions`, plus mobile `npx tsc -p tsconfig.companions.json --noEmit` and `npm run test:companions`. The recovered source still does not replace full Expo/Android, real Supabase chain, or production telemetry validation.

---

# LATEST — COMBAT COMPANIONS PHASE 2/3 + MONTHLY TRIALS (schema 12)

Read `docs/implementation/COMBAT_COMPANIONS_PHASE2_3.md` first, then `docs/implementation/COMBAT_COMPANIONS_V2.md` only for the underlying Phase 1 progression rules. This pass adds companion-only combat, monthly UTC Companion Trials, Sanctuary Companion Expeditions/assignments, Techniques, Team Power, special boss unlock infrastructure, duplicate/XP-overflow economy, Codex/showcase hooks, and future roguelite/Arena compatibility. Passive collectible Pets and Pet Essence remain separate.

Companion Trial seasons are **calendar months at 00:00 UTC**, keyed `YYYY-MM`, and roll lazily on trusted Trial requests. Never replace this with an in-game-day or rolling-30-day reset. Monthly Trial state resets; permanent Companion progression/resources do not.

Run `npm run test:companions` in both `backend` and `apps/mobile`. Then run the full real-repository checks after integration. The recovered handoff is missing `apps/mobile/tsconfig.core.json` and some unchanged content modules, so broader mobile scripts cannot be certified from this reduced package. Apply `20260930000000_combat_companions_phase2.sql` only in the actual Supabase migration chain after conflict review.

Critical production boundary: `CompanionPhase2Application` is server authority, but the actual repository's service-role transaction/HTTP adapter must persist the idempotency receipt and mutation atomically. Do not move Trial victory, rewards, mission completion, Technique costs, duplicate conversion, unlocks, or season time authority to the client.

The supplied older backend combat engine was used only to verify structural compatibility; do **not** overwrite the current repository combat/squad/expedition implementations with the older source. Wire the companion combat adapter to the current engine and extend the existing run-effect filters rather than creating duplicate engines.

---

# LATEST — COMBAT COMPANIONS V2 (schema 11)

Read `docs/implementation/COMBAT_COMPANIONS_V2.md` first. This pass implements active Combat Companions / Combat Units and deliberately does **not** replace or merge the passive collectible Pet system.

Run `npm run typecheck:companions` and `npm run test:companions` in `apps/mobile`, plus the normal full-repository typecheck/native checks after integration. Backend companion policy/application smoke tests are part of the handoff verification. Apply the Supabase companion migration only in the real migration chain after checking for conflicts.

Critical invariant: character role and active companion role may never match. Server routes must derive character class and ownership authoritatively; do not accept client-provided role, companion progression, resource costs or reward amounts as authority.

The recovered v3 handoff remains the cumulative base; do not reapply older v1/v2/Patch 01–05 packages.

---

# HISTORICAL CODEX NOTES

## Latest: Herbalism and Alchemy (Code Patch 03)

Read `docs/implementation/HERBALISM_ALCHEMY_V1.md` before the historical sections. Seven professions + two class skills now count per character. Schema is **9**. Herbalism supplies six regional herbs; nine Alchemy recipes use a finite reserved order in the character's activity slot. Preparation is character-bound and currently affects ordinary hunts only. Preserve shared-bank escrow, refunds, exclusive event earning deadlines, 250/500/950/1600 account thresholds and the legacy cloud-sync guard.

Run `npm run typecheck:professions` and `npm run test:professions` in `apps/mobile`, plus both earlier dedicated suites and the existing full-project/native checks. The 99 new checks are not a substitute for a native build or balance playtest. Do not overwrite this implementation from an older five-profession/schema-8 document. Do not blindly copy missing art-review assets as deletions or upgrade dependency versions.

## Previous slice: implemented class skills (Code Patch 02; counts/schema superseded below)

Read `docs/implementation/CLASS_SKILLS_V1.md` before the older milestone guide. Two persistent class-specific skills per character, named focus, victory/drill XP, actual passive effects, skill views and account-level contribution are implemented. Local saves now use schema 8. The five professions remain separate; do not add a generic Attack/Defence XP layer or duplicate combat-character level in account totals.

Run `npm run typecheck:class-skills` and `npm run test:class-skills`, **plus** the account and full project checks below. Preserve the schema >=7 cloud guard, ownership rules, missing-artwork exclusions and unchanged dependency lockfile. Native rendering/build and final mid/late balance still need their documented checks.

## Applied account/collectible code — read before changing this slice

`docs/implementation/ACCOUNT_COLLECTIBLES_V1.md` records the implemented five-character/account-ownership changes and their scope. The latest user decisions recorded there override older single-character and full-owned-pet-bonus assumptions. Preserve the implementation; do not regenerate it from an older pack.

For this slice run `npm run typecheck:account` and `npm run test:account` from `apps/mobile`, then the existing project checks below once dependencies are installed. The dedicated target isolates the pure domain from optional online fixtures; it does not replace a full native build. See that document for the five pre-existing failures in the broader script set and the local-only cloud-sync guard.

Do not delete omitted art-review files. Do not reset player/development saves or deploy backend schemas as part of applying this patch.

## Existing milestone guide

Read these files in order before changing code:
1. `CODEX_IMPLEMENTATION_GUIDE.md`
2. `MVP_SCOPE.md`
3. `CONTENT_MAPPING.md`
4. `docs/implementation/TEST_CONTRACT.md`
5. `docs/implementation/UI_DESIGN_TOKENS.md`
6. `docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx`

## Current task
Polish and complete the offline Asterfall Milestone 1 without adding production online systems.

Priority order:
1. Core Home/activity feedback.
2. Loot/reward presentation.
3. Item comparison/equipment clarity.
4. Quest guidance and first-session pacing.
5. Fallen Knight encounter presentation/balance.
6. Local balance telemetry and debug screen.

Before committing gameplay changes run from `apps/mobile`:
`npm run typecheck:core`
`npm run test:pre-codex`

Do not deploy Supabase or enable paid infrastructure during this milestone.
