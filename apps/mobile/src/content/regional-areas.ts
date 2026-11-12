/** Region-local playable areas. The region ID remains authoritative for travel,
 * weather, offline activities, save data and server reward accounting.
 * ZONE_009 (Buried Observatory) and ZONE_014 (Choir Caverns) remain accepted
 * as legacy navigation IDs; neither is erased from historical progress. */
export interface RegionAreaDef {
  id:string; regionId:'SUNSCAR'|'FROSTMARCH'; name:string; minLevel:number; maxLevel:number;
  identity:string; activities:readonly string[]; hazards:readonly string[];
}
export const REGIONAL_AREAS:readonly RegionAreaDef[]=([
  {id:'ZONE_006',regionId:'SUNSCAR',name:'Saffron Gate',minLevel:26,maxLevel:31,
   identity:'Caravan roads and the first settlements beyond Asterfall.',
   activities:['Sunstone','Dunewood','Oasis fishing'],hazards:['desert wind']},
  {id:'ZONE_007',regionId:'SUNSCAR',name:'Scorchwind Flats',minLevel:32,maxLevel:37,
   identity:'Open glass-sand plains and fierce exposure.',
   activities:['Glass-sand mining','Heat-scarred timber'],hazards:['exposure','heat']},
  {id:'ZONE_008',regionId:'SUNSCAR',name:'Mirage Basin',minLevel:38,maxLevel:43,
   identity:'Mirage pools and reflections that mislead travelers.',
   activities:['Glassfin','Mirage botanicals'],hazards:['false trails']},
  {id:'ZONE_010',regionId:'SUNSCAR',name:"Tyrant's Crown",minLevel:44,maxLevel:50,
   identity:'Royal ruins, the buried observatory and the Sand Tyrant.',
   activities:['Astral minerals','Ancient herbs'],hazards:['glass storms','sand pillars']},
  {id:'ZONE_011',regionId:'FROSTMARCH',name:'Thawgate',minLevel:51,maxLevel:56,
   identity:'Fortified northern gate and the last dependable shelter.',
   activities:['Frostiron','Whitepine','Icefin'],hazards:['black ice']},
  {id:'ZONE_012',regionId:'FROSTMARCH',name:'Whitepine Reach',minLevel:57,maxLevel:62,
   identity:'Snow forest with false trails and ancient frozen treants.',
   activities:['Snowbound timber','Rime herbs'],hazards:['whiteout trails']},
  {id:'ZONE_013',regionId:'FROSTMARCH',name:'Shiverlake',minLevel:63,maxLevel:68,
   identity:'Frozen lake and the resonant ruins beneath its ice.',
   activities:['Under-ice fishing','Frostiron'],hazards:['thin ice']},
  {id:'ZONE_015',regionId:'FROSTMARCH',name:'Wyrmspine',minLevel:69,maxLevel:75,
   identity:'High mountain lair of the Frost Wyrm; Choir Caverns remain a dungeon.',
   activities:['Wyrmspine ore','Highland herbs'],hazards:['ice prison','breath lines']},
] as const);

const LEGACY_AREA_ALIASES:Readonly<Record<string,string>>={
  ZONE_009:'ZONE_010', // Buried Observatory remains a location in Tyrant's Crown
  ZONE_014:'ZONE_015', // Choir Caverns stays a co-op dungeon
};
export const regionAreas=(regionId:string):readonly RegionAreaDef[]=>REGIONAL_AREAS.filter(area=>area.regionId===regionId);
export function regionalArea(regionId:string,areaId:string|undefined):RegionAreaDef|undefined{
  if(!areaId)return undefined;
  const normalized=LEGACY_AREA_ALIASES[areaId]??areaId;
  return REGIONAL_AREAS.find(area=>area.regionId===regionId&&area.id===normalized);
}
export function areaLevelUnlocked(regionId:string,areaId:string,characterLevel:number){
  const area=regionalArea(regionId,areaId);
  return !!area&&characterLevel>=area.minLevel;
}
