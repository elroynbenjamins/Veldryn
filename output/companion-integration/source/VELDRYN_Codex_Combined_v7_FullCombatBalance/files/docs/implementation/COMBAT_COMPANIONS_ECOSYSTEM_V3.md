# VELDRYN Combat Companions — Ecosystem v3

## Scope

This pass extends the existing active Combat Companion / Combat Unit implementation. Passive collectible Pets, Pet Essence, Pet Bond, character squads, character Triad Trials, and the main roguelite Expedition mode remain separate systems.

## Fully functional in this source

### Sanctuary Companion Expeditions
- 1–3 Combat Companions according to mission configuration.
- Real authoritative server timestamps (`startedAt`, `endsAt`); no completion worker is required.
- Configurable mission requirements for role count, level, Bond, min/max rarity, origin, Team Power, Ascension, tag and explicit Companion ID.
- Equipped, active-Assignment, active-Trial, locked/invalid and explicitly unavailable companions are rejected.
- Completed-but-unclaimed Assignments release their Companions and Expedition Pen slot after authoritative lazy rollover; reward claim remains idempotent.
- C/B/A/S grades are deterministic. Recommended Team Power is guidance unless a mission explicitly adds a hard `min_team_power` requirement.
- S requires the configured 150% power threshold plus the mission bonus condition. B/A/S thresholds are config-driven.
- Gold/material entry costs are atomic. Failed starts deduct nothing.
- XP, reduced-rate Bond XP, Companion Essence, Gold and regional materials are resolved server-side. High-tier passive Bondstones remain tightly weekly-limited and deterministic.
- Expedition Pens cap concurrent active missions at 1/2/3 and grant only modest 0/3/5% duration reduction at launch configuration.

### Companion Techniques
- Every current Combat Companion has exactly two data-defined mutually-exclusive Techniques.
- Shared launch unlock requirement is **Ascension II AND Bond 7** through one config object.
- First selection is free. Later switches cost Gold + Companion Essence only.
- Switching is atomic and combat snapshots include only the selected Technique, so old Technique effects are removed rather than stacked.
- Technique effects work through the same Combat Companion adapter in character-assist and companion-only Trial contexts.

### Companion Proving Grounds
- One authoritative weekly Companion challenge system using the existing project Monday-UTC week key.
- Three challenges rotate per week from the configured set: Underestimated, Trusted Ally, Borrowed Defense, Old Friends, Regional Loyalty, Against the Odds and Mixed Company.
- Progress/claim state lazily rolls over by server time; client/device time is not an input.
- Rewards use only the existing companion economy: Companion Essence, Gold, regional/material rewards, controlled Bondstones and optional profile/cosmetic entitlement IDs.
- Trial victories automatically feed the trusted Proving Grounds tracker.
- The legacy Trial-local weekly reward claim is deprecated to prevent a second weekly Bondstone stream.

### Combat Companion Codex / Showcase
- Codex projects every current static Combat Companion definition, not only owned companions.
- States: Unknown, Discovered, Locked, Owned, Mastered.
- Undiscovered Prestige entries may remain Unknown. Explicit discovery reveals them without granting ownership.
- Summary tracks total/rareness/origin ownership, max-level, Bond 10, Mastered, event and special-boss Companion counts.
- Configured milestones primarily grant Companion Essence and profile/cosmetic entitlement IDs; no permanent combat-stat ladder or new currency is added.
- One basic Showcase slot is available to new accounts. Milestones can unlock slot 2 and 3. Existing v5 database accounts are grandfathered to their previous three-slot capability.
- Favorite/Showcase IDs are ownership-validated and sanitized if a definition/ownership later becomes invalid.
- Original event year/veteran metadata survives Codex projection.

### Mastered / Prestige presentation
- Mastered is derived from actual progression rather than a free client flag: rarity max Level, required Ascension, Bond 10, Bond Trait, Technique-system unlock, plus final Prestige Mastery for Prestige rarity.
- Standard/Rare require Ascension II for Mastered; Elite/Prestige require Ascension III. Standard can therefore perform Ascension II at Level 20 without increasing its Level cap.
- Rarity visual metadata includes structure/icon/text accessibility metadata in addition to color, plus optional frame, summon, idle, profile, nameplate, animation and reduced-motion references.
- Missing optional presentation assets do not break Companion loading.
- Mastery markers resolve only when the computed Mastered requirements are met.

