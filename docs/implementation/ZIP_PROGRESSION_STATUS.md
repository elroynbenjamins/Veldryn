# ZIP progression integration

## Implemented in this pass

Character now has Class Skills and Monster Mastery panels before Combat Companions.

Faith is also wired into character creation and the activity loop: Holy Water drops from authored enemies, practices reserve inventory/bank water, complete on timed claims, refund unfinished reservations, and expose one active level-gated blessing with combat effects.

Herbalism and Alchemy are wired into the same progression loop. Six regional herb nodes grant Herbalism XP, nine finite recipes reserve herbs and Gold from Inventory then Bank, produce timed potion batches safely through overflow, validate escrow on save import, and support healing potions plus encounter-limited combat preparations.

Account roster progression is wired with five skill-gated character slots at 0/250/500/950/1600 account skill levels. Character contexts keep personal inventory, skills, equipment, story, and activities independent while Bank, premium/account ownership, pets, and boosts remain shared. Switching is atomic and appearance unlocks never come from shared-bank equipment or legacy global event flags.

Exploration routes now use the existing activity lane and offline cap. Each current region has a deterministic scouting route with level and travel gates; completed routes grant Exploration XP and unlock the next authored encounter without granting combat kills, Gold, or drops.

The Character screen now exposes the roster switcher and exploration routes directly, alongside Faith, Class Skills, and Monster Mastery panels.

- Two character-owned class skills earn XP from completed normal fights. The first Fallen Knight story victory also grants a 3,000-XP class pool once. Gathering and crafting do not grant class XP.
- Balanced focus splits XP equally; primary/secondary focus assigns 75% to that discipline. Fractional XP persists. The first fight or drill already underway retains its prior split.
- Safe training replaces the current hunting/gathering activity. Each minute grants eight base class XP without healing, consuming food, producing items, or granting character XP, Gold, event progress, or monster kills. Partial drills, focus, and the session XP rate persist. Claims use the existing offline cap and discard excess absence. Both skills stop training at level 100.
- Class skill levels are derived from validated XP, using the current profession XP curve. Small bounded stat benefits feed normal hunting and authoritative co-op loadouts. Focus affects XP allocation only. A real Knife Dancer skill total of 80 unlocks Gloamknife Shade.
- Monster mastery records one point per verified normal-monster kill, separately for each species. Rank 5 grants 1% species damage, rank 10 exposes the mastery drop table, rank 15 grants 3% normal-material yield, rank 25 shows a mastery badge, and rank 30 caps the bonuses at 2% damage and 5% normal-material yield. Fractional extra materials carry between claims. Equipment and bosses receive no mastery yield bonus. Forest Troll rank 20 unlocks Briarhorn Cub.
- Save import/export, startup settlement, online commands, retry receipts, and companion unlock checks preserve the new progression. Clients cannot submit XP or rank grants.

## Source and explicit integration choices

Source: supplied v7 ZIP, especially `files/apps/mobile/tests/class-skill-integration.ts`, its `game.ts` hooks, and the workbook's `Class_Skill_Mapping`, `Skill_Progression_Rules`, `Training_Ground`, and `Monster_Mastery` sheets. Several imported gameplay hooks refer to modules absent from this archive; the current app therefore uses new compatible modules rather than replacing its game engine with an incomplete snapshot.

The workbook lists seven original class pairs. Bastion reuses Guardcraft/Warding; Dreadguard uses Might/Warding, with progression still character-owned. These mappings and the bounded runtime stat benefits are integration choices for the current nine-class roster, not additional workbook rows.

The newer ZIP tests specify the normal offline cap and level-100 class skills. This pass follows those executable expectations instead of the older workbook's eight-hour training cap and regional skill gates. Individual named ability milestones, profession gates, and account-wide multi-character progression are not implemented by this pass.

The workbook specifies mastery points per kill and rank rewards but omits point thresholds. This pass uses 25 points per rank: 500 kills for rank 20 and 750 for rank 30. Elite-information content and mastery pet acquisition remain future integrations. Existing drop displays elsewhere in the app are preserved.

## Validation and release

Run `node tools/test-companions.mjs` for the companion suites plus the new 75-check class-skill and 17-check monster-mastery suites and online authority/retry checks. Existing offline, save, dashboard, progression, and online-command regressions also passed. Mobile and backend TypeScript checks, the Android export, and local server bundle builds passed.

Local source and generated server bundles are updated. No hosted deployment or physical-device QA is included. Remaining ZIP systems include expanded adventure/profession systems, later regions, and their content-specific unlock wiring. Faith blessing numbers are integration values because the supplied workbook has no Faith sheet; the executable Faith tests define the behavior but not the full balance catalog. The archive’s account tests target save schemas v11/v13, while this branch retains its established v6 save protocol; roster data is carried within that protocol until the migration version is intentionally advanced.

