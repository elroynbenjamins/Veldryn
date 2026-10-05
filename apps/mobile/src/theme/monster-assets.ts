import {ImageSourcePropType} from 'react-native';
import {MonsterDef} from '../content/monsters';
export const monsterPortraits:Record<MonsterDef['id'],ImageSourcePropType>={
 MOSS_RAT:require('../../assets/monsters/moss_rat.webp'),FIELD_WISP:require('../../assets/monsters/field_wisp.webp'),ROADSIDE_BOAR:require('../../assets/monsters/roadside_boar.webp'),SILVERFIN_SWARM:require('../../assets/monsters/silverfin_swarm.webp'),IRONWOOD_WOLF:require('../../assets/monsters/ironwood_wolf.webp'),
 VENOM_WEAVER:require('../../assets/monsters/venom_weaver.webp'),THORNLING:require('../../assets/monsters/thornling.webp'),BRIAR_HUSK:require('../../assets/monsters/briar_husk.webp'),MIRE_HERON:require('../../assets/monsters/mire_heron.webp'),FOREST_TROLL:require('../../assets/monsters/forest_troll.webp'),
 ANCIENT_TREANT:require('../../assets/monsters/ancient_treant.webp'),CAVE_SKITTER:require('../../assets/monsters/cave_skitter.webp'),IRONBACK_MOLE:require('../../assets/monsters/ironback_mole.webp'),ECHO_BAT:require('../../assets/monsters/echo_bat.webp'),RUNEBOUND_MINER:require('../../assets/monsters/runebound_miner.webp'),
 GLOAM_MITE:require('../../assets/monsters/gloam_mite.webp'),LANTERN_WRETCH:require('../../assets/monsters/lantern_wretch.webp'),DROWNED_PILGRIM:require('../../assets/monsters/drowned_pilgrim.webp'),OATHBOUND_SQUIRE:require('../../assets/monsters/oathbound_squire.webp'),BANNER_SHADE:require('../../assets/monsters/banner_shade.webp'),
 FALLEN_SENTINEL:require('../../assets/monsters/fallen_sentinel.webp'),OATHGLASS_REVENANT:require('../../assets/monsters/oathglass_revenant.webp'),FALLEN_KNIGHT:require('../../assets/monsters/fallen_knight.webp'),
};

export const REGIONAL_MONSTER_CELL=48;
export const REGIONAL_MONSTER_SHEET_SIZE=144;
export const regionalMonsterPortraitAtlas:ImageSourcePropType=require('../../assets/monsters/regional-monsters-v1.webp');
export const regionalMonsterPortraitCells:Readonly<Record<string,{column:number;row:number}>>={
 SUNSCAR_SCORPION:{column:0,row:0},DUNE_ORACLE:{column:1,row:0},GLASSBOUND_SENTINEL:{column:2,row:0},
 FROSTWOLF:{column:0,row:1},BELLWRAITH:{column:1,row:1},CHOIR_HUNTER:{column:2,row:1},
 BLACKGLASS_MIRELING:{column:0,row:2},CINDER_TITAN:{column:1,row:2},ASHEN_REVENANT:{column:2,row:2},
};
export function regionalMonsterPortraitCell(monsterId:string){return regionalMonsterPortraitCells[monsterId];}
export function monsterPortraitSource(monsterId:string){return monsterPortraits[monsterId];}
export function hasMonsterPortrait(monsterId:string){return !!monsterPortraitSource(monsterId)||!!regionalMonsterPortraitCell(monsterId);}
