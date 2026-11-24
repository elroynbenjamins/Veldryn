# Material purpose and unused loot cleanup — first audit (2026-11-24)

Status: **review only, no live removals authorized by this record**. Do not deploy, modify existing inventories, enable Equipment 2.0 or interpret the absence of a text reference as proof of disuse. User direction: materials must have a genuine gameplay use; truly obsolete drops should be removed outright rather than replaced with separate gold drops; review ordinary base gold separately only if necessary. Retire existing player-owned copies of confirmed obsolete IDs at full authoritative NPC sell value through a one-time, atomic server-side conversion; retain historical item definitions and transaction records.

## Findings and scope

Screened 75 literal `type:'material'` rows defined directly in `apps/mobile/src/content/items.ts`; 40 occur in the mobile monster catalogue. 56 appeared in the first group of crafting/recipe source files (references, not necessarily consumer evidence); 19 did not. This is not the complete expanded ITEMS catalogue: imported herbs, guild/cross-profession components, raw gems and generated content need enumeration. Neither mobile source rates nor the current main branch prove deployed server behavior.

First group: `content/skills.ts`, `content/equipment-recipes-v33.ts`, `content/alchemy.ts`, `content/gathering-tools.ts`, `content/novice-sets.ts`, `content/cross-profession-components.ts` (all under apps/mobile/src). Follow-up: equipment enhancement, companion config, guild components/construction, quests, backend companion content and guild projects, regional resource mapping, equipment processing/material profiles, selected event and faith files. Read-only production guild project supply catalogue lookup for the unresolved IDs plus Runebound Core returned no rows; this does not rule out other guild sinks.

## The 19 initial flags

| Material ID | Review outcome | Evidence / blocker |
|---|---|---|
| ASTERFALL_MINERAL_ESSENCE | Protect | equipment-enhancement.ts substitutes it in early upgrade requirements |
| TEMPERING_CORE | Protect | equipment-enhancement.ts consumes cores when quote requires them |
| ECHO_TOUCHED_PELT | Protect | guild-components.ts: Guild Seal Wax, Beacon Oil inputs |
| LANTERNSTEEL_SHARD | Protect | combat-companions.ts: Lantern Wisp progression definition |
| BANNER_ASH | Protect | combat-companions.ts: multiple Ashlands companion ascensions |
| REGENT_SIGIL | Protect | combat-companions.ts: UNIT_024 Prestige Mastery cost |
| OATHGLASS_FRAGMENT | Protect | combat-companions.ts: Mastery Chamber and companion costs |
| GLOAM_DUST | Protect | combat-companions.ts: Gloamknife Shade ascension definition |
| RUNEBOUND_CORE | Protect | combat-companions.ts: Runebound Sentry ascension, Expedition Pens upgrades |
| SAFFRON_REED | Hold | equipment-resource-map-v25.ts regional resource binding |
| MIRAGE_BLOOM | Hold | same regional resource map |
| CHARBARK | Hold | same regional resource map |
| ROYAL_CHITIN | Hold | same regional resource map |
| TYRANT_SEAL | Hold | same regional resource map |
| BELLFIN_SCALE | Hold | same regional resource map |
| WYRMSCALE | Hold | same regional resource map |
| FROZEN_HEART | Hold | same regional resource map |
| EVENT_BONDBLOOM | Hold | explicitly companion-related in resource-codex.ts; exact active sink not verified |
| ECHO_BAT_WING | Candidate only | monster drop and item definition; no exact consumer in inspected recipe, upgrade, companion, guild, quest, event or 2.0 manifest files; not cleared for removal |

Totals: 9 protected by specific definitions, 9 held pending further dependency checks, 1 candidate, 0 approved removals. Protected includes definitions that must be reconciled with server runtime before any UI claim that an activity is currently available.

## Runebound Core — correct the inspector, not the loot

`apps/mobile/src/content/combat-companions.ts` lines 54, 85: Sanctuary Expedition Pens requires 6, 12 and 20 cores at levels 1–3 respectively (38 total), along with gold and essence. Runebound Sentry specifies RUNEBOUND_CORE as ascensionMaterialId. Keep the drops from Runebound Miner and Fallen Sentinel.