### Unified availability
Server-derived status vocabulary:
- `available`
- `equipped`
- `expedition`
- `active_trial`
- `locked`
- `unavailable`

The status is derived from ownership, definitions, equipped character state, active Assignments, active Trial state and server-side availability. It is never accepted as a client-owned boolean.

### Monthly Trials relationship
- Companion Trials remain real calendar-month progression at 00:00 UTC on the first day of each month.
- Proving Grounds is the weekly objective layer.
- The systems deliberately have different reset periods.

## Server authority and idempotency

The existing `runCompanionCommand` receipt/transaction boundary is retained for Trial start/resolution, Assignment start/claim, Technique changes, Proving Ground claims, Companion grants/duplicate conversion, Codex milestone claims and Showcase updates.

Special Companion boss application calls no longer accept client-supplied unlock facts. The application layer now requires a trusted `CompanionUnlockFactsProvider` so the production adapter must derive story/boss/reputation/mastery facts from authoritative account storage.

`recordTrustedProvingGroundEvent` is intentionally an internal settlement hook. It is not a client-authoritative endpoint.

## Persistence

### Mobile save
Current local save schema: **v13**.

New/preserved Companion profile state:
- discovered Companion IDs
- claimed Codex milestone IDs
- Codex/profile reward entitlement IDs
- Showcase slots unlocked
- Favorite / Showcase Companion IDs
- Proving Grounds server projection cache
- Codex server projection cache

v12 local saves remain accepted and migrate to v13. Existing v12 profiles without an explicit slot field retain the previous three-Showcase capability; new v13 accounts start with one slot.

### Supabase migration
`backend/supabase/migrations/20261001000000_combat_companions_ecosystem_v3.sql`

Adds:
- Codex discovery IDs
- claimed Codex milestones
- Codex reward entitlement IDs
- Showcase slot count
- server-authoritative weekly Proving Grounds table/state
- RLS owner-read boundary

No Pet/Pet Essence/Pet Bond columns are touched and no new Companion currency is introduced.

## UI integration in the recovered mobile source

The existing Character Combat Companion panel now:
- presents Mastered state;
- keeps rarity text/symbol presentation in addition to color;
- passes weekly Proving Grounds and Codex server projections into the Sanctuary overview.

The Sanctuary overview can display:
- monthly Trial state/reset information;
- active/ready Companion Expeditions;
- weekly Proving Grounds summary;
- Codex owned/Mastered/origin count;
- Showcase slot and unclaimed milestone summary.

Full dedicated mission team-builder, Technique selection, Codex gallery and profile Showcase screens remain production UI work. Their server models/actions are functional; this reduced handoff does not claim those finished screens exist.

## Backend foundation only / production wiring still required

### Normal combat and Dungeon Proving Ground events
Trial floor/boss events are wired automatically in this package. The reduced source does not contain the complete authoritative normal-combat/Dungeon reward settlement adapter used by the live repository. A trusted, idempotent `recordTrustedProvingGroundEvent` hook is supplied for those settlement paths, but it must be called from the real server reward/clear transaction. Do not expose it as a client event-report endpoint.

### Profile cosmetics
Codex/profile reward IDs are persisted as entitlements. The real profile adapter must map those identifiers to the repository's existing title/background/border inventory tables. No duplicate cosmetic economy is created here.

### Full native build / DB chain
The recovered affected-file tree still omits unchanged project files such as `apps/mobile/tsconfig.core.json` and the backend root `tsconfig.json`. Focused Companion graphs are executable here; full Expo/Android and real Supabase migration reset/apply remain required in the complete repository.

## Future hooks only — not implemented modes

- Companion roguelite matchmaking/run lifecycle: **not implemented**. Existing companion combat adapter/filter hooks remain compatible with later reuse of the VELDRYN expedition engine.
- Companion Arena matchmaking/rank/reward lifecycle: **not implemented**. Existing frozen companion snapshot hooks remain architecture only.

## Acceptance coverage

Dedicated automated tests cover the requested numbered areas:
- Expedition tests **1–18**
- Technique tests **19–29**
- Proving Grounds tests **30–38**
- Codex tests **39–49**
- Prestige presentation tests **50–54**

They are in the `backend/src/server/companions/__tests__/phase3-*` test files. Existing v4/v5 Companion tests remain in the same executable graph.
