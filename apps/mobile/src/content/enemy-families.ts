import {MONSTERS} from './monsters';

/** Authored, mutually exclusive enemy-type taxonomy. An ordinary hunt awards one
 * species mastery point and one family mastery point, never more than one family.
 * Orcs are predeclared for upcoming content but deliberately have no invented mobs.
 */
export const ENEMY_FAMILIES=[
  {
    "id": "UNDEAD",
    "name": "Undead",
    "description": "Revenants, wraiths, spirits bound to death and the oathfallen.",
    "monsterIds": [
      "CHOIR_DEFILER",
      "LANTERN_WRETCH",
      "DROWNED_PILGRIM",
      "OATHBOUND_SQUIRE",
      "BANNER_SHADE",
      "FALLEN_SENTINEL",
      "OATHGLASS_REVENANT",
      "BELLWRAITH",
      "LAKEBOUND_SPECTER",
      "ASHEN_REVENANT"
    ]
  },
  {
    "id": "HUMAN",
    "name": "Humans",
    "description": "Living mortal raiders, scouts, soldiers and spellcasters.",
    "monsterIds": [
      "DUSTVEIL_RUNNER",
      "PRISM_HEXER",
      "CROWN_EXECUTIONER",
      "RIME_BERSERKER",
      "RUNEBOUND_MINER",
      "DUNE_ORACLE",
      "SAFFRON_MARAUDER",
      "ROYAL_SANDGUARD",
      "ICEBOUND_RAIDER",
      "CHOIR_HUNTER"
    ]
  },
  {
    "id": "ORC",
    "name": "Orcs",
    "description": "Orc warriors and raiders. Reserved for future enemy content.",
    "monsterIds": []
  },
  {
    "id": "BEAST",
    "name": "Beasts",
    "description": "Natural predators, wildlife and monstrous animals.",
    "monsterIds": [
      "MOSS_RAT",
      "ROADSIDE_BOAR",
      "SILVERFIN_SWARM",
      "IRONWOOD_WOLF",
      "MIRE_HERON",
      "IRONBACK_MOLE",
      "ECHO_BAT",
      "GLASS_DUNE_STRIDER",
      "FROSTWOLF",
      "RIME_STALKER"
    ]
  },
  {
    "id": "VERMIN",
    "name": "Vermin",
    "description": "Arachnids, insects and smaller venomous swarms.",
    "monsterIds": [
      "FROSTNEEDLE_BROOD",
      "VENOM_WEAVER",
      "CAVE_SKITTER",
      "GLOAM_MITE",
      "SUNSCAR_SCORPION"
    ]
  },
  {
    "id": "NATURE",
    "name": "Natureborn",
    "description": "Living plants, treants and creatures of corrupted growth.",
    "monsterIds": [
      "THORNLING",
      "BRIAR_HUSK",
      "ANCIENT_TREANT",
      "SNOW_TREANT",
      "BLACKGLASS_MIRELING"
    ]
  },
  {
    "id": "CONSTRUCT",
    "name": "Constructs",
    "description": "Animated guardians, sentinels and artificial protectors.",
    "monsterIds": [
      "SANDPLATE_JUGGERNAUT",
      "GLASSBOUND_SENTINEL",
      "OBSERVATORY_KEEPER",
      "WYRMSPINE_GUARDIAN"
    ]
  },
  {
    "id": "ELEMENTAL",
    "name": "Elementals",
    "description": "Living elemental forces, embers and magical wisps.",
    "monsterIds": [
      "STORMGLASS_COLOSSUS",
      "FIELD_WISP",
      "CINDER_TITAN"
    ]
  },
  {
    "id": "SPIRIT",
    "name": "Spirits",
    "description": "Mirage-born noncorporeal entities.",
    "monsterIds": [
      "MIRAGE_SHADE"
    ]
  },
  {
    "id": "GIANT",
    "name": "Giants",
    "description": "Trolls and other massive living giants.",
    "monsterIds": [
      "FOREST_TROLL"
    ]
  }
] as const;
export type EnemyFamilyId=typeof ENEMY_FAMILIES[number]['id'];
export type EnemyFamilyDefinition=typeof ENEMY_FAMILIES[number];
const FAMILY_BY_MONSTER=new Map<string,EnemyFamilyDefinition>(
 ENEMY_FAMILIES.flatMap(family=>family.monsterIds.map(id=>[id,family] as const))
);
const ORDINARY_MONSTER_IDS=new Set(MONSTERS.filter(monster=>!monster.boss).map(monster=>monster.id));
export function enemyFamilyForMonster(monsterId:string):EnemyFamilyDefinition|undefined{
 return ORDINARY_MONSTER_IDS.has(monsterId)?FAMILY_BY_MONSTER.get(monsterId):undefined;
}
export function enemyFamilyById(id:string):EnemyFamilyDefinition|undefined{
 return ENEMY_FAMILIES.find(family=>family.id===id);
}
export function encounteredEnemyFamilies(ids:readonly string[]){
 return ENEMY_FAMILIES.filter(family=>family.monsterIds.some(id=>ids.includes(id)));
}
