# VELDRYN Combat Companions — Phase 2/3

## Scope and authority

This pass extends the active **Combat Companion / Combat Unit** system from `COMBAT_COMPANIONS_V2.md`. Passive collectible Pets, Pet Bond and Pet Essence remain separate and are not migrated or reused.

The source handoff is intentionally data-driven and uses the recovered current companion architecture. The supplied older `veldryn_backend_v2.1` combat engine was used only as a compatibility reference/verification target; its character Trial/squad files are not copied over the newer recovered source.

## Implementation truth table

### Fully functional domain/application code in this handoff

- one authoritative companion -> combatant adapter for `character_assist`, `companion_trial`, future `companion_roguelite`, and future `companion_arena` contexts;
- contextual ability targeting without companion-ID switch statements;
- exact Trial team rule: one Tank + one Damage + one Support, unique/owned/not-busy IDs;
- Companion Team Power and separate companion synergies;
- 30-floor Trial tower, configurable floor cap, bosses every 5 floors, checkpoint runs, locked team during an active run, defeat handling, first-clear/repeat rewards, Bondstone boss rewards, Floor 30 monthly completion reward;
- server-authoritative **calendar-month seasons at 00:00 UTC**, keyed `YYYY-MM`, with lazy rollover;
- current-month vs lifetime Trial statistics and bounded prior-season archive;
- monthly modifiers, featured origins, monthly special objectives and rotating weekly challenge framework;
- rarity/origin/Team Power Trial restrictions;
- Sanctuary Companion Expeditions/assignments with 2h/4h/8h/12h definitions, Pen capacity, busy state, deterministic grades/rewards, timestamp completion, limited Bond XP and capped rare Bondstone path;
- Techniques: two per companion, one selected, Ascension II OR Bond 7 unlock, free first choice, Gold + Companion Essence switch cost;
- duplicate Combat Companion -> Companion Essence conversion by rarity; never Pet Essence;
- capped max-level XP -> Companion Essence overflow conversion; Bond overflow remains capped with no new currency;
- multi-condition special Companion boss unlock framework with a guaranteed existing Prestige unlock example;
- Codex/profile favorite/showcase model and Prestige presentation metadata hooks;
- exact-once/idempotency application boundary for reward/cost mutations;
- server public-projection helpers for Trial reset time and assignment status.

### Persistence/schema foundation supplied, real repository adapter still required

Migration `20260930000000_combat_companions_phase2.sql` adds the Phase 2/3 columns/tables, owner-read RLS, and exact-once receipt storage. The recovered source does not contain the complete production account aggregate repository/HTTP or Edge adapter. Codex must wire `CompanionPhase2Application` to the actual service-role transaction layer so the receipt and state mutation occur in one database transaction.

Do not replace the application boundary with client-side calculations. The client may request actions and cache projections only.

### Mobile projection/UI foundation supplied

Save schema is **v12**. Client save state can cache server projections for Trials/assignments and keeps Technique selection, Sanctuary Pen progression and showcase metadata. `CombatCompanionPanel` now exposes the scalable Sanctuary sections and the server-derived monthly Trial title/countdown/notice when projections are available.

This handoff does **not** invent a duplicate networking layer. The full repository must connect these views to its existing authenticated API client.

### Future hooks only — not implemented game modes

- Companion roguelite: run-effect filters and example temporary boons only; no second roguelite engine is built.
- Companion Arena: frozen snapshot/model hook only; no matchmaking, ranking or combat normalization implementation.
- Future Ashen Sunwyrm content: requirement/challenge metadata hook only because no actual Ashen Sunwyrm companion definition exists in the current content family.

## Monthly Companion Trials

Calendar authority:

- timezone: UTC;
- season key: `YYYY-MM`;
- starts: first day of month 00:00 UTC;
- ends: first day of next month 00:00 UTC;
- no 30-day rolling timers;
- no mass midnight account-update job is required.

Every relevant Trial operation calls the lazy rollover boundary. A changed season archives/finalizes the prior monthly summary, expires the old active run, resets monthly progress and initializes the new season. Permanent companion progression/resources are not inputs to the rollover function and therefore cannot be reset by it.

Monthly state resets include floor/checkpoint/monthly-highest/first-clear flags/boss reward flags/special objectives/monthly challenge completion/leaderboard score/weekly monthly-state container/active run. Lifetime statistics stay separate:

- lifetime highest floor;
- total Trial bosses defeated;
- total Trial floors cleared;
- monthly seasons participated;
- monthly Floor 30 clears;
- best-ever Companion Team Power.

A run belongs to its start season. Once the month ends it cannot continue or claim the expired season's run reward.

## Trial content and rewards

Launch tower: 30 floors, boss every 5. The count is config-driven rather than embedded as an engine invariant.

First clear is materially larger than repeat clear. Boss first clears are the meaningful Bondstone path. Floor 30 adds the monthly completion package. All monthly first-clear flags reset with the calendar season, so the same milestone can reward again next month.

Monthly modifiers have actual combat-snapshot effects and remain modest. Examples include enemy defense/tempo/pressure and companion Haste/healing/shield adjustments. Each modifier is applied once. Featured origin currently adds only a small Trial Companion Essence bonus; it does not force a combat meta.

