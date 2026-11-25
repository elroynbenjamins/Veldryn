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

## Pass 2 polish — deterministic benefit previews

- Isolated profession-benefits-preview.ts models effective action duration as ceil(base duration / (1+speed)), sharing an explicitly provisional 20% cumulative cap with Forge rather than stacking unbounded speed.
- Quality bonus affects only the quality roll (capped at Q100), never rarity or affix probability.
- Common-input recovery is a server-RNG per-unit roll after successful settlement. Rare catalysts, combat trophies, boss drops, blueprints and currency are excluded, so rare materials remain genuine sinks.
- Staging public.claim_idle_progress_atomic uses an 86,400-second **elapsed-time** per-claim cap and service_role-only execute access. A 30h reserve must split into separately verified at-most-24h elapsed claims. Server-authorized standard-effort XP may exceed the elapsed seconds due to capped speed bonuses: verify the two numbers independently. Do not trust client timers or replayed idempotency keys. This was checked read-only; no function was changed.
- Added focused benefits and review-only SQL safety tests to backend test:progression-v2; no actual rewards are minted.
- Do not treat TS proof.completed=true as authorization. The production source completion must be verified by the private service handler against actual persisted receipts and settled in the same DB transaction as the new XP bank.

## Pass 3 — Transaction adapter and independence validation

The hidden settlement-service-contract.ts accepts only a server-verified principal, owned character and canonical completed receipt locator. XP amount, profession, difficulty, duration and completion status are NOT request parameters. Its injected repository must check persisted owner/source/completion, insert globally unique receipt and increment the independent Overall XP bank inside a single transaction. Current tests model concurrency and rollback; this is NOT connected to a live DB route.

### Existing staging source provenance

- public.idle_claim_receipts.claim_id (UUID), character_id, activity_id, elapsed_sec and xp_amount record prior completed idle claims. Before awarding career XP, resolve the activity from server-owned content and reject non-gathering/invalid sources.
- public.craft_receipts.receipt_id (UUID), character_id, recipe_id and quantity record prior crafting actions. Resolve recipe skill and effort from the canonical server catalogue, never a client amount.
- Combat reward receipts need their own provenance audit before combat_reward is enabled.
- Staging public.claim_idle_progress_atomic currently inserts item resources and a claim receipt, but does NOT update combat or profession XP in its inspected SQL body. Find the actual live XP authority before integration. For already-committed old receipts, a separately idempotent post-claim projection can eventually credit the new XP bank without replaying the original item grant.

### Independent profession routes

The isolated profession-resource-access.ts requires the exact relevant profession skill and a separately server-authored noncombat route for a resource. A Combat Lv1 Mining Lv96 can theoretically qualify for T9 Ashlands nodes if a safe profession route is authored, but this does NOT unlock the dangerous world region, enemies, dungeons or combat travel. No actual route has been created.

### Read-only gathering pacing using existing live content

backend/tests/progression-v2-gathering-pacing.cjs reads the current apps/mobile/src/content/skills.ts gathering nodes, their seconds and XP, then models the new proposed profession XP curve. Assuming the best unlocked node 24/7, no interruptions, no travel/zone restrictions, and no buffs:

| Skill target | Mining | Woodcutting | Fishing |
|---|---:|---:|---:|
| Level 12 | 6.1h | 6.0h | 6.7h |
| Level 48 | 79.2h | 86.0h | 84.8h |
| Level 84 | 229.6h | 241.5h | 241.2h |
| Level 96 (T9) | 298.6h | 310.7h | 308.5h |
| Level 100 | 325.0h | 337.1h | 334.2h |

These are optimistic CONTENT-DERIVED diagnostic hours, not guaranteed player completion times. Current higher nodes are combat-zone gated; they are inaccessible to a Combat Lv1 gatherer until new safe routes are designed and approved. Do not approve the proposed curve before comparing with live action rate distributions and market supply/demand.

### Outstanding

- Build/auth-test a real source receipt adapter using canonical DB receipt UUIDs; audit combat settlement evidence; stage disposable PG17 concurrent transactions.
- Reconcile skill level threshold T3=24 proposed versus 1.x T3=22 and the old Combat 2.0 branch Character Level definition.
- Continue user UI/theme review gate, preserve existing character/combat/profession XP, and keep all flags OFF.
## Follow-up — Canonical receipt parsing and account progression alternative

