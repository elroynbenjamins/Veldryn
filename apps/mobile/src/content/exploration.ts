import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../core/progression';

/** Each survey remains a repeatable Exploration training activity.
 * Completed IDs persist, so the original SCOUT_SUNSCAR also counts as Saffron Gate. */
export interface ExplorationRoute {
 id:string;zoneId:string;areaId?:string;name:string;seconds:number;xp:number;
 unlockMonsterId?:string;unlockZoneId?:string;prerequisiteRouteId?:string;
 requiredLevel:number;requiredExplorationLevel:number;
}
export const EXPLORATION_ROUTES:ExplorationRoute[]=[
 {id:'SCOUT_GREENFIELDS',zoneId:'GREENFIELDS',name:'Scout the Greenfields',seconds:48,xp:24,unlockMonsterId:'FIELD_WISP',requiredLevel:1,requiredExplorationLevel:1},
 {id:'SCOUT_SILVERBROOK',zoneId:'SILVERBROOK',name:'Map Silverbrook',seconds:72,xp:42,unlockMonsterId:'SILVERFIN_SWARM',requiredLevel:5,requiredExplorationLevel:1},
 {id:'SCOUT_IRONWOOD',zoneId:'IRONWOOD',name:'Trace Ironwood paths',seconds:96,xp:68,unlockMonsterId:'IRONWOOD_WOLF',unlockZoneId:'OLD_MINES',requiredLevel:7,requiredExplorationLevel:3},
 {id:'SCOUT_OLD_MINES',zoneId:'OLD_MINES',name:'Survey the Old Mines',seconds:120,xp:110,unlockMonsterId:'CAVE_SKITTER',unlockZoneId:'KINGS_ROAD',requiredLevel:16,requiredExplorationLevel:4},
 {id:'SCOUT_KINGS_ROAD',zoneId:'KINGS_ROAD',name:"Survey the King's Road",seconds:144,xp:160,unlockMonsterId:'LANTERN_WRETCH',unlockZoneId:'SUNSCAR',requiredLevel:20,requiredExplorationLevel:5},
 {id:'SCOUT_SUNSCAR',zoneId:'SUNSCAR',areaId:'ZONE_006',name:'Chart Saffron Gate',seconds:168,xp:250,unlockMonsterId:'SUNSCAR_SCORPION',unlockZoneId:'FROSTMARCH',requiredLevel:26,requiredExplorationLevel:8},
 {id:'SCOUT_SUNSCAR_SCORCHWIND',zoneId:'SUNSCAR',areaId:'ZONE_007',name:'Survey Scorchwind Flats',seconds:180,xp:290,unlockMonsterId:'DUNE_ORACLE',prerequisiteRouteId:'SCOUT_SUNSCAR',requiredLevel:31,requiredExplorationLevel:10},
 {id:'SCOUT_SUNSCAR_MIRAGE',zoneId:'SUNSCAR',areaId:'ZONE_008',name:'Trace Mirage Basin',seconds:192,xp:340,unlockMonsterId:'GLASSBOUND_SENTINEL',prerequisiteRouteId:'SCOUT_SUNSCAR_SCORCHWIND',requiredLevel:36,requiredExplorationLevel:12},
 {id:'SCOUT_SUNSCAR_CROWN',zoneId:'SUNSCAR',areaId:'ZONE_010',name:"Chart Tyrant's Crown",seconds:204,xp:390,prerequisiteRouteId:'SCOUT_SUNSCAR_MIRAGE',requiredLevel:41,requiredExplorationLevel:14},
 {id:'SCOUT_FROSTMARCH',zoneId:'FROSTMARCH',name:'Follow the Frostmarch bells',seconds:240,xp:480,unlockMonsterId:'FROSTWOLF',unlockZoneId:'ASHLANDS',requiredLevel:46,requiredExplorationLevel:16},
 {id:'SCOUT_ASHLANDS',zoneId:'ASHLANDS',name:'Read the Ashlands smoke',seconds:288,xp:720,unlockMonsterId:'BLACKGLASS_MIRELING',requiredLevel:71,requiredExplorationLevel:20},
].map(route=>({...route,requiredLevel:rebaseLevel(route.requiredLevel)}));

export const explorationRoute=(id:string)=>EXPLORATION_ROUTES.find(route=>route.id===id);
export function unmetScoutingPrerequisite(route:ExplorationRoute,completed:readonly string[]=[]){
 return route.prerequisiteRouteId&&!completed.includes(route.prerequisiteRouteId)?explorationRoute(route.prerequisiteRouteId):undefined;
}
/** Trailcraft: 1% gathering pace per 10 Exploration levels, max 10% at level 100. */
export function explorationGatheringSpeedBonus(level:number){return Math.min(10,Math.max(0,Math.floor(level/10)))/100;}
/** Fieldcraft: 2% faster scouting per 10 Exploration levels, max 20%. */
export function explorationScoutingSpeedMultiplier(level:number){return 1+2*Math.min(10,Math.max(0,Math.floor(level/10)))/100;}
