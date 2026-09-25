export interface ExplorationRoute{
 id:string;
 zoneId:string;
 name:string;
 seconds:number;
 xp:number;
 unlockMonsterId?:string;
 unlockRegionId?:string;
 requiredLevel:number;
 requiredExplorationLevel:number;
}

export const EXPLORATION_ROUTES:ExplorationRoute[]=[
 {id:'SCOUT_GREENFIELDS',zoneId:'GREENFIELDS',name:'Scout the Greenfields',seconds:60,xp:24,unlockMonsterId:'FIELD_WISP',requiredLevel:1,requiredExplorationLevel:1},
 {id:'SCOUT_SILVERBROOK',zoneId:'SILVERBROOK',name:'Map Silverbrook',seconds:90,xp:42,unlockMonsterId:'MIRE_HERON',requiredLevel:5,requiredExplorationLevel:1},
 {id:'SCOUT_IRONWOOD',zoneId:'IRONWOOD',name:'Trace Ironwood paths',seconds:120,xp:68,unlockMonsterId:'THORNLING',unlockRegionId:'OLD_MINES',requiredLevel:7,requiredExplorationLevel:2},
 {id:'SCOUT_OLD_MINES',zoneId:'OLD_MINES',name:'Survey the Old Mines',seconds:150,xp:110,unlockMonsterId:'ECHO_BAT',unlockRegionId:'KINGS_ROAD',requiredLevel:16,requiredExplorationLevel:3},
 {id:'SCOUT_KINGS_ROAD',zoneId:'KINGS_ROAD',name:"Survey the King's Road",seconds:180,xp:160,unlockMonsterId:'BANNER_SHADE',unlockRegionId:'SUNSCAR',requiredLevel:20,requiredExplorationLevel:5},
 {id:'SCOUT_SUNSCAR',zoneId:'SUNSCAR',name:'Chart the Sunscar glasslands',seconds:210,xp:250,unlockMonsterId:'DUNE_ORACLE',unlockRegionId:'FROSTMARCH',requiredLevel:26,requiredExplorationLevel:8},
 {id:'SCOUT_FROSTMARCH',zoneId:'FROSTMARCH',name:'Follow the Frostmarch bells',seconds:300,xp:430,unlockMonsterId:'BELLWRAITH',unlockRegionId:'ASHLANDS',requiredLevel:45,requiredExplorationLevel:12},
 {id:'SCOUT_ASHLANDS',zoneId:'ASHLANDS',name:'Read the Ashlands smoke',seconds:360,xp:720,unlockMonsterId:'CINDER_TITAN',unlockRegionId:'VEILLANDS',requiredLevel:71,requiredExplorationLevel:20},
];

export const explorationRoute=(id:string)=>EXPLORATION_ROUTES.find(route=>route.id===id);
export const explorationRouteForRegion=(zoneId:string)=>EXPLORATION_ROUTES.find(route=>route.zoneId===zoneId);
export const explorationRouteForRegionUnlock=(zoneId:string)=>EXPLORATION_ROUTES.find(route=>route.unlockRegionId===zoneId);
export const EXPLORATION_GATED_MONSTER_IDS=new Set(EXPLORATION_ROUTES.flatMap(route=>route.unlockMonsterId?[route.unlockMonsterId]:[]));