The hidden source-receipt-shapes.ts parses the ACTUAL staging receipt columns read-only: public.idle_claim_receipts.claim_id and public.craft_receipts.receipt_id are immutable UUID sources. An idempotency_key is a retry alias and MUST NEVER substitute for the canonical receipt ID in the new global award ledger. Both parsers deliberately return actionClassification=unclassified: the server still must resolve the original activity/recipe and verify ownership and completion before awarding any XP.

Single-skill character progression also needs an alternate way to unlock account character slots. The isolated account-career-slots.ts proposes a max-of-two-paths policy: retain the old already-earned account skill-total unlocks OR use the account's highest verified Overall Character Level, at levels 25/50/75/100 for slots 2/3/4/5. Neither path can revoke a previously earned character slot; a pure Smithing career can eventually reach five slots without training all professions. This is provisional policy only, not live entitlement code.

All new tests are included in the scoped progression-v2 CI script. Nothing modifies user profiles, account unlocks, database state or app screens. Current explicit blockers remain level-curve and milestone balance approval, authoritative receipt adapter integration, PG17 concurrency QA and 2.0 Combat/equipment branch reconciliation.
## Pass 3 continuation — actual live snapshot provenance and disposable PostgreSQL 17

### Verified database facts (read-only aggregate queries; 2026-11-22)

- Both production and staging public.character_skills are currently EMPTY. They cannot be the only historical migration source. Production public.online_game_states is a populated per-account JSON snapshot store (`account_id`, `character_id`, `state` JSONB, `revision`, `updated_at`).
- Production has 526 snapshot rows, of which 345 contain `state.skills`, 329 contain an active `state.character`, and four parked characters appear in `state.otherCharacters`. All 329 populated active character IDs match online_game_states.character_id.
- From 3,795 active profession skill snapshots, 3,795 saved skill levels exactly match the V1 1.42-exponent XP curve; zero mismatches. This is a strong calibration anchor, not permission to overwrite original XP.
- From 329 active combat snapshots, 304 cached levels match the XP-derived 1.65-exponent combat level; 25 differ (24 cached higher, one XP-derived higher; maximum absolute difference six). A migration which recomputes levels solely from XP could cause a visible regression. Preserve original combat level/XP and use the greater trusted milestone ONLY for the new Overall Character Level backfill.
- These are aggregated diagnostic counts only: NO account names, IDs, or private individual records were exported. Neither database was written to.

### Implemented responses

- New `online-state-migration-preview.ts` accepts a verified online_game_states row and projects active and parked characters separately using each character's own skill XP/level array. Requires active JSON ID = character_id, rejects malformed skills, duplicate characters and unknown IDs, and freezes the source revision for future compare-and-swap migration.
- `legacy-migration-preview.ts` now takes optional **server-saved skill levels and combat XP**. It never demotes a profession if its cached level exceeds the XP-derived level; it never rewrites the original combat level or XP. The Overall Character Level baseline uses the greater verified career milestone.
- Source receipts require persisted completion timestamps strictly AFTER character career XP activation. This prevents a migrated character from earning new XP again for the old activities already represented by backfill.
- New draft `activated_at` column and timestamped source parsers are covered by isolated regression tests; no migration applied.
- Disposable GitHub Actions PostgreSQL 17 service runs `backend/tests/progression-v2-pg17-disposable.sh` against the review-only schema using 16 concurrent claims, receipt identity collision, role/RLS checks, transactional rollback, and cross-character XP isolation. The dedicated isolated CI job on commit `dbdd1e2` succeeded. No connected Supabase database is modified by this test.

### Remaining integration blockers

1. Trace authoritative online_game_states write/claim paths. Current standalone `public.character_skills` and `public.craft_receipts` might not be populated for modern gameplay, and cannot independently prove a real recent reward. Do not enable live Character XP awards based solely on these receipt schemas.
2. Develop authoritative post-claim source adapters for the actual live JSON state/store and backfill all active and parked characters with consistent revision/ownership locks. Validate under staging before any launch.
3. Reconcile Combat 2.0 branch's `Character Level == Combat Level` nomenclature and 2.0 tier gates. Ensure combat equip, CP, dungeons and class talents consume combat level only.
4. Profile XP rates with real action totals, prepare safe profession access paths and commission marketplace material verification. User approves actual 2.0 UI/theme before attaching new screens to the build.

## Receipt source authority — production-only aggregate audit

Production source receipt population (read-only counts, no account details):

