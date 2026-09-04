# Character pack v4 — first implementation slice

Sources: `VELDRYN_Start_Character_Equipment_Design_v5.xlsx` and the supplied Character System Codex Pack v4, runtime assets v1.

Implemented:
- All nine classes use supplied starting-loadout front/back PNGs, male/female.
- Creation can switch between the existing class emblem and actual starting appearance.
- Body presentation is additive optional save data; older saves default to male without replacing equipment, inventory, or progress. Schema remains v5 because the field is backwards-compatible.
- New characters receive one primary weapon. Previously released item IDs remain intact for existing saves.
- Hexweaver is Damage and Stonecaller is Support per the new runtime map.
- Creation guards against overwriting an existing character.

Source discrepancy: `Starting_Loadout_Crafting` has shifted class rows (including an unnamed final row). Use named mappings in `data/classes_runtime_map.json` and `data/starting_weapons.json`, corroborated by `Starter_Sets_Roadmap`, rather than copying the shifted table.

Provisional balance: new `basic_*` weapon identities reuse the previous primary-weapon numeric budgets. No replacement numeric budget is supplied by the runtime mapping. Bastion's tower shield occupies the engine's primary weapon slot. Legacy offhands remain owned; new characters no longer receive them. These budgets need a dedicated balance review.

Follow-up implementation: first-crafted-set recipes, crafting milestones, atomic set equip, and complete appearance states are now implemented; see `NOVICE_CHARACTER_SYSTEM.md`. Still pending: guest/account slots, online backend deployment, per-slot appearance composition, and hair/skin palette customization. Full renders have baked hair/skin. Mixed equipment uses a labeled emblem fallback instead of an inaccurate starting portrait.
