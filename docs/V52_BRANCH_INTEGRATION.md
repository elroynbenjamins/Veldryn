# V52 development branch integration

Branch: `development/v52-ui-integration`

This branch is the staging line for the V49-V51 UI modernization and the next guild customization work. It deliberately stays separate from `main` until the integrated Expo app, backend contracts and Supabase migrations have been validated together.

## Hard rules carried forward
- Bottom navigation remains: Character / Skills / World / Inventory / Account.
- Player Market remains removed.
- Offline Reserve remains 24h base / 36h absolute maximum.
- Search + compact Filters/Sort controls are preferred; filter choices live in dropdowns/sheets rather than permanent chip walls.
- Notification counts/dots should lead to the exact actionable destination.
- Guest play uses a real anonymous account and can later be linked.
- Live dungeons keep 1 Tank / 2 Damage / 1 Support.

## Integration order
1. Modern filter/dropdown standard in existing production screens.
2. V49 Inventory, Crafting and Recruitment layouts wired into the real host routes.
3. V50 event framework plus Pet/Companion screens wired to real content IDs.
4. V51 Character, Skills, World and Account modernization.
5. Chat keyboard/safe-area and draggable overlay fixes.
6. Guest auth verification against the real Supabase project.
7. Guild customization: banners/emblems, profile frame, nameplate, and persistence.
8. Full Expo/native build + backend + Supabase/RLS validation.
9. Draft PR review, then merge only after QA.

## Started in first branch commit
- Recruitment filters moved into a modal dropdown sheet.
- Party-board activity filter collapsed into a single dropdown rather than permanent open buttons.
