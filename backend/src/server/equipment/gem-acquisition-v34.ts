import {CLASS_EFFECT_GEM_RECOMMENDATIONS_V34,EFFECT_GEMS_V34,type EffectGemIdV34,type GemGradeV34} from './gem-system-v34';
import {gemRecipeIdV34} from './gem-progression-v34';

export type GemRegionV34='Asterfall'|'Sunscar'|'Frostmarch';
export type GemSourceKindV34='enemy'|'elite'|'boss'|'dungeon'|'party_contract'|'live_coop';
export interface GemDropSourceV34{contentId:string;label:string;kind:GemSourceKindV34;minGrade:GemGradeV34;maxGrade:GemGradeV34;baseChance:number;}
export interface EffectGemAcquisitionV34{familyId:EffectGemIdV34;region:GemRegionV34;direct:readonly GemDropSourceV34[];recipeSources:readonly string[];fallbackContracts:readonly string[];}

const src=(contentId:string,label:string,kind:GemSourceKindV34,minGrade:GemGradeV34,maxGrade:GemGradeV34,baseChance:number):GemDropSourceV34=>({contentId,label,kind,minGrade,maxGrade,baseChance});
const combatFallback=['party_weekly_combat_v1','party_weekly_mixed_v1'] as const;
const mixedFallback=['party_weekly_mixed_v1','party_weekly_skilling_v1'] as const;

export const EFFECT_GEM_ACQUISITION_V34:readonly EffectGemAcquisitionV34[]=[
 {familyId:'effect_momentum',region:'Asterfall',direct:[src('FALLEN_SENTINEL','Fallen Sentinel','elite',1,1,.015),src('BOSS_EXP_BELL','Bell Warden','boss',1,2,.10)],recipeSources:['BOSS_EXP_BELL'],fallbackContracts:combatFallback},
 {familyId:'effect_bulwark',region:'Asterfall',direct:[src('ROOTBOUND_ELITE_01','Root Warden','elite',1,1,.015),src('BOSS_EXP_ROOT','Rootbound Heart','boss',1,2,.10)],recipeSources:['BOSS_EXP_ROOT'],fallbackContracts:combatFallback},
 {familyId:'effect_opening_strike',region:'Asterfall',direct:[src('LANTERN_ELITE_02','Fallen Lantern Knight','elite',1,1,.015),src('BOSS_EXP_BELL','Bell Warden','boss',1,2,.10)],recipeSources:['BOSS_EXP_BELL'],fallbackContracts:combatFallback},
 {familyId:'effect_sustenance',region:'Asterfall',direct:[src('BRIAR_HUSK','Briar Husk','enemy',1,1,.0015),src('BOSS_EXP_ROOT','Rootbound Heart','boss',1,2,.08)],recipeSources:['BOSS_EXP_ROOT'],fallbackContracts:mixedFallback},
 {familyId:'effect_battle_rhythm',region:'Asterfall',direct:[src('LANTERN_ELITE_01','Bell Sentinel','elite',1,1,.012),src('BOSS_EXP_BELL','Bell Warden','boss',1,2,.08)],recipeSources:['BOSS_EXP_BELL'],fallbackContracts:mixedFallback},
 {familyId:'effect_mercy',region:'Asterfall',direct:[src('DROWNED_PILGRIM','Drowned Pilgrim','enemy',1,1,.0015),src('BOSS_EXP_BELL','Bell Warden','boss',1,2,.08)],recipeSources:['BOSS_EXP_BELL'],fallbackContracts:mixedFallback},

 {familyId:'effect_execution',region:'Sunscar',direct:[src('SUNNODE_004','Sunspine Ambush','elite',2,2,.025),src('COP_004','Caravan of Glass','dungeon',2,3,.18)],recipeSources:['COP_004'],fallbackContracts:combatFallback},
 {familyId:'effect_predator',region:'Sunscar',direct:[src('SUN_MIRAGE_ELITE_02','Veiled Huntmaster','elite',2,2,.025),src('COP_004','Caravan of Glass','dungeon',2,3,.15)],recipeSources:['COP_004'],fallbackContracts:combatFallback},
 {familyId:'effect_critical_surge',region:'Sunscar',direct:[src('SUNNODE_104','Shimmer Court','elite',2,2,.025),src('COP_005','Mirage Well','dungeon',2,3,.18)],recipeSources:['COP_005'],fallbackContracts:combatFallback},
 {familyId:'effect_ruin',region:'Sunscar',direct:[src('SUN_MIRAGE_ELITE_02','Veiled Huntmaster','elite',2,2,.025),src('COP_005','Mirage Well','dungeon',2,3,.15)],recipeSources:['COP_005'],fallbackContracts:combatFallback},
 {familyId:'effect_aegis',region:'Sunscar',direct:[src('SUN_OBS_ELITE_03','Amberglass Sentinel','elite',2,2,.025),src('COP_006','Buried Observatory','dungeon',2,3,.18)],recipeSources:['COP_006'],fallbackContracts:mixedFallback},
 {familyId:'effect_benediction',region:'Sunscar',direct:[src('SUN_OBS_ELITE_02','Solar Archivist','elite',2,2,.025),src('COP_006','Buried Observatory','dungeon',2,3,.15)],recipeSources:['COP_006'],fallbackContracts:mixedFallback},
 {familyId:'effect_opportunist',region:'Sunscar',direct:[src('SUNNODE_204','Null Astronomer','elite',2,2,.025),src('COP_006','Buried Observatory','dungeon',2,3,.15)],recipeSources:['COP_006'],fallbackContracts:combatFallback},

 {familyId:'effect_last_stand',region:'Frostmarch',direct:[src('FRMON_005','Needlefang Lynx','enemy',2,3,.003),src('COP_007','Whitepine Hunt','dungeon',3,4,.18)],recipeSources:['COP_007'],fallbackContracts:combatFallback},
 {familyId:'effect_retaliation',region:'Frostmarch',direct:[src('FRMON_004','Whitepine Treant','elite',2,3,.01),src('COP_007','Whitepine Hunt','dungeon',3,4,.15)],recipeSources:['COP_007'],fallbackContracts:combatFallback},
 {familyId:'effect_unyielding',region:'Frostmarch',direct:[src('FRMON_008','Underice Serpent','enemy',2,3,.003),src('COP_008','Shiverlake Descent','dungeon',3,4,.18)],recipeSources:['COP_008'],fallbackContracts:combatFallback},
 {familyId:'effect_guardians_gift',region:'Frostmarch',direct:[src('FRMON_009','Bellfin','enemy',2,3,.003),src('COP_008','Shiverlake Descent','dungeon',3,4,.15)],recipeSources:['COP_008'],fallbackContracts:mixedFallback},
 {familyId:'effect_renewal',region:'Frostmarch',direct:[src('FRMON_013','Hollow Chorister','elite',2,3,.01),src('COP_009','Choir Caverns','dungeon',3,4,.18)],recipeSources:['COP_009'],fallbackContracts:mixedFallback},
 {familyId:'effect_shared_resolve',region:'Frostmarch',direct:[src('FRMON_011','Choir Acolyte','enemy',2,3,.003),src('COP_009','Choir Caverns','dungeon',3,4,.15)],recipeSources:['COP_009'],fallbackContracts:mixedFallback},
 {familyId:'effect_flow',region:'Frostmarch',direct:[src('FRMON_014','Rimeglass Bat','enemy',2,3,.003),src('COP_009','Choir Caverns','dungeon',3,4,.15)],recipeSources:['COP_009'],fallbackContracts:combatFallback},
] as const;

