# Character runtime integration

The active runtime mapping originated in the Character System Codex Pack v4 and `VELDRYN_Start_Character_Equipment_Design_v5.xlsx`. This note records compatibility decisions that remain relevant; it is not a competing design authority.

## Active decisions

- Body presentation is additive optional save data. Older saves default to male without replacing equipment, inventory, or progress.
- New characters receive one primary weapon. Previously released item IDs remain intact for existing saves.
- Hexweaver is Damage and Stonecaller is Support in the runtime role map.
- Character creation cannot overwrite an existing character.
- Named mappings remain authoritative where the historical `Starting_Loadout_Crafting` sheet had shifted class rows.
- Current basic-weapon identities retain the established numeric budgets until a dedicated replacement balance budget is approved.
- Bastion's tower shield occupies the engine's primary weapon slot. Legacy offhands remain owned, while new characters no longer receive them.
- First-crafted-set recipes, crafting milestones, and atomic set equip are implemented in `NOVICE_CHARACTER_SYSTEM.md`.
- Retired starting-loadout character art must not be restored. Character appearances use the accepted identity-aligned full skins and saved body presentation.

## Remaining work

- Complete guest/account character-slot production behavior.
- Validate online character/profile persistence end to end.
- Perform the dedicated starter-weapon balance review.