## Save-boundary continuation

Roster saves and timed Faith/Alchemy saves now promote to schema 11 during migration. Legacy v5/v6 backups without those new structures remain schema 6 so existing transfer imports stay compatible. The migration rejects malformed, duplicate, oversized, and active-character-colliding roster entries, and moves legacy character pet/boost ownership into the shared account scope without preserving a second ownership authority.

## Later-region continuation

The solo world now includes Sunscar, Frostmarch, and Ashlands travel gates at levels 26, 46, and 71. Each region has three authored ordinary encounters using existing regional material and equipment economies. Exploration routes are required before the first encounter becomes available, preserving the existing travel → scout → unlock → combat progression contract. Regression coverage verifies the later-region gates and scouting unlocks; regional bosses, later-region Herbalism nodes, and full content-specific encounter balance remain future passes.

The profession continuation now adds Sunscale, Frostbell Flower, and Ashen Myrrh Herbalism nodes in those regions, plus three uniquely identified regional Alchemy recipes that reuse the authoritative potion outputs while requiring the new herbs. Inventory/bank reservation, timed settlement, overflow, and save validation continue to use the existing Alchemy path.

Regional encounter discovery is now scoped to the active region during combat settlement. Combat in Sunscar cannot silently reveal Frostmarch or Ashlands encounters; those remain gated behind their own scouting routes. World navigation, weather snapshots, profession source views, backups, and generated online bundles all preserve the same regional contract.

## Arena continuation from Combined v5

The v5 handoff's account-owned three-character Arena foundation is now integrated into the current branch without replaying the cumulative patch over newer work. Arena slot state is normalized to three Front/Middle/Back positions, rejects stale or duplicate character IDs, and requires three distinct owned characters at level 15 or above. The offline squad editor is reachable from the Account hub; ranked network actions remain disabled until the authenticated server application, durable migration, reward catalog, and deployment checks are complete.

Validation for this pass: `pnpm run typecheck:core`, `pnpm run test:core`, and `pnpm run typecheck` in `apps/mobile` pass, including the new Arena squad regression.

The backend Arena boundary now also has strict request parsers for three-character formations, fixed positions, request IDs, opponent keys, limits, and reward claims. Malformed or duplicate client payloads are rejected before they can reach the authoritative resolver. Backend validation was run with the existing local TypeScript compiler/build and the squad smoke suite; pnpm's wrapper attempted a non-interactive dependency purge and was not used for the successful rerun.

The next Arena server slice now freezes authoritative loadouts into hashed, normalized snapshots with server-derived roles, legal-equipment and minimum-level checks, deterministic power bands, and immutable formation metadata. Snapshot regression covers hash generation and duplicate-character rejection. The durable persistence/application/HTTP adapter and Supabase migration from the handoff remain gated follow-up work.

The Arena runtime continuation now adds a memory-backed authoritative repository for seasonal state, frozen defenses, match idempotency, compare-and-set rating settlement, capped ranked/defense entitlements, season rewards, and recipient-checked claims. Persistence regression covers settlement, replay, catalog-versioned pending rewards, and unauthorized claims. This remains a domain/runtime implementation; hosted Supabase persistence and authenticated HTTP deployment still require deliberate migration and adapter verification.

The framework-neutral Arena application service is now layered over that repository. It generates opaque HMAC opponent keys and server-owned match seeds, re-freezes attacker loadouts at match time, resolves deterministic duels, commits rating/reward state through the repository, supports idempotent replay, and exposes only sanitized entry/opponent/history/reward projections. No client-supplied stats, roles, RNG, ratings, or payout amounts are accepted.

The ZIP HTTP boundary is now integrated as `ArenaHttpApplication`. It validates publish/opponent/match/claim bodies through the strict parsers and accepts only an externally verified account ID plus server time from the concrete framework adapter. HTTP-boundary regression confirms duplicate formations are rejected before service execution. Supabase persistence, real authenticated route binding, and migration dry-run/apply verification remain intentionally gated.

The v5 durable migration contract is now present at `backend/supabase/migrations/20260929000000_squad_arena_runtime_v5.sql`. It adds request/snapshot metadata, versioned reward entitlements, RLS for reward reads, service-only season/reward helpers, and the 28-day season projection. Static verification is available through `node ../tools/verify-arena-migration.mjs` from `backend`; no linked Supabase apply was performed.

## Arena hardening pass

