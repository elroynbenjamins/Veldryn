export interface ExplorationRoute{ id:string; zoneId:string; name:string; seconds:number; xp:number; unlockMonsterId?:string; unlockRegionId?:string; requiredLevel:number; }
export const EXPLORATION_ROUTES:ExplorationRoute[]=[
 {id:'SCOUT_GREENFIELDS',zoneId:'GREENFIELDS',name:'Scout the Greenfields',seconds:60,xp:24,unlockMonsterId:'FIELD_WISP',unlockRegionId:'SILVERBROOK',requiredLevel:1},
 {id:'SCOUT_SILVERBROOK',zoneId:'SILVERBROOK',name:'Map Silverbrook',seconds:90,xp:42,unlockMonsterId:'SILVERFIN_SWARM',unlockRegionId:'IRONWOOD',requiredLevel:5},
 {id:'SCOUT_IRONWOOD',zoneId:'IRONWOOD',name:'Trace Ironwood paths',seconds:120,xp:68,unlockMonsterId:'IRONWOOD_WOLF',unlockRegionId:'OLD_MINES',requiredLevel:7},
 {id:'SCOUT_OLD_MINES',zoneId:'OLD_MINES',name:'Survey the Old Mines',seconds:150,xp:110,unlockMonsterId:'CAVE_SKITTER',unlockRegionId:'KINGS_ROAD',requiredLevel:16},
 {id:'SCOUT_KINGS_ROAD',zoneId:'KINGS_ROAD',name:"Survey the King's Road",seconds:180,xp:160,unlockMonsterId:'LANTERN_WRETCH',unlockRegionId:'SUNSCAR',requiredLevel:20},
 {id:'SCOUT_SUNSCAR',zoneId:'SUNSCAR',name:'Chart the Sunscar glasslands',seconds:210,xp:250,unlockMonsterId:'SUNSCAR_SCORPION',unlockRegionId:'FROSTMARCH',requiredLevel:26},
 {id:'SCOUT_FROSTMARCH',zoneId:'FROSTMARCH',name:'Follow the Frostmarch bells',seconds:300,xp:430,unlockMonsterId:'FROSTWOLF',unlockRegionId:'ASHLANDS',requiredLevel:46},
 {id:'SCOUT_ASHLANDS',zoneId:'ASHLANDS',name:'Read the Ashlands smoke',seconds:360,xp:720,unlockMonsterId:'BLACKGLASS_MIRELING',requiredLevel:71},
];
export const explorationRoute=(id:string)=>EXPLORATION_ROUTES.find(route=>route.id===id);