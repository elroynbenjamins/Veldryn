# Veldryn 2.0 — Independent careers and three-track progression (22 Nov 2026)

**Status: HIDDEN FOUNDATION / DRAFT FOR REVIEW.** No live routes, client UI, player XP changes, Supabase migrations, release activation, or equipment/crafting recipe changes. All thresholds and bonuses require balancing sign-off.

## Approved game design

Players can reach T9 in a single gathering/crafting profession without leveling combat or other professions. Rare combat materials must remain valuable but be tradeable/commissionable. A dedicated adventurer can buy crafted gear and progress combat independently.

Use THREE explicitly different levels:

1. **Overall Character Level (new, cap 100):** calculated from a new Character XP bank credited for verified gathering, crafting and combat work. Can progress without combat.
2. **Combat Level (unchanged):** existing legacy character XP/level calculation. All combat stats, dungeon requirements, class abilities, equipment *wearing*, enemy scaling and CP continue using the combat source exclusively.
3. **Profession Level (per skill, cap 100):** independently derived from each trained profession's own XP. An untrained profession does not block another one. T9 Smithing requires Smithing skill, inputs and recipe/blueprint; not Mining or combat level.

**Critical collision:** the existing draft integration/combat-v2-profession-independent-progression-20261122 explicitly defines Character Level as combat level and uses T9=90. It is NOT compatible with this newer user-approved three-track proposal. Do not blindly merge policies; reconcile Combat/Classes 2.0 branch semantics at integration time. In 1.x, character.level and character.xp are still **combat**; they remain untouched in this pass.

## Preview numerical curve

- Overall XP to next: 200 + 50*level + 5*level^2 (level 1–99); total Character XP to 100 = **1,909,050**.
- Profession XP to next: 150 + 45*level + 8*level^2 (level 1–99); total Profession XP to 100 = **2,864,400**.
- Profession tier floors (T1–T9): **1 / 12 / 24 / 36 / 48 / 60 / 72 / 84 / 96**.
- Trusted 240-second standard-difficulty profession settlement projects **240 profession XP and 120 Character XP**. Server-authored difficulty may lower or increase this to 25% / 50% / 100% / 125%. Existing combat reward pipeline continues owning Combat XP; only new Character XP is projected here.
- A settlement is NOT validated by time elapsed on a device, transfer of goods, listing/buying goods, trade or arbitrary client inputs. The preview is a pure calculator, not an award authorization.

These curves must be calibrated against actual skill-training actions per level, time-gates, crafting resource sinks, and the 30-hour offline reserve before migration.

## Level milestones and specialists (preview)

| Skill Level | Base crafting speed | Common-input recovery | Quality bonus | Specialization rank |
|--:|--:|--:|--:|--:|
| 1 | 0% | 0% | +0 | 0 |
| 10 | 1% | 0% | +0 | 0 |
| 20 | 1% | 1% | +0 | 0 |
| 25 | 1% | 1% | +0 | 1 |
| 30 | 2% | 1% | +0 | 1 |
| 40 | 2% | 2% | +0 | 1 |
| 50 | 2% | 2% | +1 | 2 |
| 60 | 4% | 2% | +1 | 2 |
| 70 | 4% | 3% | +1 | 2 |
| 75 | 4% | 3% | +1 | 3 |
| 80 | 6% | 3% | +1 | 3 |
| 90 | 6% | 4% | +2 | 3 |
| 96 | 6% | 4% | +2 | 3; T9 |
| 100 | 10% | 5% | +2 | 4 |

Crafting specialization (one OPTIONAL choice PER profession): Efficiency adds 1% common-input recovery per rank; Precision adds one quality point at ranks 2 and 4; Production adds 2% production speed per rank.

Gathering alternatives: Extraction +1% common yield/rank; Prospecting +2% **relative** rare-drop chance/rank; Tempo +2% gathering speed/rank. Ranks unlock at 25/50/75/100. Relative bonus +8% changes a 0.10% base chance to 0.108%, NOT 8.10%. Common recovery is a future post-settlement refund of eligible common inputs only: never refund boss trophies, monster trophies, rare catalysts, limited ingredients or blueprints. No bonuses currently affect live outputs.

Preview combined Forge + profession speed is capped at 20%; existing Forge runtime is untouched. Balance this cap before integration.