The next ten refinements are complete: same-account duel rejection; exact three-position validation; finite positive power checks; finite normalized-stat checks; replay payload conflict detection; zero-sum rating enforcement; rating-direction enforcement; rating-floor enforcement; cross-entitlement claim-request conflict detection; and expanded regression/static verification. The hosted feature remains gated pending linked Supabase dry-run, schema lint, and authenticated deployment checks.

## Arena hardening pass 2

The next ten refinements are complete: position-based duel pairing independent of array order; minimum-length server seed validation; same-account duel rejection; exact formation-position checks; positive finite fighter-power checks; normalized-stat finiteness checks; trimmed request-ID canonicalization; replay digest conflict rejection; zero-sum/direction/floor rating enforcement; and claim-request collision rejection across entitlements. Arena regression suites and mobile typechecks remain green.

## Arena hardening pass 3

The next ten refinements are complete: authenticated account-ID validation; server-time validation; entitlement-ID validation; constructor enforcement for a sufficiently strong Arena secret; position-order-independent combat pairing; minimum-size server seed enforcement; duplicate formation rejection before resolution; non-finite power-band rejection; invalid normalized-stat rejection; and boundary regressions covering malformed identity/time inputs. Hosted deployment remains gated.

The regional contract is also reflected in presentation: the World screen counts Herbalism nodes alongside other gathering activities, Exploration labels each route by destination region and uses normalized saved location, and online regression checks the distant-unlock invariant.

## Rankings continuation from Combined v6 Pass 6

The read-only Rankings slice is now integrated. Mobile exposes Account, Profession, Competitive, Dungeon, and Guild boards through the More hub, with authenticated-server gating, bounded pagination, explicit prestige-only copy, and no offline fallback that could imply client authority.

Backend now has strict board/query parsing, an application and HTTP boundary, a service-role Supabase repository adapter, and a focused application regression. The durable migration `backend/supabase/migrations/20261005000000_rankings_v1.sql` adds public/friends/private profile visibility, the server XP-to-level helper, the `rankings_board_server_v1` projection RPC, public-profile and mutual-block filtering, and service-role-only execution. Profession, Arena, and Guild projections are backed by current server tables; unsupported future metric tables return no fabricated entries until their authoritative sources exist.

Static migration verification is available through `node ..\\tools\\verify-rankings-migration.mjs` from `backend`. Mobile validation includes `pnpm run test:rankings`, `pnpm run typecheck:core`, and `pnpm run typecheck`; backend validation uses the local TypeScript compiler and `node dist/server/rankings/__tests__/ranking-application.js`. No linked Supabase dry-run or hosted deployment was performed.

## Profile Identity continuation

The next profile slice is staged behind the existing online boundary: strict profile selection parsing, authenticated self/view/update application methods, and a service-role RPC adapter now exist under `backend/src/server/profiles`. The adapter intentionally does not enable local `LOCAL_CHAR_*` publishing or invent a cosmetic ownership source. Profile migration verification remains skipped until the cumulative profile-identity migration and its prerequisite cosmetic/Arena ownership migrations are applied together in a disposable Supabase chain.

Profile application regression passes with authenticated identity trimming, visibility validation, request-id length validation, invalid-time rejection, and idempotent update projection handling.

## Achievements continuation

The Achievements v1 server boundary is now staged under `backend/src/server/achievements`: strict claim/showcase parsers, authenticated application/HTTP methods, and a service-role Supabase adapter. The contract keeps progress, score, payout, and title ownership server-derived; showcases are limited to three unique claimed IDs. Focused achievement application smoke passes. The cumulative `20261002000000_achievements_v1.sql` migration remains gated until its catalog, cosmetic ownership, and authoritative progression prerequisites are present in one disposable Supabase chain.

## Collections continuation

The account-collectibles slice now adds the authored 15-entry pet/background/border catalog and a pure collection evaluator. It validates stable IDs and the +50-basis-point owned floor/+200-basis-point active floor, deduplicates bonus families, separates ownership from selection, exposes raw/applied/suppressed target totals, and provides a journal projection. A focused `test:collectibles` regression passes. Existing settlement and permanent-boost wiring remains authoritative; no new collectible power family or hosted ownership sync was enabled.

## Guild Completion continuation

The Guild Completion progression slice now adds the server-side guild skill catalog, 100-point budget, incremental allocation validation, deterministic spent-point calculation, bounded upgrade-effect projection, and boss-attempt guard. The focused `guild-progression-smoke` test passes, and the implementation remains separate from direct client-submitted Guild Boss damage or hosted Guild migration enablement.

The authenticated Guild application slice is now also staged: strict create/profile parsers, self/directory/leaderboard projections, creation and profile update calls, skill allocation, project contribution, and a service-role Supabase repository adapter. `guild-completion-smoke` and `guild-progression-smoke` pass. The cumulative Guild migration and concrete edge-route binding remain gated; no client-submitted Guild Boss damage path was enabled.