## Trial formation, restrictions and synergies

Normal Trial formation is exactly:

- Tank — Front concept;
- Damage — Middle concept;
- Support — Back concept.

The character same-role companion restriction applies only to `character_assist`. It does not block a Damage companion from Companion Trials.

Optional restriction primitives support Standard/Rare caps, required/prohibited rarity, origin counts, different origins, rarity spectrum, Team Power ceiling and no-defeat objectives.

Companion synergies are separate from character squad synergies. Launch examples:

- Balanced Triad — baseline;
- Regional Bond — small capped combat budget;
- Diverse Origins — small Haste bonus;
- Rarity Spectrum — Trial Essence reward bonus instead of raw combat power.

## Companion combat adapter

`buildCompanionCombatant` / `buildOwnedCompanionCombatant` is the single combat-number source for active companion modes. Team Power also consumes this resolved snapshot and does not apply another rarity multiplier.

The adapter's structural combat definitions were executed successfully through the supplied `veldryn_backend_v2.1` `simulateCombat` engine with a 3-companion, zero-player-character Trial team. Do not copy that old engine into the current repository; wire the adapter to the current engine implementation already present there.

For character-assist owner targeting the adapter emits the normal engine target plus an `exactTargetId` owner hint. The full current combat adapter should honor this hint when it supports exact actor targeting; standalone Trial targeting is already resolved to normal engine target rules.

## Sanctuary Companion Expeditions

Backend name: companion assignments / Sanctuary missions, deliberately separate from the major VELDRYN roguelite Expedition system.

- durations: 2h/4h/8h/12h;
- no completion worker required;
- server stores start/end/version/seed/team;
- requirements can include roles, level, power, rarity, origin and Bond;
- meeting minimum requirements guarantees completion;
- C/B/A/S grade improves deterministic rewards;
- busy companions cannot be newly equipped, enter Trials/challenges, or start another assignment;
- equipped companions are rejected rather than silently unequipped;
- companions locked in an active Trial run cannot be sent away on an assignment;
- Expedition Pens Lv1/Lv2/Lv3 allow 1/2/3 simultaneous missions;
- Bond XP is intentionally reduced to 25% of the configured active-equivalent mission budget before grade scaling;
- Bondstone assignment rewards are rare and weekly limited.

## Techniques and economy

Each current combat companion receives a role-appropriate pair of data-driven Techniques. A companion may select exactly one. Technique effects are compiled into its combat snapshot. The first valid choice is free; later switching uses Gold + Companion Essence and is protected by the idempotent application boundary.

Duplicate conversion values and max-level XP conversion are config-driven. Max Bond does not create an overflow currency.

## Special boss unlocks

`CompanionAdvancedUnlockRequirement` supports:

`trial_floor`, `special_boss_clear`, `boss_clear_count`, `region_completion`, `event_completion`, `companion_owned`, `companion_role_owned`, `companion_bond_total`, `companion_level_total`, `achievement`, `currency_cost`, `mastery`, `reputation`, `event_challenge`.

The current functional example is the Oathglass Knightling challenge using existing content and a guaranteed unlock after all requirements + boss victory. The future Ashen Sunwyrm record demonstrates the desired multi-condition Prestige direction but is intentionally not reported as a playable unlock.

## Persistence and migration

Mobile schema: **12**.

Permanent active Companion state remains account-wide; equipped companion stays character-specific. Phase 2 adds Technique selection and server-projected Trial/assignment/profile/overflow fields. Passive Pet ownership and Pet Essence remain independent.

Database migration adds:

- Technique and XP-overflow columns to account combat companion progression;
- profile/showcase and assignment-Bondstone counters;
- monthly Trial + lifetime state table;
- Sanctuary assignment table;
- special challenge progress table;
- exact-once companion action receipts.

No migration resets existing companion ownership, levels, XP, Ascension, Bond, Essence, Bondstones, Sanctuary or event ownership.

## API/application actions

Contracts are declared for Trial projection/start/resolve/abandon/weekly claim, assignment list/start/claim, Technique select, special challenge resolve, Codex and showcase. `CompanionPhase2Application` implements the server command boundary for the mutating actions available in this reduced handoff.

The final HTTP/Edge wiring must derive account identity from the verified session and load authoritative account/companion facts. Client-supplied reward amounts, time, combat result, ownership, progression or costs are never authority.

## Verification in this handoff

Green focused checks:

- backend companion TypeScript compile;
- all backend companion tests, including application idempotency, team/combat context, monthly Trial rollover/calendar edge cases, assignments, Techniques/economy, special/Codex hooks and base equip policy;
- mobile Combat Companion TypeScript compile/test;
- Phase 2 presentation countdown tests based on server timestamps;
- TSX syntax diagnostics for existing/new Companion panels;
- structural execution through the supplied older VELDRYN combat engine;
- static schema checks for Trial/assignment/receipt/RLS fields and Pet-Essence separation.

The recovered reduced source still references a missing `apps/mobile/tsconfig.core.json` and also omits unchanged content modules expected by broader focused configs. Consequently the full mobile core/Expo/Android test graph cannot be certified here. Run the real repository's locked dependency install, full TypeScript/test suite, Supabase migration reset/apply, authenticated API integration, Expo and Android builds after merging this handoff.
