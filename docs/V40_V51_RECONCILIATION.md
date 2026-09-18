# V40–V51 cumulative reconciliation tracker

Source of truth for this audit:
- GitHub branch: `development/v52-ui-integration`
- Cumulative implementation archives: V40 through V51
- Current design constraints supersede older archive assumptions.

Status values: **present**, **partial**, **missing**, **reconciled**, **deferred intentionally**.

| Pass | System | GitHub before V52 audit | V52 action |
|---|---|---:|---|
| V40 | Goals / Working Toward | missing | importing domain + host adapter |
| V40 | Profession Mastery | partial (monster mastery exists, profession mastery does not) | importing profession mastery separately |
| V40 | Bestiary 2.0 | missing | importing projection over current monster/drop content |
| V40 | Region Completion | partial (regional journal exists) | reconcile with existing regional progress |
| V40 | Advanced Idle Rules | missing | import stop-only rules; must never extend Offline Reserve |
| V40 | Activity Loadout extensions | partial (saved combat/loadouts exist) | reconcile without replacing current loadout storage |
| V40 | Welcome Back progression summary | partial | reconcile with current reward popup/startup settlement |
| V41 | Weekly Hunt / Profession Orders | missing | import account-wide weekly layer |
| V42 | Adventurer's Journal | partial (Achievements already server-authoritative) | extend existing system; do not create a duplicate achievement authority |
| V42 | Titles | partial | reconcile with existing profile title/unlock fields |
| V42/V43 | Personal Records (33) | missing | integrate into existing profile/achievement server layer |
| V43 | Public profiles/showcases | present/partial | preserve current profile APIs and extend where needed |
| V43 | World milestone feed | missing | import after records/profile reconciliation |
| V44 | Guild Hall | missing | import on top of current Guild Projects |
| V45 | Cross-Skill Discoveries | missing | import per-character unlocks |
| V45 | Collection Sets | missing | integrate into existing Collections ownership sources |
| V46 | Rare Idle Discoveries | missing | import server-authoritative settlement hook |
| V46 | Expanded Welcome Back | partial | merge into current startup settlement/reward popup |
| V47 | Launch binding/telemetry | partial | reconcile canonical IDs and stale source conflicts |
| V48 | Guest auth | API present but UI missing | **reconciled in V52** |
| V48 | Chat movable/keyboard safe | partial | **reconciled in V52** |
| V48 | Safe bottom navigation | partial | **reconciled in V52** |
| V48 | Boss/dungeon balance | newer cumulative values not verified against GitHub | pending balance diff/test |
| V49 | Inventory/Crafting/Recruitment concepts | partial | Inventory/recruitment filter standard **started in V52**; deeper layout reconciliation pending |
| V50 | Generic event framework | partial; current repo is Harvestwake-specialized | pending generic rotation reconciliation |
| V50 | Pet/Companion concept layouts | partial | pending |
| V51 | Primary Character/Skills/World/Account UI | partial | Account canonical nav **started in V52**; deeper layout reconciliation pending |

## Non-negotiable reconciliation rules
1. No player Market runtime.
2. Offline Reserve remains 24h base / 36h absolute maximum.
3. Treasure Trails and server-wide community campaigns remain deferred.
4. Existing production-shaped server authorities win over prototype archive stores where both implement the same domain.
5. Missing archive features are adapted to current content IDs instead of importing placeholder IDs.
6. No client-authored achievement, record, weekly-order, rare-discovery, guild or reward completion.
7. Do not create parallel ownership databases for collections.
8. Keep strict Live Dungeon party roles: 1 Tank / 2 Damage / 1 Support.

## Current V52 integration already completed
- Dropdown/sheet recruitment filters.
- Dropdown party-board activity filter.
- Inventory filter sheet.
- Real Guest button for Supabase anonymous auth.
- Draggable/keyboard-avoiding chat overlay.
- Android system-navigation-aware primary nav padding.
- Primary-nav notification badge primitive.
- Friend request badge path Account → Friends → Requests.
- Canonical Account primary navigation route; legacy More remains compatibility-only.
- Guild visual customization catalog, local normalization and server-backed Supabase update RPC.
- Player Market runtime/helper removal plus forward cleanup migration.

## First reconciliation batch now in progress
V40/V41 progression primitives are being brought into the real mobile domain first:
- profession mastery,
- Bestiary projection,
- region completion,
- safe idle stop rules,
- weekly orders.

V42 achievements/titles will be merged into the existing server-authoritative achievement/profile architecture rather than copied as a second Journal service.