## Server and migration contract for following passes

- Audit actual production/staging character, skills, account-slot and combat settlement storage first. Do not guess Supabase table names or migrations.
- Add a distinct **overall_character_xp** bank per character with a curve version. Keep existing combat XP/levels and profession XP. Do not overwrite any player records in this pass.
- Make one **server-owned, immutable settlement ledger** with unique (character_id, settlement_source, settlement_id, progression_version) or stronger canonical event UID. Only verified complete actions award Character XP. Reserve/pay/complete source action, claim the event, and increment XP in one transaction; duplicate retry is no-op. Client sends no XP amount or difficulty selection.
- Attribute offline and online actions to the exact owning character, including parked characters and character switches.
- Protect market from circular commissions, item transfers, cancelled jobs, repeated salvage/craft loops, and paid XP loopholes.
- Derive new read model with clearly separated overallCharacterLevel / combatLevel / professionLevels; combat compiler and equipment/dungeon requirements **never** read overallCharacterLevel.
- Migrate using a documented one-time deterministic mapping of historical accomplishments that protects existing progress; do not assume per-action history exists. Stage dry-run/rollback and audit per-character before/after.
- Run 1.x combat rebase and forge mastery regression suite alongside the new tests; reconcile existing hidden Combat 2.0 and Crafting/Equipment 2.0 branches before integration.
- UI review gate remains: show actual Character / Combat / Profession layouts and themes for explicit acceptance before attaching to live mobile navigation.

## Current implementation

- Pure isolated module: backend/src/server/progression/v2/character-progression.ts
- Pure isolated mastery module: backend/src/server/progression/v2/profession-mastery.ts
- Tests: backend/src/server/progression/v2/__tests__/character-progression.ts
- Nothing imports this into production. XP only *proposed*, not issued; no money, drops, bonuses or equipment effects minted.

Next: inspect live persistence and trusted settlement boundaries; calibrate XP/hour by T1–T9; implement authenticated award ledger on staging after schema review; reconcile 2.0 class/equipment contracts; test and review UI before any deployment.


## Refinement / Pass 3 read-only staging audit (22 Nov 2026)

Verified the *staging* PostgreSQL schema using metadata queries only; no user rows or production data were read or modified:
- public.characters(id UUID primary key, account_id, level, xp) holds current **combat** identity; never repurpose its xp/level without a coordinated migration.
- public.character_skills(character_id, skill_id, level, xp) has unique (character_id,skill_id). Existing levels are not freely replaceable when changing XP curves.
- public.craft_receipts has unique (character_id,idempotency_key); public.server_action_receipts is account-scoped; private.v45_progression_receipts is keyed (account_id,event_id). These are not automatically suitable as a globally unique, character-bound Career XP award ledger.
- Existing completed crafting/processing/action source receipts must be verified and their final status checked before any Overall XP award.

Refinement adds:
1. **Legacy migration preview** preserving old earned XP and skill levels through a level+fraction conversion, using the existing mobile V1 skill curve (parity anchors for levels 50/100); Overall Character Level gets a no-regression floor from max(combat level, strongest validated profession level), not a skill sum. More generous historical achievements need separately verified and deduplicated receipts.
2. **Journal preview** modeling exact-once rewards keyed by global (source kind, canonical source ID), with ownership, completion and payload collision checks. This is not concurrent production persistence or a trust boundary; the actual SQL transaction must be tested against real server receipts and simultaneous claims.
3. **Review-only PostgreSQL DDL draft** at docs/operations/sql-drafts/20261122_progression_v2_character_xp_REVIEW_ONLY.sql. No migration was applied. Private tables deliberately expose no client grants, RPCs or policies and do not duplicate live profession XP.
4. **More tests** for partial-progress migration, unchanged original XP, unauthorized alternate-character claims, repeat-collision tampering, source mismatches, zero combat stat contribution and integer overflow.

**Still required before any deployment:** confirm source completion + overall XP update in the same DB transaction, reconcile 2.0 class/profession duplicate definitions, benchmark XP/hour including AFK, cover actual combat reward canonical IDs, game-owner approval of UI and themes, and stage disposable PG17 concurrency/rollback tests. No live or player-facing UI changes are authorized in this pass.
