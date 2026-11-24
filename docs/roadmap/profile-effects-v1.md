# Profile effects ownership and equipment — draft integration

V3 effects are a separate profile cosmetic family. Ownership is account-wide in `account.unlockedProfileEffectIds`; the selected effect is character-scoped in `character.profileEffectId`. Matching borders never auto-equip or unlock their effect, and effects never imply border ownership.

Approved IDs:
- Gloamward — `effect_gloamward_wisps`
- Frostbound Chime — `effect_frostbound_winter_veil`
- Amberglass Loop — `effect_amberglass_ember_motes`
- Briarbound — `effect_briarbound_verdant_whispers`

The wardrobe model puts Effects between Frames and Pets and includes a free No effect choice. Locked effects point toward the future Cosmetics surface. No purchase or grant path is introduced by this pass.

The profile command validates account ownership before accepting a character effect. Online persistence and public projection still require the corresponding server pass before this branch can ship.
