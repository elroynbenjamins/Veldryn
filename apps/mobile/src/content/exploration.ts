export interface ExplorationRoute{ id:string; zoneId:string; name:string; seconds:number; xp:number; unlockMonsterId?:string; /** Exploration skill level required to scout this route. */ requiredLevel:number; }

export const EXPLORATION_COMBAT_XP_SHARE=.10;

export const EXPLORATION_ROUTES:ExplorationRoute[]=[
 {id:'SCOUT_GREENFIELDS',zoneId:'GREENFIELDS',name:'Scout the Greenfields',seconds:60,xp:24,unlockMonsterId:'FIELD_WISP',requiredLevel:1},
 {id:'SCOUT_SILVERBROOK',zoneId:'SILVERBROOK',name:'Map Silverbrook',seconds:90,xp:42,unlockMonsterId:'SILVERFIN_SWARM',requiredLevel:3},
 {id:'SCOUT_IRONWOOD',zoneId:'IRONWOOD',name:'Trace Ironwood paths',seconds:120,xp:68,unlockMonsterId:'IRONWOOD_WOLF',requiredLevel:5},
 {id:'SCOUT_OLD_MINES',zoneId:'OLD_MINES',name:'Survey the Old Mines',seconds:150,xp:110,unlockMonsterId:'CAVE_SKITTER',requiredLevel:10},
 {id:'SCOUT_KINGS_ROAD',zoneId:'KINGS_ROAD',name:"Survey the King's Road",seconds:180,xp:160,unlockMonsterId:'LANTERN_WRETCH',requiredLevel:15},
 {id:'SCOUT_SUNSCAR',zoneId:'SUNSCAR',name:'Chart the Sunscar glasslands',seconds:210,xp:250,unlockMonsterId:'SUNSCAR_SCORPION',requiredLevel:22},
 {id:'SCOUT_FROSTMARCH',zoneId:'FROSTMARCH',name:'Follow the Frostmarch bells',seconds:300,xp:430,unlockMonsterId:'FROSTWOLF',requiredLevel:35},
 {id:'SCOUT_ASHLANDS',zoneId:'ASHLANDS',name:'Read the Ashlands smoke',seconds:360,xp:720,unlockMonsterId:'BLACKGLASS_MIRELING',requiredLevel:50},
];

export const EXPLORATION_REGION_GATES:Readonly<Partial<Record<string,string>>>={
 SILVERBROOK:'SCOUT_GREENFIELDS',
 IRONWOOD:'SCOUT_GREENFIELDS',
 OLD_MINES:'SCOUT_IRONWOOD',
 KINGS_ROAD:'SCOUT_OLD_MINES',
 SUNSCAR:'SCOUT_KINGS_ROAD',
 FROSTMARCH:'SCOUT_SUNSCAR',
 ASHLANDS:'SCOUT_FROSTMARCH',
};

export const explorationRoute=(id:string)=>EXPLORATION_ROUTES.find(route=>route.id===id);
export const explorationRegionGateRoute=(zoneId:string)=>explorationRoute(EXPLORATION_REGION_GATES[zoneId]??'');
export const EXPLORATION_GATED_MONSTER_IDS=new Set(EXPLORATION_ROUTES.flatMap(route=>route.unlockMonsterId?[route.unlockMonsterId]:[]));

export function explorationCombatXpForKills(kills:number,monsterXp:number,environmentXpMultiplier=1,skillXpMultiplier=1,challengeXpMultiplier=1){
 const count=Math.max(0,Math.floor(kills));
 const perKill=Math.max(0,monsterXp)*Math.max(0,environmentXpMultiplier)*Math.max(0,skillXpMultiplier)*Math.max(0,challengeXpMultiplier)*EXPLORATION_COMBAT_XP_SHARE;
 return Math.max(0,Math.floor(count*perKill));
}
