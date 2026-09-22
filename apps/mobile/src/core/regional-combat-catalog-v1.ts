export type RegionalCombatKindV1='standard'|'elite'|'regional_boss';
export type RegionalGemGradeV1=1|2|3;
export interface RegionalCombatEncounterV1{
 id:string;
 zoneId:'ZONE_006'|'ZONE_007'|'ZONE_008'|'ZONE_009'|'ZONE_010';
 kind:RegionalCombatKindV1;
 name:string;
 level:number;
 contentId:string;
 summary:string;
 gemGrade:RegionalGemGradeV1;
 gemChance:number;
 pityAt?:number;
 recipeChance?:number;
 catalystChance?:number;
 cooldownSeconds:number;
 dailyVictoryCap?:number;
}

export const SUNSCAR_REGIONAL_ENCOUNTERS_V1:readonly RegionalCombatEncounterV1[]=[
 {id:'REGCOM_SUN_006_STANDARD',zoneId:'ZONE_006',kind:'standard',name:'Saffron Gate Patrol',level:25,contentId:'SUNMON_001',summary:'A representative Sunscar patrol encounter using your verified current loadout.',gemGrade:1,gemChance:.0075,cooldownSeconds:30},
 {id:'REGCOM_SUN_007_ELITE',zoneId:'ZONE_007',kind:'elite',name:'Sunspine Elite',level:32,contentId:'SUNMON_005',summary:'Hunt the Sunspine Scorpion elite. Eligible clears advance the ZONE_007 Gem pity track.',gemGrade:2,gemChance:.015,pityAt:60,cooldownSeconds:90},
 {id:'REGCOM_SUN_008_ELITE',zoneId:'ZONE_008',kind:'elite',name:'Mirage Basin Elite',level:38,contentId:'SUNMON_010',summary:'Challenge the Shimmer Wraith elite and its arcane pressure.',gemGrade:2,gemChance:.015,pityAt:60,cooldownSeconds:90},
 {id:'REGCOM_SUN_009_ELITE',zoneId:'ZONE_009',kind:'elite',name:'Observatory Elite',level:43,contentId:'SUNMON_014',summary:'Face the Void Lens elite beneath the Buried Observatory.',gemGrade:2,gemChance:.015,pityAt:60,cooldownSeconds:90},
 {id:'REGCOM_SUN_010_BOSS',zoneId:'ZONE_010',kind:'regional_boss',name:'The Sand Tyrant',level:45,contentId:'BOSS_002',summary:'Sunscar regional boss. Verified victories can award Grade III Effect Gems, recipes and Regional Catalysts.',gemGrade:3,gemChance:.03,pityAt:25,recipeChance:.02,catalystChance:.05,cooldownSeconds:300,dailyVictoryCap:3},
] as const;

export function regionalGemIntelV1(encounter:RegionalCombatEncounterV1,pityBySource?:Readonly<Record<string,number>>){
 const pityAt=encounter.pityAt;
 const misses=pityAt?Math.max(0,Math.min(pityAt-1,Math.floor(pityBySource?.[encounter.zoneId]??0))):0;
 return {
  sourceId:encounter.zoneId,
  grade:encounter.gemGrade,
  chance:encounter.gemChance,
  pityAt,
  misses,
  remaining:pityAt?Math.max(1,pityAt-misses):undefined,
  progress:pityAt?misses/pityAt:0,
  recipeChance:encounter.recipeChance??0,
  catalystChance:encounter.catalystChance??0,
 };
}