export const GEM_PITY_RULES_V34={
 dungeonEffectMisses:6,regionalBossEffectMisses:10,dungeonRecipeMisses:12,regionalBossRecipeMisses:20,duplicateRecipeDust:25,
} as const;

export interface GemPityStateV34{effectMissesBySource:Record<string,number>;recipeMissesBySource:Record<string,number>;}
export function emptyGemPityStateV34():GemPityStateV34{return{effectMissesBySource:{},recipeMissesBySource:{}};}
export function gemSourcesForContentV34(contentId:string){return EFFECT_GEM_ACQUISITION_V34.flatMap(row=>row.direct.filter(source=>source.contentId===contentId).map(source=>({familyId:row.familyId,region:row.region,source})));}

function gradeFromRoll(source:GemDropSourceV34,roll:number):GemGradeV34{
 if(source.minGrade===source.maxGrade)return source.minGrade;
 const span=source.maxGrade-source.minGrade;const bump=Math.min(span,Math.floor(Math.max(0,Math.min(.999999,roll))* (span+1)));
 return (source.minGrade+bump) as GemGradeV34;
}
export function resolveDirectGemRollV34(input:{contentId:string;dropRoll:number;gradeRoll:number;pityState:GemPityStateV34}){
 const candidates=gemSourcesForContentV34(input.contentId);if(!candidates.length)return{drop:undefined,pityState:input.pityState,pityTriggered:false};
 const sourceKind=candidates[0].source.kind;const threshold=sourceKind==='dungeon'?GEM_PITY_RULES_V34.dungeonEffectMisses:sourceKind==='boss'?GEM_PITY_RULES_V34.regionalBossEffectMisses:0;
 const misses=input.pityState.effectMissesBySource[input.contentId]??0;
 const chance=Math.min(.60,candidates.reduce((sum,row)=>sum+row.source.baseChance,0));
 const pityTriggered=threshold>0&&misses+1>=threshold;
 if(input.dropRoll>=chance&&!pityTriggered)return{drop:undefined,pityTriggered:false,pityState:{...input.pityState,effectMissesBySource:{...input.pityState.effectMissesBySource,[input.contentId]:misses+1}}};
 const index=Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(.999999,input.gradeRoll))*candidates.length)),choice=candidates[index];
 return{drop:{familyId:choice.familyId,grade:gradeFromRoll(choice.source,input.gradeRoll),sourceId:input.contentId},pityTriggered,pityState:{...input.pityState,effectMissesBySource:{...input.pityState.effectMissesBySource,[input.contentId]:0}}};
}

