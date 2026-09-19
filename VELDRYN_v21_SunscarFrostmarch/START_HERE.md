# START HERE — VELDRYN v21

This is a merge/implementation pack for **Sunscar gameplay completion + Frostmarch Region III foundation**.

## Most important merge rule
Your **current local VELDRYN repository is authoritative**. It may contain unpushed work based on v16 and later packs. Do not replace it with this reference source. Inspect current domains, keep newer local behavior, and merge forward only what is missing.

## Dependency
This ZIP contains `dependencies/VELDRYN_v20_LiveDungeonSunscar.zip`. v20 contains v19, and the dependency chain continues backwards. You do not need to upload/merge historical ZIPs one-by-one when Codex is given this package.

## Scope
1. Complete Sunscar's gameplay depth without authoring regional equipment.
2. Promote Frostmarch roadmap content into implementation-ready Region III content.
3. Reuse v20 Live Dungeon + Q-Mode architecture for three Frostmarch co-op activities.
4. Extend the immutable versioned region registry with side quests/activities/achievements/collections/weather/contracts/boss mastery.
5. Add an active-region-version pointer so published content can be switched or rolled back safely.
6. Add Frostmarch mobile World/Journal surfaces.
7. Register schema-driven Control Center activation/rollback commands.

## Equipment boundary
**Do not implement the old Sunscar/Frostmarch regional weapons, armor or set rows from the design spreadsheets.** The generic partial set-bonus framework exists, but actual regional gear is waiting for the dedicated expanded-stat equipment budget/rework pass.

## Removed systems
- There is no player Market.
- Do not restore Guild Procurement.
- Do not restore Hybrid Queue or Live Echo autofill.

## Recommended merge order
If the local repository lacks prior foundations, merge missing dependencies in sequence before v21. If a dependency is already implemented, skip its duplicate patch and preserve the current implementation.

Then apply v21 migration `20260914_034_region_depth_frostmarch_v21.sql` only after v20 region registry + v17.3 Control tables exist.

Read next:
- `CODEX_INSTRUCTIONS.txt`
- `SUNSCAR_GAMEPLAY_COMPLETION_V21.md`
- `FROSTMARCH_REGION_V21.md`
- `REGION_CONTENT_PIPELINE_V21.md`
- `SETTLEMENT_WIRING_V21.md`