| Source table/action | Count | Trust conclusion |
|---|---:|---|
| public.craft_receipts | 0 | Cannot be the sole modern crafting completion source |
| public.idle_claim_receipts | 0 | Cannot be the sole modern gathering completion source |
| public.server_action_receipts | 7,391 | Actual populated server action/retry ledger |
| server_action_receipts.action = online_game_v1 | 6,923 | Main online game source |
| online_game_v1 with reward result | 6,032 | Some contain reward XP and elapsed seconds |
| online_game_v1 with reward, activity kind, saved character and matching account | 4,643 | Structurally plausible; NOT automatically safe to award XP |

Modern online_game_v1 response JSON includes requestHash and result; result can contain activity, reward (xp, elapsedSeconds, combat/processing metadata) and saved state. Activity kind is sometimes null or may describe the NEW/current activity rather than the reward's exact previous source, including queued transitions. Therefore NEVER blindly treat (result.activity.kind + reward.elapsedSeconds) as a verified completion for Character XP. A new server-authored, source-character-bound immutable V2 reward receipt should be settled along with the online_game_state revision and the underlying item/skill source transaction. Retrying a persisted online_game_v1 response is not itself an entitlement to an additional career award. The V1 receipt can aid migration diagnostics but cannot substitute for new evidence.

### CI note

Dedicated Progression 2.0 contracts, including the disposable PG17 ledger job, passed at the exact-head checked after activation-cutoff changes. Broader Mobile Core / Guild Shop CI has independent mobile TypeScript failures in new gathering-tool copy/imports on the PR merge checkout (e.g. ItemQuickInspect and InventoryScreen). These are unrelated mobile files not modified by this progression PR and must be reconciled on main or via their owning UI branch before claiming full repository green.

## Pass 3 source-authority extension — verified gateway call boundary (2026-11-22)

READ ONLY production RPC audit (no SQL written): backend/online/gameplay.ts calls public.commit_online_game_guild_pve_v1, which locks the account and forwards to public.commit_online_game_server_v1/v2. The underlying function locks public.online_game_states by account, fences its revision, updates legacy character/account state, and inserts public.server_action_receipts in the SAME PostgreSQL transaction. Character deletion uses v2 and must remain isolated from XP settlement. All audited game commit RPCs are service_role EXECUTE only; anon/authenticated do not have EXECUTE grants.

New hidden online-game-proof-preview.ts projects a deterministically hashed sourceId for each positive, server-simulated GATHERING segment, scoped to authenticated account ID, verified pre-command character ID, canonical request hash, expected game revision and ordinal. It checks canonical gathering target metadata and owner's skill level, applies decreasing difficulty credit when overleveled, excludes QA, non-claim commands, empty XP and character switches, and fails closed for unknown/mismatched targets. It does NOT read clients, issue XP, mutate runtime or implicitly unlock a combat region. Combat, processing, alchemy and all other sources remain uncredited until their own proof design is implemented.

A review-only private.online_career_reward_sources_v2 table now models immutable source provenance with unique global (source kind, source ID) AND unique (account, request, segment index), database-completion timestamp, canonical owner, profession, elapsed duration and difficulty. Its completed_at must be assigned by the actual database commit, and only post-character activation sources may mint new XP. No grants/RPC/exposed functions are created. The draft is tested only inside throwaway PG17 GitHub Actions CI, including another 16-way race for the combined source+award ledger.

Production aggregate content check: among 206 observed gathering segments in online_game_v1 reward.activityResults, all positive elapsed seconds are integral, no elapsed amount exceeded 86,400s, and no XP values were fractional; 49 of the 206 segments had zero XP. These findings support skipping zero-XP segments and not awarding assumed XP from elapsed alone. This is a compatibility sample, not license to replay historical actions or conclude all claim formats share the same contract.

Outstanding implementation block: wire the hidden proof generator only into the authenticated server's live claim simulation and a new service-only, single-transaction game commit that owns state revision+source proof+career XP+legacy receipt. This requires explicit integration review, low-population simulated economy tests, actual staging transactional tests, and no UI runtime changes until the user approves the UI/themes.
## Pass 3 — new immutable gathering receipts and atomic validation

The actual game server uses backend/online/gameplay.ts and a service-only transaction chain: public.commit_online_game_guild_pve_v1 → public.commit_online_game_server_v1/v2. These RPCs currently have EXECUTE permission for service_role only; anon/authenticated execute permissions are disabled. Existing state revision and online_game_v1 receipt are written atomically, providing the appropriate integration point.

Isolated hidden implementations added in this pass:

