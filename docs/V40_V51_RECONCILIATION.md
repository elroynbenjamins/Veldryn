# V40–V51 cumulative reconciliation tracker

Source of truth:
- GitHub branch: `development/v52-ui-integration`
- Draft PR: #1 into `main`
- Cumulative implementation history: V40 through V51
- Current design decisions supersede older archive assumptions.

Status values: **reconciled**, **partial**, **deferred intentionally**.

| Pass | System | Reconciliation status |
|---|---|---|
| V40 | Goals / Working Toward | **reconciled**; character-bound planner is routed under Account → Progression & Tasks and saves through validated online commands |
| V40 | Profession Mastery | **reconciled** into the unified trusted long-term progression runtime |
| V40 | Bestiary 2.0 | **reconciled**; canonical monster/drop read model and Bestiary screen are routed |
| V40 | Region Completion | **partial**; weighted domain model and existing Regional Journal are present, but the generic completion presentation is not yet equally rich for every region |
| V40 | Advanced Idle Rules | **partial/reconciled core**; stop-only domain and character persistence are live, exact duration stops are enforced; other authored stop-condition kinds still need exact settlement-boundary enforcement before being exposed as presets |
| V40 | Activity / Saved Loadouts | **reconciled**; three character presets are visible on Character and Save / Apply / Delete use server-validated commands online |
| V40/V46 | Welcome Back progression summary | **reconciled**; real cold-start/foreground settlements feed the expanded return report |
| V41 | Weekly Hunt / Profession Orders | **reconciled**; trusted settlements advance account-wide orders, Monday 00:00 UTC reset, 2 Hunt + 2 Profession |
| V42 | Adventurer's Journal | **reconciled** and routed |
| V42 | Titles | **reconciled** with Journal/profile identity |
| V42/V43 | Personal Records (33) | **reconciled**; actual record values render in Journal with dropdown category filtering |
| V43 | Public profiles/showcases | **partial**; visual profile now uses real skin/background/border/pet/title and record preview, while the extended online privacy/bio/showcase persistence still needs final integration with the existing production profile authority |
| V43 | World milestone feed | **reconciled**; real Supabase feed screen is routed with a truthful empty state and no fabricated players |
| V44 | Guild Hall | **reconciled**; domain/migration + online Hall panel + dedicated Overview / Hall / PvE / Roster / Customize host sections |
| V45 | Cross-Skill Discoveries | **reconciled** and visible on Skills |
| V45 | Collection Sets | **reconciled** and visible in Collections, using canonical ownership projections |
| V46 | Rare Idle Discoveries | **reconciled engine/presentation**; history renders in Collections; discovery pools stay intentionally disabled until canonical unique reward IDs are authored |
| V46 | Expanded Welcome Back | **reconciled**; rare finds, skill/mastery changes, Weekly Orders, milestones, stop reasons and overflow warnings render on return |
| V47 | Launch binding/readiness | **reconciled and CI-validated** against current content |
| V48 | Guest auth | **reconciled**; real Supabase anonymous Guest button exposed and upgrade path retained |
| V48 | Chat movable/keyboard safe | **reconciled** |
| V48 | Safe bottom navigation | **reconciled** with Android system-navigation-aware bottom inset |
| V48 | Boss/dungeon balance | **reconciled contracts/reward tuning**, backend balance regression passes |
| V49 | Inventory/Crafting/Recruitment concepts | **largely reconciled**; Bag/Crafting, item detail/preview, dropdown filters and recruitment filter modernization are live; remaining recruitment submode presentation still needs final screen-by-screen visual QA |
| V50 | Generic event framework | **reconciled core/host**; runtime modules, grace/priority metadata, Event Shop terminology and generic hero fallback are live; future event asset/content IDs remain authoring work |
| V50 | Pet/Companion concept layouts | **partial**; Pet Bonus overview is routed, existing companion systems are retained, final Companion Training/Expedition visual merge still needs screen QA |
| V51 | Primary Character/Skills/World/Account UI | **largely reconciled**; canonical five-tab nav, grouped Account, dropdown filters, safe areas and notification routing are live |

## Hard reconciliation rules
1. No player Market runtime.
2. Offline Reserve remains **24h base / 36h absolute maximum**.
3. Treasure Trails and server-wide community campaigns remain deferred.
4. Existing production-shaped server authorities win over prototype archive stores where both implement the same domain.
5. Missing archive features are adapted to current canonical content IDs instead of importing placeholder IDs.
6. No client-authored achievement, record, weekly-order, rare-discovery, guild or reward completion.
7. No parallel ownership database for Collections.
8. Live Dungeon composition remains **1 Tank / 2 Damage / 1 Support**.

## Completed directly on the V52 branch
- Removed retired player Market runtime helpers/tests/seeds; retained historical migration lineage and added a forward cleanup migration.
- Canonicalized permanent navigation to Character / Skills / World / Inventory / Account; legacy `More` remains compatibility-only.
- Added system-navigation-safe bottom padding and notification badge primitives.
- Friend-request path: Account → Friends → Requests.
- Claimable event reward path: Account → Events.
- Recruitment, Inventory, Skills and World use compact dropdown/sheet filters rather than permanent filter-button walls.
- Real Supabase anonymous Guest login is exposed.
- Chat overlay is draggable, translucent and keyboard-avoiding.
- Guild customization supports 8 banner/emblem IDs, border, nameplate and motto with leader/officer server persistence.
- Guild Hall is separated into a real Hall host section instead of being stacked into one long guild page.
- Unified V40–V46 trusted settlement path updates Mastery, Weekly Orders, Journal/Records, Cross-Skill Discoveries, Collection Sets and Rare-Discovery state.
- Working Toward and Idle Rule preferences are character-bound and server validated.
- Exact duration Idle Rules stop settlement at the authored boundary and do **not** alter Offline Reserve.
- Saved Loadouts are online-safe server commands rather than local-only state mutation.
- Expanded Welcome Back is connected to actual startup/foreground settlements.
- World Milestones shows real public events only; an empty world remains visibly empty.
- Generic V50 event module metadata is carried through Supabase → runtime → save state → Event host.
- Branch CI validates mobile core/full TypeScript, cumulative V40–V50 tests, backend typecheck/build/production smoke and V48 balance.

## Validation baseline
Latest successful V52 reconciliation CI at branch head:
- mobile core typecheck: **PASS**
- cumulative mobile/core tests: **PASS**
- full mobile TypeScript: **PASS**
- backend typecheck/build/production smoke: **PASS**
- V48 balance reconciliation: **PASS**
- V40 preference/loadout command test: **PASS**
- Offline Reserve assertions: **24h base / 36h max**
- V47 content audit: 9 classes, 8 regions, 502 items, 32 monsters, 414 recipes and hundreds of current Weekly Order candidates
- expected warning only: V46 rare-discovery pools remain disabled until canonical unique rewards are authored

## Remaining reconciliation / pre-merge work
1. Finish exact enforcement for the non-duration Advanced Idle Rule conditions before exposing those presets.
2. Finish generic Region Completion presentation for all regions.
3. Reconcile V43 extended online profile privacy/bio/showcase settings with the existing production profile authority.
4. Final visual QA of V49 recruitment submodes and V50 Companion Training/Expeditions.
5. Commit generated guild PNG assets into real runtime asset paths when binary GitHub upload is available.
6. Run real Supabase migration/RLS transaction tests against the project.
7. Run Expo Android/iOS device QA, especially safe areas, keyboard/chat dragging and bottom navigation.
8. Keep PR #1 Draft until those checks are complete.