`core/resource-codex.ts` already builds companion use labels from definitions (around lines 78–104), but `core/item-inspect.ts` only builds recipe-based `usedIn` navigation, and `components/ItemQuickInspect.tsx` uses that model. Add structured, availability-aware material consumers shared by both screens rather than the Codex's generic fallback or duplicated strings. Display Used for above How to get, with exact quantities and valid destination where implemented. Do not surface unreleased content. If no verified consumer exists, distinguish unresolved from confirmed obsolete. Preserve inventory actions and existing translation conventions.

## Echo Bat Wing candidate — removal only

`items.ts` assigns 80 gold vendor value. `monsters.ts` lists Echo Bat with raw 0.28 chance, quantity 1–2. Do NOT use the raw client chance as the live rate; effective runtime rates and bonuses may differ. If and only if confirmed unused, remove the authoritative loot entry outright and remove it from all corresponding client loot previews and source indexes. Do not add a replacement gold entry, hidden bonus roll, or automatic compensation for future kills. Existing owned copies are compensated separately through the retirement migration below. Keep the monster's ordinary gold reward unchanged by default; if actual economy impact warrants a base-gold adjustment, review it separately. If approved for retirement, convert existing owned stacks at the authoritative sell price (80 gold per wing if verified by the live vendor policy); keep historical item identity and records.

## One-time existing stock retirement (user-approved policy, implementation still gated)

Only exact IDs verified to have no current or protected future use may be included in a versioned retirement allowlist. No IDs have passed that gate yet. This policy supersedes the earlier preserve-owned-stacks proposal; it does not introduce any gold into future loot tables.

- Before execution, obtain a read-only dry run by ID: authoritative NPC unit sell value, eligible quantities by storage and character/account owner, affected players, total gold liability, and unresolved custody/reservation cases. Use actual server vendor pricing, not UI labels or market prices.
- Stop all new issuance for the approved IDs first or atomically with retirement. Reconcile in-flight rewards, offline settlement, bank transfers, crafting reservations, market/escrow/mail claims and guild/shared custody where applicable. Do not double count shared bank stock or pay a player for guild-owned resources without a verified ownership rule.
- For each verified owner, lock the relevant authoritative storage and gold ledger; re-read quantities under lock, then remove eligible inventory/bank stacks (including locked/favorited copies, with an explicit retirement reason) and credit quantity × unit NPC sell value to the appropriate owner's gold balance in the same transaction. Clean only the retired item's stale lock/favorite references. No changes to other resources or equipment.
- Record a durable versioned unique retirement receipt per ownership scope and item, with exact removed quantity, price and awarded gold. Ensure retries, concurrent logins/sales/transfers, failures and replays cannot duplicate payment or destroy items without payment. Preserve historical records and item identity; no silent rounding, overflow or gold-cap loss.
- Send a localized inbox notification with retired item name, quantity, unit value and total gold, once per receipt or consolidated batch. Gold must already have been credited; message is informational, not a second claim.
- Validate staging and dry-run totals, then use controlled batches with reconciliation: removed quantities equal receipt quantities; credited gold equals receipt amounts; zero remaining eligible owned copies and no fresh grants. Any unresolved custody or inconsistent balance blocks that scope. Production execution requires release review; no player inventory or gold has been changed by this document.
- Test empty stock, multiple characters, shared storage, locked/favorited stacks, exact full-value credit, concurrent manual sale, transaction rollback, duplicate retry, late grants, offline sessions, notification deduplication and historical record readability.

## 2.0 boundary

Inspected PR #1713 branch `review/eq2-authored-boss-threeway-mint-gates-20261124`: the three hidden server manifests (base, armament, expansion), material origins and material source review contained no exact token or spaced name for the eleven remaining/Runebound IDs checked. This is not a full dependency check: mapped IDs, components, latest T5 work, pending T5–T9 recipes and later releases remain unresolved. #1711/#1713 explicitly review-only/non-issuable; do not activate or expose them as current consumers. Protect any confirmed future material until its drop timing is decided.

## Required next pass before any loot change

