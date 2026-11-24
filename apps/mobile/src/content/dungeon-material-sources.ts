/**
 * Mobile discoverability projection for material rewards that have a canonical
 * server-side dungeon reward source.
 *
 * REGIONAL_CATALYST mirrors backend/src/server/equipment/gems/gem-acquisition-v1.ts:
 * COP_006–COP_009 roll a Regional Catalyst at 3–5% on the canonical
 * dungeon-boss gem reward settlement. Dungeon names/minimum levels mirror the
 * live Sunscar/Frostmarch dungeon catalogs.
 */
export interface DungeonMaterialSource{
  itemId:string;
  dungeonId:string;
  dungeonName:string;
  minLevel:number;
  expectedMinutes:number;
  chance:number;
}

export const DUNGEON_MATERIAL_SOURCES:readonly DungeonMaterialSource[]=[
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_006',dungeonName:'Buried Observatory',minLevel:40,expectedMinutes:23,chance:0.03},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_007',dungeonName:'Whitepine Hunt',minLevel:52,expectedMinutes:19,chance:0.03},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_008',dungeonName:'Shiverlake Descent',minLevel:58,expectedMinutes:21,chance:0.04},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_009',dungeonName:'Choir Caverns',minLevel:64,expectedMinutes:23,chance:0.05},
] as const;

export function dungeonMaterialSourcesForItem(itemId:string){
  return DUNGEON_MATERIAL_SOURCES.filter(source=>source.itemId===itemId);
}

export function dungeonMaterialSourceById(dungeonId:string){
  return DUNGEON_MATERIAL_SOURCES.find(source=>source.dungeonId===dungeonId);
}