- online-game-proof-preview.ts: after a trusted game-command claim simulation, derive deterministic SHA-256 source IDs using canonical account/request hash plus segment ordinal. Only positive-XP gathering segments with server-known target and correct owner's skill level are projected. No XP from QA, non-claim, combat, unknown target, wrong character, untrained skill or zero-XP source. Source completion timestamp remains NULL until DB commit.
- committed-game-proof-v2.ts: validate the persisted private source row and match it to the exact account-scoped online_game_v1 receipt (request hash, committed revision and actual character). Only then recover a ServerSettlementProofV2 for the separate XP-award policy. It is an offline model; future server-owned transaction repository must query both rows inside the same database transaction.
- docs/operations/sql-drafts/20261122_progression_v2_character_xp_REVIEW_ONLY.sql: add private.online_career_reward_sources_v2 with globally unique source key and unique account/request/segment ordinal, server-computed completion timestamp and no grants or functions. This SQL is NEVER applied to staging or production by this PR.
- backend/tests/progression-v2-pg17-disposable.sh: an extra 16-session race checks source+receipt+XP credited exactly once in a disposable PostgreSQL 17 container. Source duplication and cross-character collisions fail closed.

Read-only production aggregate check: 206 gathering reward.activityResults segments were seen; all positive elapsed durations and XP values were integers, none exceeded the 86,400-second limit, and 49 segments had zero XP. No private player rows were exported.

**Integration gate:** The real gameplay handler must pass pending proofs only after verifying request identity and settlement, and the backend database commit must validate source receipt, expected revision, original character and economy changes atomically before career XP is touched. Existing 1.x game/RPC behavior must be preserved with feature flag off. New screen/theme review is still mandatory before any mobile UI changes. Combat/crafting/processing proofs remain a future pass.
## Pass 3 continuation — combat, instant crafting and whole-game transaction QA

Three career source categories are now modeled independently. These are still HIDDEN TYPESCRIPT PREVIEWS, not runtime activation:

- Combat: a normal monster claim requires a canonical monster, confirmed kill(s), positive legacy combat XP and a server-recorded active combat interval. Only verified active fight seconds contribute to Overall Character XP, with sharply reduced credit when fighting enemies 20+/40+ Combat Levels below the player. Bosses/story/dungeon combat are intentionally excluded until their owning reward channels can provide immutable proof. No profession XP from combat.
- Instant crafting: a successful server-simulated `craft` must have one matching canonical crafting contribution, correct recipe and skill level, and proof of skill XP progression unless already at profession level 100. An immediate Forge job start, cancellation, incomplete materials, market transfer or timed-job claim is NOT instant-craft proof. Provisional maximum credited effort is 10,800 seconds per craft command and overtrained recipes yield reduced XP; maxed artisans can continue increasing Overall Character Level.
- Gathering: retains server-verified node/skill/elapsed work proof. `combined-game-proofs-v2.ts` now requires combat/gather sources to describe one identical authoritative segment stream, and rejects any duplicate account/request/segment ordinal. Game command, account, request fingerprint, original/committed character and revision must agree.
- Persisted proof validator and private review-only SQL draft now accept all three source kinds. Combat must have null profession and zero idle elapsed; instant crafting must have an allowed crafting profession, zero idle elapsed and <= 10,800 effort; gathering remains bound to 1–86,400 elapsed seconds. All are bound to the original committed online_game_v1 receipt. No player XP is actually minted.

### Whole-game PostgreSQL transaction safety fixture

The dedicated CI workflow now runs `backend/tests/progression-v2-online-commit-pg17-disposable.sh` after the earlier throwaway PG17 ledger tests. It creates minimal fake public online_game_states and server_action_receipts plus a disposable service function (NEVER use in a real database). The function exercises an optimistic online state revision, action receipt, source proof and Overall Character XP together under a row lock. Sixteen simultaneous identical requests should produce one applied + 15 replayed, with one state revision, receipt, proof and XP increment. Checks cover changed request hash, stale revision, wrong character/account, and rollback when the XP bank update throws after earlier writes.

### Remaining critical boundary

The disposal-only function is intentionally NOT a production auth implementation. The real 1.x gameplay commit uses a privileged service-only RPC and must not expose a new call accepting client-supplied character XP, difficulty, elapsed seconds, or source identity. A future server-owned integration must validate the canonical executeGameCommand settlement, bind its pre-command character, keep existing economy writes in one transaction, and gate all V2 writes by the release flag and migrated character epoch. No SQL was run on Supabase; no live or staging accounts were altered.