1. Enumerate the entire resolved active catalogue, not just literal base rows; identify all currently obtainable monster, boss, dungeon, gathering, quest, shop, expedition, event and salvage sources with server release gates.
2. Reverse-index active recipe inputs, enhancement/merging, companions, guild construction/projects/supplies, donations, faith, unlocks, exchanges, quests and event costs. Separate producers, consumers, metadata and tests. Include hidden 2.0 manifests and their material aliases as a separate protected/planned layer. Never equate reward references, localization or artwork with a sink.
3. Inspect authoritative `backend/supabase/functions/gameplay/index.ts` and generated recipe catalogues. Connector returned empty/unsupported content for the large gameplay source and 1.5 MB mobile equipment JSON; production Edge Function retrieval also failed. These are blocking gaps, not evidence of absence.
4. Reconcile server drop chance, quantities, modifiers, caps, online/offline/AFK reward paths and current production balances. Only approve removal where all consumers and dependencies are excluded and the economy impact is understood.
5. Remove approved obsolete entries consistently across server grant paths; client source preview and Codex must match. No separate gold loot entries or hidden compensation rolls. Convert existing owned stacks only through the separately reviewed retirement migration described below. Tests: absence of removed drops, unchanged remaining item probabilities and quantities, unchanged ordinary combat gold, duplicate retry, online/offline parity, inventory-full behavior and historical inventory reads.
6. Review source-backed item-purpose UI separately and gate unreleased entries. Release approval required before any production mutation.

No gameplay source, database, live loot table or player inventory was modified by this review.

## Production dry run and staging projection — 2026-11-24

Read-only Supabase aggregate checks on production (nyjwigipamnvpdvpauuv), candidate ECHO_BAT_WING:
- 143 in inventory (1 stack/account), 707 in bank (4 stacks/accounts), 850 total in 5 distinct accounts and 5 distinct character states. No affected account has multiple saved character rows in this snapshot. No matching relational item_instances or account_bank_items rows found.
- Provisional compensation: 850 × 80 = 68,000 gold (11,440 inventory; 56,560 bank). Mobile itemVendorSellGold returns the authored value unchanged for materials. Deployed authoritative sell/grant path remains unverified.
- All 5 affected states have a character ID, character gold and bank gold fields, and matching characters and character_wallets records. All three character gold representations agree for all 5. This does not determine whether bank retirement should credit bank gold or character gold; verify actual authoritative bank sell semantics before choosing the destination.
- No matching guild bank stock, guild construction requirement, guild skill cost, equipment resource binding, unclaimed reward inbox/coop/party entitlement, or literal reference in public/private database function bodies was found. This is a limited dependency check, not proof of absence in edge code, generated content or future aliases.
- Protected RUNEBOUND_CORE snapshot: 29 inventory + 530 bank = 559 copies; no retirement or payout.

Staging (iqfmmpvwanvvmxcftfxw): read-only synthetic CTE projection exercised empty stock (0 credit), bank-only stock (1 × 80), mixed locked/favorited stock (3 inventory + 7 bank = 800 credit), preservation of unrelated Copper Ore and zero eligible stacks after projected removal. Three fixture cases passed. This is not an implemented migration, durable receipt, real state write, concurrent retry or transaction rollback test.

Still blocked: large authoritative gameplay source returned empty again, so exact server drop and sell semantics, all issuance paths, storage ownership and appropriate gold destination, final material dependency clearance and durable atomic receipt migration remain unresolved. No production mutations or staging writes were made. Do not release or execute based on the provisional total; repeat live counts under the authoritative transaction and complete the missing checks.

## Implementation preparation — 2026-11-24

Added a review-only executable compensation projection (`tools/material-retirement-review.mjs`). Seven grouped fixture checks passed when run in the review tool: 850 wings at 80 gold, preservation of unrelated Runebound Core and input state, both explicit bank routing alternatives, zero-value replay, rejection of late issuance after an existing receipt, invalid routing/stack inputs and overflow. These are pure fixtures, not proof of database atomicity, production idempotency or a verified bank credit destination. Added a read-only full-checkout exact-reference scanner and dedicated CI workflow to inspect oversized source/generated files. CI results remain pending. The scanner output requires manual classification and cannot alone clear indirect or future dependencies. No retirement allowlist is activated; no actual inventory mutation, receipt, gold credit or deployment has taken place.

## Full-checkout findings and broader screening — 2026-11-24, 11:41 CET

