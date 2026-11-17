/** Canonical x100 main equipment materials for the Dungeon Marks and Frostfall shops. */
export const EQUIPMENT_MAIN_RESOURCE_BUNDLES=[
 {itemId:'MOSS_FIBER',name:'Moss Fiber',tier:1,dungeonMarks:150,frostfallTokens:400},
 {itemId:'GREENWOOD_LOG',name:'Greenwood Log',tier:1,dungeonMarks:150,frostfallTokens:400},
 {itemId:'WOLF_PELT',name:'Wolf Pelt',tier:2,dungeonMarks:300,frostfallTokens:850},
 {itemId:'IRONWOOD_LOG',name:'Ironwood Log',tier:2,dungeonMarks:300,frostfallTokens:850},
 {itemId:'DUNEWOOD',name:'Dunewood',tier:3,dungeonMarks:600,frostfallTokens:1600},
 {itemId:'SUNSCALE',name:'Sunscale',tier:3,dungeonMarks:600,frostfallTokens:1600},
 {itemId:'SUNSTONE_INGOT',name:'Sunstone Ingot',tier:4,dungeonMarks:1000,frostfallTokens:2800},
] as const;
export type EquipmentShopTier=1|2|3|4;
export function mainResourceBundle(itemId:string){return EQUIPMENT_MAIN_RESOURCE_BUNDLES.find(row=>row.itemId===itemId);}
