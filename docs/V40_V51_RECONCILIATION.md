# V40–V51 cumulative reconciliation tracker

Source of truth for this audit:
- GitHub branch: `development/v52-ui-integration`
- Cumulative implementation archives: V40 through V51
- Current design constraints supersede older archive assumptions.

Status values: **reconciled**, **partial**, **pending host integration**, **deferred intentionally**.

| Pass | System | Reconciliation status |
|---|---|---|
| V40 | Goals / Working Toward | **reconciled domain**, host surface pending |
| V40 | Profession Mastery | **reconciled** into trusted long-term progression runtime |
| V40 | Bestiary 2.0 | **reconciled**, real Bestiary screen routed |
| V40 | Region Completion | **reconciled domain**, regional host presentation remains partial |
| V40 | Advanced Idle Rules | **reconciled domain**, stop-only; editor/host surface pending |
| V40 | Activity Loadout extensions | **partial**; current saved-loadout system retained, V40 convenience hooks still need UI merge |
| V40/V46 | Welcome Back progression summary | **reconciled domain**, current popup still needs richer V46 presentation |
| V41 | Weekly Hunt / Profession Orders | **reconciled**; trusted settlements advance account-wide orders |
| V42 | Adventurer's Journal | **reconciled**, Journal screen routed |
| V42 | Titles | **reconciled with Journal/profile state** |
| V42/V43 | Personal Records (33) | **reconciled domain**, profile/Journal showcase rendering still partial |
| V43 | Public profiles/showcases | **partial**; existing production profile authority preserved |
| V43 | World milestone feed | **reconciled domain**, host feed surface pending |
| V44 | Guild Hall | **reconciled domain/migration**, Guild Hall host screen + live service wiring pending |
| V45 | Cross-Skill Discoveries | **reconciled domain**, Skills presentation pending |
| V45 | Collection Sets | **reconciled domain**, Collections presentation pending |
| V46 | Rare Idle Discoveries | **reconciled engine**; all pools intentionally disabled until canonical reward content exists |
| V46 | Expanded Welcome Back | **reconciled domain**, richer return UI pending |
| V47 | Launch binding/readiness | **reconciled and CI-validated** against current content |
| V48 | Guest auth | **reconciled**; real anonymous Guest button exposed |
| V48 | Chat movable/keyboard safe | **reconciled** |
| V48 | Safe bottom navigation | **reconciled** |
| V48 | Boss/dungeon balance | **reconciled contracts/reward tuning**, backend tests pass |
| V49 | Inventory/Crafting/Recruitment concepts | **partial**; filter standard and Inventory/recruitment host work started |
| V50 | Generic event framework | **reconciled domain/migration**, current Harvestwake screen still needs generic host conversion |
| V50 | Pet/Companion concept layouts | **partial**; Pet overview routed, companion concept host merge pending |
| V51 | Primary Character/Skills/World/Account UI | **partial**; Account is canonical fifth tab and badge/safe-area foundation is live; deeper screen layout merge pending |

## Hard reconciliation rules
1. No player Market runtime.
2. Offline Reserve remains 24h base / 36h absolute maximum.
3. Treasure Trails and server-wide community campaigns remain deferred.
4. Existing production-shaped server authorities win over prototype archive stores where both implement the same domain.
5. Missing archive features are adapted to current content IDs instead of importing placeholder IDs.
6. No client-authored achievement, record, weekly-order, rare-discovery, guild or reward completion.
7. No parallel ownership database for collections.
8. Live Dungeon party composition remains 1 Tank / 2 Damage / 1 Support.

## Completed directly on V52 branch
- Removed retired player Market runtime helpers/tests/seeds; historical migration retained plus forward cleanup migration.
- Canonicalized bottom navigation to Character / Skills / World / Inventory / Account; legacy `More` remains compatibility-only.
- Added Android system-navigation-aware bottom padding and notification badge primitive.
- Friend request path is visible from Account → Friends → Requests.
- Recruitment and Inventory filters now use compact dropdown/sheet UI.
- Exposed real Supabase anonymous Guest login.
- Chat overlay is draggable and keyboard-avoiding.
- Guild customization supports 8 banner/emblem choices, border, nameplate and motto, with local normalization and server-backed leader/officer persistence.
- Added unified V40–V46 trusted long-term progression settlement path for mastery, Weekly Orders, Journal/records, cross-skill discoveries, collection sets and rare-discovery state.
- Alchemy recipe content now has canonical `skillId: 'alchemy'`.
- Fixed stale regional Supabase progress type projection.
- Added branch CI for mobile core/full typecheck + reconciliation tests and backend typecheck/build/smokes.

## Validation baseline
Latest successful V52 reconciliation CI:
- mobile core typecheck: PASS
- cumulative mobile/core tests including V40–V50 reconciliation: PASS
- full mobile TypeScript: PASS
- backend typecheck/build/production smoke: PASS
- V48 balance reconciliation: PASS
- Offline Reserve assertions: 24h base / 36h max
- V47 content audit: 9 classes, 8 regions, 502 items, 32 monsters, 414 recipes, 452 current Weekly Order candidates
- expected warning only: V46 rare-discovery pools remain disabled until canonical unique rewards are authored

## Next reconciliation batch
1. V44 Guild Hall production host/service wiring.
2. V45 Cross-Skill Discoveries + Collection Sets presentation.
3. V46 expanded Welcome Back + rare-discovery presentation.
4. V50 generic Event Hub host conversion.
5. V49/V51 full modern layout merge for Character, Skills, World, Account, Crafting and remaining recruitment subscreens.
6. Generated guild PNG assets into real runtime asset paths.
7. Real Supabase migration/RLS validation + Expo Android/iOS device QA before PR merge.
