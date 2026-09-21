import type {Drop} from '../../items/loot';
import {gemItemId,type GemGrade} from './gem-catalog-v1';

export type GemSourceKind='enemy'|'elite'|'regional_boss'|'dungeon_boss'|'contract'|'party_contract'|'live_coop_weekly'|'crafting';
export interface GemSourcePoolV1{id:string;kind:GemSourceKind;regionId?:string;families:readonly string[];grade:GemGrade;chance:number;pityAt?:number;recipeChance?:number;catalystChance?:number;}

export const GEM_SOURCE_POOLS_V1:readonly GemSourcePoolV1[]=[
 {id:'ZONE_006',kind:'enemy',regionId:'REG_002',families:['stat_might','stat_vitality','effect_opening_strike','effect_sustenance'],grade:1,chance:.0075},
 {id:'ZONE_007',kind:'elite',regionId:'REG_002',families:['stat_iron','stat_piercing','effect_predator','effect_retaliation'],grade:2,chance:.015,pityAt:60},
 {id:'ZONE_008',kind:'elite',regionId:'REG_002',families:['stat_precision','stat_potent','effect_ruin','effect_mercy','effect_opportunist'],grade:2,chance:.015,pityAt:60},
 {id:'ZONE_009',kind:'elite',regionId:'REG_002',families:['stat_swift','stat_ward','effect_flow','effect_benediction','effect_aegis'],grade:2,chance:.015,pityAt:60},
 {id:'ZONE_010',kind:'regional_boss',regionId:'REG_002',families:['effect_execution','effect_last_stand','effect_unyielding'],grade:3,chance:.03,pityAt:25,recipeChance:.02,catalystChance:.05},

 {id:'COP_004',kind:'dungeon_boss',regionId:'REG_002',families:['effect_bulwark','effect_retaliation','effect_predator','stat_iron'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},
 {id:'COP_005',kind:'dungeon_boss',regionId:'REG_002',families:['effect_mercy','effect_ruin','effect_opportunist','stat_precision','stat_potent'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},
 {id:'COP_006',kind:'dungeon_boss',regionId:'REG_002',families:['effect_flow','effect_benediction','effect_critical_surge','stat_swift','stat_ward'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},

 {id:'COP_007',kind:'dungeon_boss',regionId:'REG_003',families:['effect_momentum','effect_predator','effect_sustenance','stat_keen'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},
 {id:'COP_008',kind:'dungeon_boss',regionId:'REG_003',families:['effect_aegis','effect_guardians_gift','effect_unyielding','stat_vitality','stat_resolute'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},
 {id:'COP_009',kind:'dungeon_boss',regionId:'REG_003',families:['effect_execution','effect_shared_resolve','effect_battle_rhythm','effect_renewal','stat_savage'],grade:3,chance:.18,pityAt:8,recipeChance:.08,catalystChance:.15},

 {id:'PARTY_CONTRACT_WEEKLY',kind:'party_contract',families:['effect_momentum','effect_execution','effect_bulwark','effect_mercy','effect_flow','effect_opportunist'],grade:3,chance:.25,pityAt:4,catalystChance:.20},
 {id:'LIVE_COOP_RESONANCE_CACHE',kind:'live_coop_weekly',families:['effect_momentum','effect_execution','effect_opening_strike','effect_predator','effect_critical_surge','effect_ruin','effect_bulwark','effect_aegis','effect_last_stand','effect_retaliation','effect_unyielding','effect_mercy','effect_benediction','effect_guardians_gift','effect_renewal','effect_shared_resolve','effect_sustenance','effect_battle_rhythm','effect_flow','effect_opportunist'],grade:3,chance:1},
] as const;

export const GEM_RECIPE_DUPLICATE_CONVERSION_DUST_V1=25;
export const RESONANCE_CACHE_V1={requiredLiveClears:3,dustMin:25,dustMax:40,regionalCatalystGuaranteed:1,effectChoices:3,radiantCatalystLateGameChance:.05} as const;

export function gemPoolForSourceV1(sourceId:string):GemSourcePoolV1|undefined{return GEM_SOURCE_POOLS_V1.find(v=>v.id===sourceId);}
export function buildGemDropsForSourceV1(sourceId:string):Drop[]{
 const p=gemPoolForSourceV1(sourceId);if(!p)return[];const perFamily=p.chance/p.families.length;
 return p.families.map(f=>({itemId:gemItemId(f,p.grade),chance:perFamily,min:1,max:1,pityKey:p.pityAt?`gem:${sourceId}:${f}`:undefined,pityAt:p.pityAt,bindOnPity:false}));
}
export function validateGemAcquisitionV1():string[]{const errors:string[]=[];for(const p of GEM_SOURCE_POOLS_V1){if(!p.families.length)errors.push(`${p.id}:empty`);if(p.chance<0||p.chance>1)errors.push(`${p.id}:chance`);}return errors;}
