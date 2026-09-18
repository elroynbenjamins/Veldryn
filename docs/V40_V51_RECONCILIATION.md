# V40–V51 reconciliation audit

Reference source: `VELDRYN_v51_Primary_Navigation_UI_Modernization_Cumulative.zip`
Target: `development/v52-ui-integration`

Status legend:
- **Present** — equivalent production code already exists in GitHub.
- **Partial** — related code exists, but the cumulative pass added meaningful missing behavior.
- **Missing** — no equivalent production subsystem is present.

| Pass | Scope | GitHub status | Reconciliation action |
|---|---|---|---|
| V40 | Goals, profession mastery, Bestiary projection, region completion, advanced idle rules, activity-loadout extension, richer Welcome Back | **Partial / Missing** | Preserve existing character loadouts + monster mastery, add missing goal/profession-mastery/region/idle/welcome-back projections without replacing canonical owners. |
| V41 | 2 Hunt + 2 Profession Weekly Orders, Monday UTC rollover, account-wide progress, idempotent rewards | **Missing** | Import pure generation/progress domain + server-owned persistence migration/service hooks. |
| V42 | Adventurer's Journal, expanded achievements, titles, personal records | **Partial** | Existing Achievements are present. Add missing Journal shell, title selection and expanded record catalogue without duplicating achievement authority. |
| V43 | Public profiles, showcases, world milestone feed, 33 records | **Partial** | Profiles exist; showcases/feed/expanded records need reconciliation with current profile server. |
| V44 | Guild Hall 1–20 + six facilities | **Missing** | Build on current Guild Projects. No new spendable guild currency. |
| V45 | Cross-skill discoveries + collection sets | **Missing** | Add per-character discovery engine and account-wide collection-set completion over canonical ownership. |
| V46 | Rare idle discoveries + expanded Welcome Back | **Missing** | Add server-side settlement discovery rolls/pity; do not create a second normal-loot engine. |
| V47 | Content binding / launch config / telemetry | **Partial** | Current repository has richer content than the old snapshot. Port only validation/binding concepts that still apply; do not overwrite canonical content. |
| V48 | Safe-area UI, badges, chat keyboard/drag, guest auth, dungeon balance | **Partial -> actively reconciled** | Guest button, chat, safe bottom navigation and badge primitives are now on V52 branch; balance still needs current-content validation. |
| V49 | Inventory/Crafting/Recruitment concept layouts | **Partial** | Inventory/recruitment filter pattern already being merged; remaining concept-layout structure still needs host reconciliation. |
| V50 | Generic event framework, event reward UI, pet/companion layouts, global filter standard | **Partial** | Current repo has Harvestwake event runtime. General rotation framework and remaining UI must be reconciled without reintroducing community-event assumptions pre-launch. |
| V51 | Character/Skills/World/Account modernization + notification hierarchy | **Partial** | Account is now canonical fifth tab on V52 branch; primary screen modernization remains to merge screen-by-screen. |

## Hard constraints during reconciliation
- Player Market remains removed. Historical migrations may remain for lineage only, followed by forward cleanup.
- Offline Reserve remains 24h base / 36h absolute maximum.
- Persistent Parties remain 1–4.
- Contracts remain asynchronous Combat/Skilling/Mixed with shared progress + minimum personal contribution.
- Live Dungeon composition remains exactly 1 Tank / 2 Damage / 1 Support.
- Weekly Orders do not count toward permanent Region Completion.
- Advanced idle rules are stop-only and cannot auto-travel or chain activities.
- No fake world-feed/player activity at launch.

## Import order
1. V40 foundations.
2. V41 Weekly Orders.
3. V42/V43 Journal/Profile/Records reconciliation.
4. V44 Guild Hall.
5. V45 Discoveries/Collection Sets.
6. V46 Rare Idle Discoveries.
7. V47 binding/validation.
8. V48 balance verification.
9. V49–V51 host-screen/UI reconciliation.
