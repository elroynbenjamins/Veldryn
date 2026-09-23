import {ImageSourcePropType} from 'react-native';
import {MonsterDef} from '../content/monsters';
export const monsterPortraits:Record<MonsterDef['id'],ImageSourcePropType>={
 MOSS_RAT:require('../../assets/monsters/moss_rat.png'),FIELD_WISP:require('../../assets/monsters/field_wisp.png'),ROADSIDE_BOAR:require('../../assets/monsters/roadside_boar.png'),SILVERFIN_SWARM:require('../../assets/monsters/silverfin_swarm.png'),IRONWOOD_WOLF:require('../../assets/monsters/ironwood_wolf.png'),
 VENOM_WEAVER:require('../../assets/monsters/venom_weaver.png'),THORNLING:require('../../assets/monsters/thornling.png'),BRIAR_HUSK:require('../../assets/monsters/briar_husk.png'),MIRE_HERON:require('../../assets/monsters/mire_heron.png'),FOREST_TROLL:require('../../assets/monsters/forest_troll.png'),
 ANCIENT_TREANT:require('../../assets/monsters/ancient_treant.png'),CAVE_SKITTER:require('../../assets/monsters/cave_skitter.png'),IRONBACK_MOLE:require('../../assets/monsters/ironback_mole.png'),ECHO_BAT:require('../../assets/monsters/echo_bat.png'),RUNEBOUND_MINER:require('../../assets/monsters/runebound_miner.png'),
 GLOAM_MITE:require('../../assets/monsters/gloam_mite.png'),LANTERN_WRETCH:require('../../assets/monsters/lantern_wretch.png'),DROWNED_PILGRIM:require('../../assets/monsters/drowned_pilgrim.png'),OATHBOUND_SQUIRE:require('../../assets/monsters/oathbound_squire.png'),BANNER_SHADE:require('../../assets/monsters/banner_shade.png'),
 FALLEN_SENTINEL:require('../../assets/monsters/fallen_sentinel.png'),OATHGLASS_REVENANT:require('../../assets/monsters/oathglass_revenant.png'),FALLEN_KNIGHT:require('../../assets/monsters/fallen_knight.png'),
};

export function monsterPortraitSource(monsterId:string){return monsterPortraits[monsterId];}
export function hasMonsterPortrait(monsterId:string){return !!monsterPortraitSource(monsterId);}
