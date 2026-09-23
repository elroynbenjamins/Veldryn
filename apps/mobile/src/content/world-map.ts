export type WorldZoneAvailability='released'|'inDevelopment';
export interface WorldZoneDef{id:string;name:string;subtitle:string;minLevel:number;maxLevel:number;x:number;y:number;accent:string;symbol:string;availability:WorldZoneAvailability;developmentNote?:string;}
export function worldZoneInDevelopment(zone:WorldZoneDef){return zone.availability==='inDevelopment';}
export const WORLD_ZONES:WorldZoneDef[]=[
  {availability:'released',id:'GREENFIELDS',name:'Greenfields',subtitle:'First hunts and a level-20 return encounter',minLevel:1,maxLevel:20,x:.18,y:.76,accent:'#79b88a',symbol:'✦'},
  {availability:'released',id:'SILVERBROOK',name:'Silverbrook',subtitle:'River paths and drowned secrets',minLevel:5,maxLevel:22,x:.56,y:.70,accent:'#6aaed6',symbol:'≈'},
  {availability:'released',id:'IRONWOOD',name:'Ironwood Forest',subtitle:'Deep timber and ancient roots',minLevel:7,maxLevel:15,x:.28,y:.46,accent:'#4f9868',symbol:'♠'},
  {availability:'released',id:'OLD_MINES',name:'Old Mines',subtitle:'Ore veins and runebound tunnels',minLevel:16,maxLevel:19,x:.68,y:.42,accent:'#a68b72',symbol:'◆'},
  {availability:'released',id:'KINGS_ROAD',name:"King's Road",subtitle:'Oathglass and the Fallen Knight',minLevel:20,maxLevel:25,x:.73,y:.16,accent:'#c69b55',symbol:'♛'},
  {availability:'released',id:'SUNSCAR',name:'Sunscar',subtitle:'Glass deserts, buried observatories, and the road beyond Asterfall',minLevel:26,maxLevel:45,x:.89,y:.31,accent:'#d58b54',symbol:'☼'},
  {availability:'released',id:'FROSTMARCH',name:'Frostmarch',subtitle:'Frozen passes where every bell carries through the ice',minLevel:45,maxLevel:70,x:.42,y:.10,accent:'#91c7dc',symbol:'❄'},
  {availability:'released',id:'ASHLANDS',name:'Ashlands',subtitle:'Blackglass marshes and the crucible at the edge of the known road',minLevel:71,maxLevel:90,x:.12,y:.22,accent:'#a77972',symbol:'◇'},
  {availability:'inDevelopment',id:'VEILLANDS',name:'The Veillands',subtitle:'A reality-thin frontier beyond the known road',minLevel:91,maxLevel:110,x:.82,y:.08,accent:'#8a6bc9',symbol:'◈',developmentNote:'The Veillands is a future high-level region. Its travel preview is visible now, while enemies, gathering routes and progression rewards remain in development.'},
];
