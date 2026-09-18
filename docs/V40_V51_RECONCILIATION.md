# V40–V51 reconciliation audit

Reference source: `VELDRYN_v51_Primary_Navigation_UI_Modernization_Cumulative.zip`  
Target: `development/v52-ui-integration`

Status legend:
- **Reconciled** — production-oriented equivalent is now committed to the GitHub branch.
- **Partial** — useful real-repo integration exists, but some UI/server binding or QA remains.
- **Pending QA** — code is reconciled but has not yet been executed through the full Expo/backend/Supabase suite.

| Pass | Scope | Current branch status | Notes |
|---|---|---|---|
| V40 | Goals, profession mastery, Bestiary 2.0 projection, region completion, stop-only idle rules, existing loadouts, Welcome Back foundations | **Reconciled / Pending QA** | Added current-repo projections/engines. Bestiary owns no duplicate progress. Idle rules cannot auto-travel or chain. Existing loadouts remain canonical. |
| V41 | 2 Hunt + 2 Profession Weekly Orders, Monday UTC rollover, account-wide progress, idempotent rewards | **Reconciled / Pending QA** | Added deterministic current-content candidates, private Supabase state/receipts and goal/idle/region projections. Weekly Orders never affect permanent Region Completion. |
| V42 | Adventurer's Journal, 40 long-term achievements, 8 Grandmaster titles, records | **Reconciled / Partial UI** | Exact 40/8 catalogue imported; real Journal route added. Existing claimable Achievement server remains intact rather than being overwritten. |
| V43 | Public profiles, showcases, world milestone feed, 33 records | **Reconciled / Partial host binding** | Exact 33 record catalogue added; Guild-only privacy/feed opt-out/showcase validation and feed persistence added. Existing profile server remains canonical for its current surface. |
| V44 | Guild Hall 1–20 + six facilities | **Reconciled / Pending UI/server service binding** | Domain + persistence added on top of existing Guild Projects. Hall Progress is non-spendable; Training/Workshop cap +0.50%; Expedition Board cap +2 choices. |
| V45 | Cross-skill discoveries + collection sets | **Reconciled / Pending grant-pipeline binding** | Seven discoveries safely map to current skill IDs. Current item IDs used for initial Collection Sets; no second ownership DB. |
| V46 | Rare idle discoveries + expanded Welcome Back | **Reconciled engine / Content binding intentionally deferred** | Persistent time buckets/pity added. No pool enabled until a real current reward ID is authored. Welcome Back report supports skills/mastery/goals/orders/finds. |
| V47 | Content binding / launch config / validation | **Reconciled / Pending execution** | Validator uses current 9 classes, 8 regions and current item/monster/recipe IDs; does not import stale spreadsheet IDs. |
| V48 | Safe-area UI, badges, chat keyboard/drag, guest auth, dungeon balance | **Partial / substantially reconciled** | Guest button, draggable keyboard-safe chat, nav safe-area/badges and V48 reward tuning are in. Current-repo boss/dungeon simulation still needs execution against full runtime. |
| V49 | Inventory/Crafting/Recruitment concept layouts | **Partial / host-integrated** | Inventory now has Bag + Crafting using the same canonical craft action; Inventory and Recruitment filters are dropdown/sheet based. Full compare/detail visual pass remains. |
| V50 | Generic event framework, event rewards, pet/companion layouts, global filter standard | **Partial / framework reconciled** | Generic rotating-event engine + metadata migration added; Frostfall/Veilbreak/Starfall templates remain disabled until canonical IDs exist. Community module explicitly deferred. Event “Market” UI renamed Event Shop. Pet/Companion concept layout reconciliation remains. |
| V51 | Character/Skills/World/Account modernization + notification hierarchy | **Partial / host-integrated** | Account is canonical fifth tab, grouped Account screen added, Journal/Bestiary routed, Inventory/Skills/World use dropdown filters, friend-request badge routes Account → Friends. Character and deeper sub-screen visual polish remains. |

## Reconciled hard constraints
- Player Market runtime removed; historical create migration remains only for lineage and is followed by a forward cleanup migration.
- Offline Reserve remains 24h base / 36h absolute maximum.
- Persistent Parties remain 1–4.
- Contracts remain asynchronous Combat/Skilling/Mixed with shared progress + minimum personal contribution.
- Live Dungeon composition remains exactly 1 Tank / 2 Damage / 1 Support.
- Weekly Orders do not count toward permanent Region Completion.
- Advanced idle rules are stop-only and cannot auto-travel or chain activities.
- No fake world-feed/player activity at launch.
- Server-wide community event/campaign module is deferred pre-launch.
- Primary navigation is Character / Skills / World / Inventory / Account.
- Player-facing filters use compact dropdown/sheet patterns rather than permanent chip walls.

## Remaining reconciliation / QA
1. Wire V40–V47 server services into the current authoritative gameplay settlement pipeline and grant pipeline.
2. Add current backend read/update APIs for Journal/Profile extensions/Guild Hall where still only persistence/domain exists.
3. Reconcile V50 Pet Bonus / Companion Training / Companion Expeditions presentation onto the current companion runtime.
4. Finish V49 item compare/detail visual hierarchy and V51 Character/sub-screen polish.
5. Expand notification aggregation beyond friend requests to DMs, guild invites/applications, party invites and event reward counts.
6. Commit generated guild PNG assets into the runtime asset tree through a binary-capable Git workflow.
7. Execute mobile TypeScript/core tests, backend tests/build, Supabase migrations/RLS tests and native Expo Android/iOS QA.
8. Validate current-repository boss/dungeon seeded outcome bands before changing encounter stats.

## Automated validation
A branch/PR workflow now lives at `.github/workflows/v52-reconciliation.yml`. It runs mobile core/full TypeScript, the expanded core regression suite, backend typecheck/build, production/combat matrix smokes, the live-dungeon v20 tests, the V48 reward contract, and squad smoke tests. Supabase DB/RLS tests and native device QA remain separate manual gates.