Guild administration contracts now also cover officer/member role changes, member removal, leadership transfer, leaving/deleting an empty guild, invites, invite acceptance, membership-gated chat reads, and bounded chat sends. These repository operations are intentionally optional until the cumulative migration-backed RPCs are applied; the application layer validates identity, role values, request IDs, time, and chat length before dispatch.

Collections is now a mobile destination in the More hub. The screen renders the account-bound collectible journal by kind, distinguishes locked/owned/selected state, shows applied and suppressed target bonuses, and routes selection through the existing immutable commit/save boundary. It does not fabricate ownership or unlocks, and remains separate from the pending hosted Collections sync migration.

Profile is now also a mobile destination in the More hub. The local projection shows the current character identity and earned title/background/border/pet selections, while clearly failing closed on publishing until authoritative cloud character mapping and the cumulative Profile Identity migration are available.

Achievements now has an authenticated mobile client and More-hub screen. It loads server-derived progress/score, exposes claim actions only for completed unclaimed entries, limits the public showcase to the server contract, and shows an explicit offline-disabled state. Shared projection types live in the mobile core rather than importing backend source. Full achievement catalog persistence and hosted RPC deployment remain gated.

The Achievements screen now also supports selecting/deselecting up to three claimed achievements and saving the showcase through the authenticated server endpoint. The server response replaces the pending client selection, preserving server authority and idempotent request behavior.

## Chat expansion

The legacy Chat Pilot emote catalog is now surfaced in the live World, Party, and Guild compose controls. The picker inserts validated-looking `:emote_id:` shortcodes without granting unlocks or bypassing moderation; the server remains responsible for final message validation. Online World and Party sender names are tappable and open the existing small profile sheet with profile lookup, Add Friend, and Block actions. The offline World preview retains its legacy profile alert, while Guild preview names remain presentation-only until authoritative account IDs are exposed by the Guild chat repository.

Chat refinement adds a shared legacy-catalog emote counter and blocks live World messages containing more than eight recognized emotes before network dispatch. Shortcode insertion remains capped by each composer’s existing message-length limit, and server moderation/ownership validation remains the final authority.

Live World and Party messages now render recognized legacy emote shortcodes as compact inline badges; unknown or legacy text tokens remain readable plain text. This keeps old messages forward-compatible while making newly sent emotes visually distinct from ordinary chat text.

## Five-refinement continuation

Rankings client pagination is now clamped to the server contract before request construction. Achievement request IDs use a monotonic in-session sequence to avoid same-millisecond collisions. Guild descriptions now enforce the ZIP’s 160-character/control-character boundary. Profile cosmetic and class IDs render as readable labels. Collections/Achievements/Profile remain server-gated where authoritative ownership is unavailable. Mobile core typecheck passes; the broader app typecheck still reports two unrelated existing `ActivityOverviewScreen` errors.

## V51–V53 cumulative integration

The V51 notification hierarchy is now present in the host app. It deduplicates notification keys, preserves count-versus-dot semantics, caps visible counts at `99+`, supports primary and subroute aggregation, and drives the bottom navigation from live activity rewards, event claims, and the existing online social-notification poller. The full mobile typecheck now passes, including the previously reported Activity Overview errors.

V52 guild appearance now uses the supplied banner, border, and nameplate artwork and the complete compatible catalog: eight banners, nine borders, nine guild-name colors, and two nameplate choices. A dedicated RLS-protected `guild_appearance` record, entitlement projection, officer-authorized update RPC, legacy compatibility wrapper, and automatic initialization trigger for newly created guilds keep the normalized appearance state synchronized with the established guild columns. Cosmetic choices remain power-neutral.

V53 guild tags now include atomic normalized creation, permanent retirement after rename/delete, profanity and reserved-tag checks, guild-level/PvE color entitlements, and identity projection across chat, profiles, recruitment, rosters, and rankings. Static migration audits pass with 13 V52 and 11 V53 invariants. Mobile typecheck/core tests and backend typecheck/build pass.

The linked Supabase project is now synchronized through `20261018000020_post_deploy_lint_repairs.sql`. The deployment reconciled 36 duplicate migration versions and eight invalid timestamp versions, applied the 48 pending feature migrations plus one forward lint/security repair, and finished with an empty linked dry run. Remote `public`/`private` lint and Supabase security advisors report no errors. Live metadata verification confirms RLS on the V52/V53 guild tables, the new-guild appearance trigger, authenticated-only appearance mutation, the security-invoker region-content view, and removal of the obsolete Market reservation RPC. Physical-device visual QA remains outstanding.
