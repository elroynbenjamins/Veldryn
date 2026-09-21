export type RegionalCombatKindV1='standard'|'elite'|'regional_boss';
export interface RegionalCombatEncounterV1{
 id:string;
 zoneId:'ZONE_006'|'ZONE_007'|'ZONE_008'|'ZONE_009'|'ZONE_010';
 kind:RegionalCombatKindV1;
 name:string;
 level:number;
 contentId:string;
 summary:string;
}

export const SUNSCAR_REGIONAL_ENCOUNTERS_V1:readonly RegionalCombatEncounterV1[]=[
 {id:'REGCOM_SUN_006_STANDARD',zoneId:'ZONE_006',kind:'standard',name:'Saffron Gate Patrol',level:25,contentId:'SUNMON_001',summary:'A representative Sunscar patrol encounter using your verified current loadout.'},
 {id:'REGCOM_SUN_007_ELITE',zoneId:'ZONE_007',kind:'elite',name:'Sunspine Elite',level:32,contentId:'SUNMON_005',summary:'Hunt the Sunspine Scorpion elite. Eligible clears advance the ZONE_007 Gem pity track.'},
 {id:'REGCOM_SUN_008_ELITE',zoneId:'ZONE_008',kind:'elite',name:'Mirage Basin Elite',level:38,contentId:'SUNMON_010',summary:'Challenge the Shimmer Wraith elite and its arcane pressure.'},
 {id:'REGCOM_SUN_009_ELITE',zoneId:'ZONE_009',kind:'elite',name:'Observatory Elite',level:43,contentId:'SUNMON_014',summary:'Face the Void Lens elite beneath the Buried Observatory.'},
 {id:'REGCOM_SUN_010_BOSS',zoneId:'ZONE_010',kind:'regional_boss',name:'The Sand Tyrant',level:45,contentId:'BOSS_002',summary:'Sunscar regional boss. Verified victories can award Grade III Effect Gems, recipes and Regional Catalysts.'},
] as const;