Exact head a9fcc93b50e535d2898a713fd5866743c5e65f5b: Material retirement review [run 45374487497](https://github.com/elroynbenjamins/Veldryn/actions/runs/45374487497) passed. The 100 exact references across 13 files include old V27/V29/V30 exact recipe catalogs (Echo Membrane and regional combat requirements), V25 recipe source and resource map (canonical key asterfall.echo_bat_wing, historical item ID ITEM_0077), current mobile item/drop definitions, both generated Edge bundles and original reward-gift catalog seed. Earlier limited text checks missed these dependencies. The first scan found no exact wing-name match in the V33 catalog but did not search historical aliases; it does not settle reachability or retirement safety. Echo Bat Wing is now held as dependency-unresolved, not a cleared candidate. Do not remove or compensate its stock. Historical art/localization definitions are not consumption evidence.

The mobile core run 45374487474 failed one of 434 selected checks: localization-social.mjs reports an unknown Guild Tokens key in GuildRaidEncounter.tsx. That file was not changed by this PR. Mobile UX, unique forged equipment and gem/dungeon workflows passed on the same head. Do not claim the entire suite is green. The new expanded audit scans all resolved ITEMS, RECIPES (including imported equipment/cross-profession recipes), MONSTERS, gathering/herb nodes and known companion consumption labels, reports screening candidates, and independently checks the historical alias and processed name in V27/V29/V30/V33 catalogs. It deliberately never classifies a missing match as retirement approval. A dedicated CI step runs this audit and the resource-codex regression test; the new results are pending. Enhancement/guild/quest/event/hidden 2.0 reachability and admin gift catalogue still require reconciliation. Keep production unchanged.

## Resolved catalogue results and protection reconciliation — next passes

Exact head a9594ad69014b823ef8e71c8b5be253c5c3a80ee, [Material retirement review run 45377346164](https://github.com/elroynbenjamins/Veldryn/actions/runs/45377346164), passed the expanded runtime registry audit and the targeted Resource Codex regression. Resolved material count: 270 (supersedes the 75 literal-base screening scope). 18 obtainable/produced materials lacked ordinary RECIPES inputs and companion-use labels in this screen. This is a bounded screen, not a complete all-source audit. Reconciled these 18 using additional source evidence:

| Screened group | Count | Classification | Evidence |
|---|---:|---|---|
| Unrefined G1 gems (might, iron, ward, precision, keen, swift, potent) | 7 | Protect | Raw gem IDs consumed by dynamic gemRefineRecipeV1; not ordinary RECIPES |
| Guild-only construction materials | 8 | Protect planned use | GUILD_CONSTRUCTION_BLUEPRINTS consumes timber, keystone, rivets, hinges, bannerweave, dye, wax and oil; definitions explicitly require SQL release flags and verified benefits, so no claim that all are spendable live |
| Radiant Catalyst | 1 | Protect | GEM_COMBINE_COSTS_V1 G4→G5, Enchanting 60; GEM_REFINE_COSTS_V1 G5, Enchanting 62 |
| Tempering Core | 1 | Protect | equipment-enhancement.ts consumes quoted core quantity |
| Echo Bat Wing | 1 | Hold | Current resolved RECIPES has zero input uses, but legacy equipment route reachability unresolved |

EVENT_BONDBLOOM is also protected (Veil Hound, Hollow Knightling and Lantern Keeper ascensions from resolved companion registry), superseding the earlier hold. The eight regional mapping-only resources remain held separately because this particular screen found no ordinary source for them; absence from the candidate list does not clear them.

Alias-aware scan: V27, V29 and V30 each contain 20/1701 matching recipes; V33 contains 0/1620 matching recipes for the wing, ITEM_0077, or Echo Membrane. Current mobile resolved recipe catalogue also has zero exact ECHO_BAT_WING consumers. Legacy code declares a V25 ITEM_0077 mapping and exports V27 exact recipe gate functions; check actual call sites and production route reachability before treating these as archived. Original gift catalogue seed still names the item, so grant closure must be verified separately. Scanned six specific hidden EQ2 material/manifest files at PR #1713 head 31d0469707e12ffe9721ffada19d90e1c2428249, finding no direct wing, ITEM_0077 or Echo Membrane references. Also checked changed patches of hidden resource sink PR #1683 for these names with no matches. Neither check establishes complete future clearance; aliases/new crafting branches/T5–T9 remain a gate.

Implemented additional structured audit checks for dynamic gem recipes, catalysts, enhancement cores and draft guild construction consumers, and added explicit legacy/current recipe call-site reporting to the checkout scan. These new changes have not yet completed CI. The previous provisional 68,000 gold remains hypothetical; no retirement approved, no player data modified. Do not activate any hidden 2.0 work.

## Legacy route, reward closure and atomic transaction preparation — passes 3–5

[Material retirement CI 45380569193](https://github.com/elroynbenjamins/Veldryn/actions/runs/45380569193) on head 3bfe29bc0f1c315965c98db95ec05788fb9d3e67 passed. It verified 270 materials, 18 screening flags, 17 protected special/planned consumers and exactly one unresolved flag (Echo Bat Wing). Of 26 legacy/current exact recipe route references, none called V27 exact crafting gates from inspected gameplay/co-op entrypoints or bundles; references were definitions and tests, plus V25 resolver wiring in its historical module. This supports archival status but is not a proof for every deployed route. V33 and current resolved RECIPES remain zero exact/alias consumers.

Production read-only check: one matching admin gift catalogue entry, zero matching gift campaigns, unclaimed inbox/co-op/party rewards or equipment bindings for ECHO_BAT_WING/ITEM_0077 (including display-name matches for JSON). Future admin grants must be disabled as part of retirement. Historical migration seed stays intact. Added tools/preview-echo-bat-wing-source-closure.mjs: requires one exact Echo Bat drop entry and prints its deletion patch without touching source, ordinary gold or other loot. It also specifies closure of gift issuance and regeneration of both Edge bundles. No actual reward sources closed yet.

Verified canonical server-shared game.ts sellItem/sellBankItem and itemVendorSellGold: non-equipment materials retain authored price; inventory proceeds go to character.gold, bank proceeds to bank.gold. Thus earlier provisional 850-copy stock estimate splits 11,440 carried Gold and 56,560 Bank Gold. Deployed bundle/version parity and refreshed stock counts remain required. Read live commit_online_game_server_v1/load_online_game_server_v1 definitions: state revision, account advisory lock, wallet comparison and receipt mechanisms are available; gameplay currently calls commit_online_game_guild_pve_v1 wrapper. Do not bypass the existing authority or assume the wrapper behaves identically without verification.

Added isolated PG17 transaction prototype in backend/supabase/review/material-retirement-atomic-pg17.sql, with fixture-only tables, account lock, revision and wallet check, closed-issuance gate, full-value location-specific credit, exact protection flag cleanup, receipt and notice, rollback and replay/late-issuance tests. CI uses disposable PostgreSQL without linked database credentials, rolls back test schema, and is pending. It is not a deployable migration or verified integration with real player storage; multi-character custody, offline settlement, live reward issuance closure, actual notice schema/visibility and production authorization remain unresolved. No production writes, no staging mutations, no actual conversion or deployment. Keep this draft gated.

## Real-schema integration review — pass 6

Confirmed actual roster custody in account-roster.ts and GameState: otherCharacters contains each inactive inventory and overflow; bank is shared at root. The committed SELECT-only preflight (backend/supabase/review/material-retirement-preflight-v1.sql) ran on production: 5 accounts, 0 storage/wallet blockers in this bounded check, 3 accounts with inactive rosters, 143 active inventory wings + 707 shared bank wings, no matching inactive/overflow stock or ITEM_0077 aliases, projected 11,440 carried and 56,560 bank Gold; one open gift catalogue source. A recursive exact-value path check found only five stock references and five historical settings.seenItemIds references; keep seen history intact. Earlier count of multiple saved character rows did not account for nested otherCharacters. Verified production commit_online_game_guild_pve_v1 takes party-account advisory lock and calls commit_online_game_server_v1/v2; revision and wallet authority are respected.

Added production-shaped review transaction backend/supabase/review/material-retirement-schema-transaction-v1.sql using actual table names and receipt schema, account lock, revision increment, wallet synchronization, exact stock cleanup, conservative unexpected custody/reference checks, replay guard and separate bank credit. It is deliberately disabled by a constant false gate, rolls back, and is outside migrations. A CI-only SQL generator builds a disposable schema fixture, enables the local copy only, runs conversion twice, tests preservation of inactive inventory and seen history, and rolls back. The prior exact-head PG17 run was still queued when checked; new CI results remain unverified. No production or staging writes.

Real inbox constraint allows party/guild/dungeon/gift only; do not invent a new source_kind or misuse claimable attachments. Notification integration remains missing in the production-shaped draft (prototype notice tests are not proof of real inbox support). Actual closure of gift and monster issuance, rebuilt deployed bundles, offline/queued reward and future-use clearance, schema-clone tests, concurrent execution verification and inbox delivery must precede any executable migration. No retired material IDs approved for live mutation.

## Transaction verification and source closure — passes 8–10

Exact head 5f88a125fefd82a39e72c7c66d332b67c6b83e8f: [Material retirement review CI 45383127469](https://github.com/elroynbenjamins/Veldryn/actions/runs/45383127469) passed both PostgreSQL jobs. Verified disposable PG17 transaction rollback, source gate, revision conflict, full-value split, protected stock, lock/favorite cleanup, receipt/notice fixture, replay, late issuance; production-shaped schema fixture verified shared bank and inactive roster preservation plus wallet and receipt replay. Mobile UX, unique equipment and gem/dungeon checks passed; mobile core remains red (inspect latest failure before release).

Added real-schema notice insertion using the existing permitted 'gift' history source_kind, unique material-retirement source_key, empty attachments and claimed_at already set in the same atomic transaction. No new claimable Gold attachment, no second payout; existing claim endpoint returns alreadyClaimed for claimed rows. Notice title/body explain the actual quantity and carried/bank credits. The design intentionally uses Claimed history, not an unread Inbox badge or push notification; English server-authored notice matches current gift mail conventions. Tests now assert one history row and no claimable attachments. This is a review transaction, not production code or an activated migration.

Added guarded gift catalogue closure review SQL: freeze catalogue/campaign/inbox writes during closure, block pending campaigns or unclaimed rewards for the item/alias, delete only matching catalogue entries, preserve historical campaigns and receipts. Fixture seeds both wing and protected Runebound Core, exercises the closure twice then runs compensation twice. Added disposable PR checkout source closure test: exact single Echo Bat Wing entry removal, rebuild both canonical Edge bundles, check parity and absence of exact wing drop; no source changes persisted, deployment or branch push. The guard refuses non-review contexts. New CI pending. Real closure requires a reviewed release sequence with actual regenerated artifacts, deployment confirmation and concurrent/queued/offline grant authority reconciliation. No production or staging writes, no confirmed retired IDs, no 2.0 activation.

## Concurrent compensation and offline settlement — passes 11–12

Added genuine two-session disposable PostgreSQL test: fixture schema and gift closure are committed in the isolated retirement_fixture database, first transaction acquires the account advisory lock and holds it briefly, second independent psql session attempts the same retirement, both complete, final assertions check exactly one receipt and already-credited notice, correct wallet split, revision and unrelated inventory preservation. Generator retains default rollback-only single-session mode and checks the disposable database name before each transaction. Not a live concurrent gameplay integration test.

Inspected shared executeGameCommand: the existing saved activity is settled by claimActivity before ordinary commands; reward generation reads current MONSTERS drops, rather than preserving a historical drop table. Added synthetic saved Echo Bat hunt regression that actually settles kills with normal Gold, then repeats under the disposable checkout's proposed drop closure and checks no wing in reward items or inventory/bank/overflow. Also executes existing monster-drop-balance regression under closure. This is not proof of all offline or queued/co-op grants, nor of the live deployed version.

Latest pre-change run 45387697043 was still queued when checked. New concurrent and offline tests are committed but have not yet passed CI. The earlier verified PG17 run 45383127469 remains the last confirmed transaction evidence. No production or staging mutations, no source closure persisted, no executable migration, no compensation paid. All release gates remain.

## Staging parity and rollback verification — pass 13

Staging project iqfmmpvwanvvmxcftfxw was missing the existing reward inbox/gift subsystem while all public dependencies used by repository migration 20261003202408_reward_inbox.sql were present. Applied the exact checked-in migration to staging only as Supabase migration 20261124120517_sync_reward_inbox_v1_20261124. Production was not changed.

Post-migration readiness is true in staging and production. Staging contains zero Echo Bat Wing stock and one seeded admin gift-catalog entry. Ran the reviewed gift closure + production-shaped retirement transaction + postflight inside one explicit staging transaction with the review guards enabled only for that transaction, then forced ROLLBACK. Inside the transaction reconciliation reached ready=true. After rollback staging again had one wing gift-catalog row, zero retirement receipts and zero retirement notices, proving no retirement state persisted.

Security/health follow-up: staging health advisor returned no findings. Security advisor includes the existing informational "RLS enabled, no policy" pattern for private service-owned tables, including the newly synchronized reward tables. Direct privilege verification shows authenticated has EXECUTE only on reward inbox state/claim RPCs; reward_gift_admin_v1 is service_role/postgres only; private reward tables expose table privileges only to service_role/postgres. Treat the broad pre-existing advisor set separately from this material cleanup.

Production postflight baseline before release: 850 remaining items, one open gift catalogue row, zero pending inbox rewards, zero retirement receipts/notices, zero wallet mismatches, reconciliation false as expected before closure. Added explicit environment-readiness and postflight SQL plus a review-only release-sequence document. No production writes.

## Persistent source closure and comprehensive grant-surface gate — passes 14–16

The draft branch now persistently removes the exact Echo Bat Wing drop tuple from `apps/mobile/src/content/monsters.ts`. Echo Bat remains available with ordinary Gold 10 plus Wisp Dust and Oathglass Shard. The offline regression now tests the actual closed catalogue: a saved pre-closure Echo Bat activity still settles kills and ordinary Gold while never issuing or storing Echo Bat Wing. The source-closure tools are read-only regressions now; they no longer mutate the CI checkout.

Added `material-retirement-grant-surface-audit-v1.sql`. On both staging and production it currently returns exactly one row: `private.reward_gift_catalog_v1`, total 1, active/pending 1, marked as the expected pre-closure source. Exact-reference scans found zero current references across checked gift campaigns/inbox mail, co-op rewards, active party definitions/entitlements, dungeon shop, guild shop/supply, liveops definitions/drafts/instances, admin content/reward catalogues, remote config, expedition rewards, squad reward claims, and equipment craft queues. Production also currently has no market relations. This remains a bounded exact-reference audit; indirect bundle semantics still rely on the checked catalog/config surfaces and source review.

Expanded the production-shaped transaction to fail closed if any of those wider live surfaces acquires an Echo Bat Wing / ITEM_0077 reference before compensation. The disposable schema fixture now declares those surfaces and includes an unrelated Runebound Core dungeon-shop row, ensuring protected unrelated content does not trip the guard. Re-ran the expanded gift closure + transaction + postflight against staging inside an explicit rollback: reconciliation reached ready=true; after rollback the one wing gift row remained and retirement receipts/notices remained zero.

Deployment-order review found that `.github/workflows/supabase-deploy.yml` applies migrations before deploying Edge Functions when migrations are enabled. Consequently an executable stock-retirement migration must **not** ship in this source-closure PR. Added CI enforcement for that rule. Production cutover must first merge/rebuild/deploy functions-only, verify the new deployed bundle, re-run live gates, and only then ship compensation in a separate migration release. No production database writes or compensation have occurred.

## Production retirement completed — Echo Bat Wing

Production cutover completed after explicit approval.

- Source closure merged to main in PR #1721; Echo Bat retains Gold 10, Wisp Dust and Oathglass Shard.
- Generated gameplay/co-op Edge bundles were synchronized on main and deployed directly from the verified closed blobs.
- Production Edge versions after deploy: gameplay v73, coop v41.
- Final production preflight immediately before mutation: 5 affected accounts, 143 carried Wings, 707 bank Wings, 850 total, 0 blocked accounts, 68,000 Gold liability; only the admin gift catalogue remained as an issuance source.
- First live transaction attempt correctly rolled back on an unexpected saved-state reference. Investigation identified fractional `masteryMaterialRemainders.ECHO_BAT_WING` values (all below 1 item) on four active characters and one inactive character. These internal fractional carries are not owned items and received no Gold compensation.
- Retirement transaction was updated to remove only the retired mastery remainder keys from active/inactive characters while preserving all other mastery remainders. Postflight now also requires zero non-historical saved-state references.
- Exact production dry-run under ROLLBACK then passed: 850 Wings, 68,000 Gold, 5 receipts, 5 already-credited notices, zero wallet mismatches, zero unexpected references.
- Production transaction then committed atomically: gift catalogue closure + stock retirement + carried/Bank Gold credits + durable receipt + claimed-history notice.
- Final production postflight: remaining_quantity=0, open_gift_catalog_rows=0, pending_inbox_rewards=0, receipt_count=5, retired_quantity=850, credited_gold=68,000, notice_count=5, unexpected_state_references=0, claimable_notice_count=0, wallet_mismatches=0, database_reconciliation_ready=true.
- Compensation split: 143 inventory Wings -> 11,440 carried Gold; 707 bank Wings -> 56,560 Bank Gold.
- Final live grant-surface audit returned no active or pending Echo Bat Wing / ITEM_0077 grant sources; the only remaining references are the 5 claimed compensation history notices.
- Historical item catalogue identity and seen-item history remain intentionally readable. Durable `material_retirement_v1` receipts prevent accidental double compensation or silent reissuance.