export function recipePoolForContentV34(contentId:string):EffectGemIdV34[]{return EFFECT_GEM_ACQUISITION_V34.filter(row=>row.recipeSources.includes(contentId)).map(row=>row.familyId);}
export function resolveRecipeRollV34(input:{contentId:string;roll:number;learnedRecipeIds:readonly string[];pityState:GemPityStateV34;sourceKind:'dungeon'|'boss'}){
 const pool=recipePoolForContentV34(input.contentId);if(!pool.length)return{recipeId:undefined,dust:0,pityTriggered:false,pityState:input.pityState};
 const misses=input.pityState.recipeMissesBySource[input.contentId]??0,threshold=input.sourceKind==='dungeon'?GEM_PITY_RULES_V34.dungeonRecipeMisses:GEM_PITY_RULES_V34.regionalBossRecipeMisses;
 const baseChance=input.sourceKind==='dungeon'?.08:.02,pityTriggered=misses+1>=threshold;
 if(input.roll>=baseChance&&!pityTriggered)return{recipeId:undefined,dust:0,pityTriggered:false,pityState:{...input.pityState,recipeMissesBySource:{...input.pityState.recipeMissesBySource,[input.contentId]:misses+1}}};
 const unlearned=pool.filter(id=>!input.learnedRecipeIds.includes(gemRecipeIdV34(id)));
 if(!unlearned.length)return{recipeId:undefined,dust:GEM_PITY_RULES_V34.duplicateRecipeDust,pityTriggered,pityState:{...input.pityState,recipeMissesBySource:{...input.pityState.recipeMissesBySource,[input.contentId]:0}}};
 const family=unlearned[Math.min(unlearned.length-1,Math.floor(Math.max(0,Math.min(.999999,input.roll/baseChance))*unlearned.length))];
 return{recipeId:gemRecipeIdV34(family),dust:0,pityTriggered,pityState:{...input.pityState,recipeMissesBySource:{...input.pityState.recipeMissesBySource,[input.contentId]:0}}};
}

export interface ResonanceCacheV34{dustMin:25;dustMax:40;regionalCatalysts:1;effectChoices:3;radiantCatalystChance:number;}
export const RESONANCE_CACHE_V34:ResonanceCacheV34={dustMin:25,dustMax:40,regionalCatalysts:1,effectChoices:3,radiantCatalystChance:.08};
export function resonanceCacheProgressV34(successfulLiveClears:number){const clears=Math.max(0,Math.floor(successfulLiveClears));return{clears:Math.min(3,clears),required:3,ready:clears>=3};}
export function resonanceCacheChoicesV34(input:{className:string;resonanceCopies?:Partial<Record<EffectGemIdV34,number>>;rolls?:readonly number[]}):EffectGemIdV34[]{
 const rec=(CLASS_EFFECT_GEM_RECOMMENDATIONS_V34 as Record<string,{primary:readonly EffectGemIdV34[];alternatives:readonly EffectGemIdV34[]}>)[input.className];
 const weights=new Map<EffectGemIdV34,number>(EFFECT_GEMS_V34.map(v=>[v.id,1]));
 for(const id of rec?.primary??[])weights.set(id,(weights.get(id)??1)+3);
 for(const id of rec?.alternatives??[])weights.set(id,(weights.get(id)??1)+1.5);
 for(const [id,copies] of Object.entries(input.resonanceCopies??{}) as [EffectGemIdV34,number][])if(copies===2)weights.set(id,(weights.get(id)??1)+5);
 const remaining=[...weights.entries()],out:EffectGemIdV34[]=[];
 for(let pick=0;pick<3&&remaining.length;pick++){const total=remaining.reduce((s,v)=>s+v[1],0),roll=Math.max(0,Math.min(.999999,input.rolls?.[pick]??(pick+.5)/3))*total;let cursor=0,index=0;for(;index<remaining.length;index++){cursor+=remaining[index][1];if(roll<cursor)break;}out.push(remaining[Math.min(index,remaining.length-1)][0]);remaining.splice(Math.min(index,remaining.length-1),1);}
 return out;
}

export function validateGemAcquisitionV34():string[]{const errors:string[]=[];const families=new Set(EFFECT_GEM_ACQUISITION_V34.map(v=>v.familyId));if(families.size!==20)errors.push('effect_source_family_count');for(const effect of EFFECT_GEMS_V34)if(!families.has(effect.id))errors.push(`${effect.id}:missing_source`);for(const row of EFFECT_GEM_ACQUISITION_V34){if(!row.direct.length)errors.push(`${row.familyId}:no_direct_source`);if(!row.recipeSources.length)errors.push(`${row.familyId}:no_recipe_source`);}return errors;}
