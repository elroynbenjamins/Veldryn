# VELDRYN Combat Companions V2

## Scope

This pass implements the active Combat Companion / Combat Unit progression system. It is intentionally separate from passive collectible Pets (`unlockedCosmeticPetIds` / `selectedCosmeticPetId`).

## Ownership and loadout

- Ownership and progression are account-wide.
- `character.equippedCombatCompanionId` is character-specific.
- One active companion per character.
- Roles are exactly `damage`, `tank`, `support`.
- Same-role equip is rejected by `canEquipCompanion` in mobile domain logic and by the backend authenticated application boundary.
- Save normalization safely clears stale/edited same-role loadouts.

Class role mapping:
- Tank: Ironwarden, Bastion, Dreadguard
- Support: Dawnkeeper, Stonecaller
- Damage: Wayfinder, Ravager, Hexweaver, Knife Dancer

Existing design-database Utility/Flexible Combat Unit tags are resolved to one fixed active role because the new active system permits exactly three roles. Utility units are Support. Oathglass Knightling is Support. Regional Champion identities receive a fixed role in data rather than runtime role switching.

## Rarity and power budget

| Rarity | Full-investment target | Max level |
|---|---:|---:|
| Standard | 100% | 20 |
| Rare | 109% | 25 |
| Elite | 112% | 30 |
| Prestige | 115.5% | 35 |

`targetPowerMultiplier` is applied once to the resolved companion contribution budget. Ability coefficients have their own level curves and are not multiplied again by rarity. Full-investment companion contribution remains capped at 12% of the encounter budget.

Old design-database rarities map as follows:
- Common / Uncommon -> Standard
- Rare -> Rare
- Epic -> Elite
- Mythic -> Prestige

## Level / Ascension

- New unlock: Level 1, Bond 1.
- Initial cap: 10.
- Ascension I at 10 -> cap 20.
- Ascension II at 20 -> Rare cap 25; Elite/Prestige intermediate cap 25.
- Ascension III at 25 -> Elite cap 30; Prestige cap 35.
- Mastery Chamber is required for Ascension III.
- Prestige at Level 35 may complete Prestige Mastery; Mastery Chamber is required.
- Standard ends at 20; Rare at 25; Elite at 30; Prestige at 35.

Routine direct leveling consumes Gold + Companion Essence. Combat use grants companion XP without consuming Essence. XP never banks past the current Ascension cap.

## Resources

New account resources:
- `companionEssence`
- `bondstones`

Fallen Knight currently demonstrates real source integration by awarding 40 Companion Essence + 1 Bondstone. Generic server/mobile reward hooks exist for dungeons, achievements, events, daily/weekly objectives and future companion content.

Ascension consumes Gold, Essence, Bondstones and the definition's origin material. All requirements are validated before any resource is deducted.

## Bond

Bond is 1-10 and advances only from real-use sources:
- battle
- boss
- dungeon
- companion objective
- future explicitly-approved activity

There is no Essence-to-Bond purchase path. Bond 10 unlocks the definition's Bond Trait. Bond Hall adds +5%, +10%, +15% Bond XP at levels 1-3.

## Sanctuary

Account-wide Sanctuary state supports:
- Training Ground (passive XP claim)
- Essence Basin (weekly Essence claim)
- Bond Hall (+5/+10/+15% Bond XP)
- Expedition Pens (data/model foundation only until the existing timed-mission framework is available in the full repository)
- Mastery Chamber (Ascension III / Prestige Mastery gate)

Normal progression never requires premium currency.

## Content

The existing Combat Units content family is used rather than creating a second companion catalog. `COMBAT_COMPANIONS` includes the 12 Asterfall Combat Units with their existing abilities/passives plus the regional Sunscar, Frostmarch and Ashlands Combat Unit identities. Regional ability numbers are conservative data-only foundations pending a dedicated balance/content pass.

Future units are created primarily by adding `CompanionDefinition` content rather than modifying central logic.

## Persistence / migration

Save schema is now v11.

Account state:
- `unlockedCombatCompanionIds`
- `combatCompanionProgress`
- `companionUnlockProgress`
- `companionEssence`
- `bondstones`
- `companionSanctuary`

Character state:
- `equippedCombatCompanionId`

Recognized legacy active-unit fields are migrated. Passive `ownedPetIds`, `unlockedCosmeticPetIds` and `selectedCosmeticPetId` are never treated as Combat Unit ownership.

A legacy owned Combat Unit without progression data receives Level 10 / Bond 2 as a non-destructive conversion head start. Existing supplied level/Bond data is preserved and clamped safely. Legacy equipped companions are revalidated and same-role selections are unequipped.

## Backend security / schema

Migration `20260929000000_combat_companions_v1.sql` adds account progression, account resources/Sanctuary and character loadout tables. Authenticated clients have owner-read projection only; writes are server-authoritative.

`CombatCompanionApplication.equip()` accepts only authenticated account identity, character ID, companion ID and request ID. It resolves the character class and owned companion list from the repository, then applies the server policy. Client-provided role/ownership authority is never accepted.

The reduced recovery source does not contain the repository's unchanged `loadout-snapshots.ts` implementation or the final HTTP/edge route adapter. Therefore the companion ID is not yet embedded into authoritative Live/Q-Mode frozen snapshots in this handoff. Codex must wire the existing full-repository snapshot adapter to the same server policy before enabling companion effects inside online co-op. This is an integration hook, not a second companion system.

## UI

`CombatCompanionPanel` on Character shows:
- icon/role glyph hook
- name, rarity label/marker, role, usable roles, origin
- lock/equip/same-role state
- Level / max / current Ascension cap / XP
- Bond / Bond XP / Bond Trait
- active and passive descriptions
- level-scaled active value and next-level value
- next level / Ascension costs
- Sanctuary resources and upgrade controls

Rarity is represented by text + symbols as well as color, so the distinction is not color-only.

## Verification

Dedicated mobile companion suite covers all 20 requested acceptance areas plus passive-Pet migration separation and data-driven unlock reconciliation.

Backend policy/application smoke tests cover same-role rejection, ownership, cross-account rejection, valid cross-role equip, hard rarity level caps, progression sanitization and persisted-loadout cleanup.
