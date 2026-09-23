/**
 * Mobile discoverability projection for material rewards that have a canonical
 * server-side dungeon reward source.
 *
 * REGIONAL_CATALYST mirrors backend/src/server/equipment/gems/gem-acquisition-v1.ts:
 * COP_004–COP_009 each roll a Regional Catalyst at 15% on the canonical
 * dungeon-boss gem reward settlement. Dungeon names/minimum levels mirror the
 * live Sunscar/Frostmarch dungeon catalogs.
 */
export interface DungeonMaterialSource{
  itemId:string;
  dungeonId:string;
  dungeonName:string;
  minLevel:number;
  chance:number;
}

export const DUNGEON_MATERIAL_SOURCES:readonly DungeonMaterialSource[]=[
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_004',dungeonName:'Caravan of Glass',minLevel:30,chance:.15},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_005',dungeonName:'Mirage Well',minLevel:36,chance:.15},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_006',dungeonName:'Buried Observatory',minLevel:40,chance:.15},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_007',dungeonName:'Whitepine Hunt',minLevel:52,chance:.15},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_008',dungeonName:'Shiverlake Descent',minLevel:58,chance:.15},
  {itemId:'REGIONAL_CATALYST',dungeonId:'COP_009',dungeonName:'Choir Caverns',minLevel:64,chance:.15},
] as const;

export function dungeonMaterialSourcesForItem(itemId:string){
  return DUNGEON_MATERIAL_SOURCES.filter(source=>source.itemId===itemId);
}

export function dungeonMaterialSourceById(dungeonId:string){
  return DUNGEON_MATERIAL_SOURCES.find(source=>source.dungeonId===dungeonId);
}
