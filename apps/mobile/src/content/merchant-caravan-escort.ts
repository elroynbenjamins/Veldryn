import {MONSTERS,type MonsterDef} from './monsters';

/** The Merchant event's three broad combat brackets. */
export type MerchantCaravanBracket='local'|'trade'|'guild';

export interface MerchantCaravanBracketDef {
  id:MerchantCaravanBracket;
  label:string;
  minLevel:number;
  maxLevel:number;
  encounterLevel:number;
  routeLength:number;
}

export interface MerchantCaravanEncounter {
  bracket:MerchantCaravanBracket;
  index:number;
  baseMonsterId:string;
  displayName:string;
  routeStop:string;
  monster:MonsterDef;
}

export const MERCHANT_CARAVAN_BRACKETS:readonly MerchantCaravanBracketDef[]=[
  {id:'local',label:'Local Route',minLevel:1,maxLevel:20,encounterLevel:10,routeLength:3},
  {id:'trade',label:'Trade Route',minLevel:21,maxLevel:40,encounterLevel:30,routeLength:4},
  {id:'guild',label:'Guild Route',minLevel:41,maxLevel:Number.POSITIVE_INFINITY,encounterLevel:60,routeLength:5},
];

/** Curated pools keep the event readable while still making each escort feel different. */
const POOLS:Record<MerchantCaravanBracket,readonly string[]>={
  local:['ROADSIDE_BOAR','IRONWOOD_WOLF','THORNLING','FOREST_TROLL'],
  trade:['OATHBOUND_SQUIRE','BANNER_SHADE','SUNSCAR_SCORPION','DUNE_ORACLE','GLASSBOUND_SENTINEL'],
  guild:['FROSTWOLF','BELLWRAITH','CHOIR_HUNTER','BLACKGLASS_MIRELING','CINDER_TITAN'],
};

const ROUTE_STOPS=['Broken Tollgate','Caravan Crossroads','Wayfarer Camp','Guild Outpost','Pavilion Gate'] as const;
const ENCOUNTER_PREFIXES=['Roadside','Trade-route','Guild-road','Caravan'] as const;

export function merchantCaravanBracketForLevel(level:number):MerchantCaravanBracketDef{
  const safeLevel=Math.max(1,Math.floor(level));
  return MERCHANT_CARAVAN_BRACKETS.find(row=>safeLevel>=row.minLevel&&safeLevel<=row.maxLevel)??MERCHANT_CARAVAN_BRACKETS[2];
}

function stableHash(value:string){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

function scaleMonster(base:MonsterDef,targetLevel:number):MonsterDef{
  const ratio=Math.max(.65,Math.min(1.65,targetLevel/Math.max(1,base.level)));
  return {
    ...base,
    id:`MERCHANT_CARAVAN:${base.id}:${targetLevel}`,
    name:base.name,
    level:targetLevel,
    unlockLevel:1,
    zone:'Merchant Caravan',
    hp:Math.max(1,Math.round(base.hp*ratio)),
    attack:Math.max(1,Math.round(base.attack*ratio)),
    defense:Math.max(1,Math.round(base.defense*ratio)),
    xp:Math.max(1,Math.round(base.xp*ratio)),
    gold:Math.max(1,Math.round(base.gold*ratio)),
    secondsPerKill:Math.max(5,Math.round(base.secondsPerKill*(.9+ratio*.1))),
    drops:[...base.drops],
  };
}

/**
 * Resolve one escort encounter from a character level, route seed and route stop.
 * The seed is part of the activity/session state so the same encounter can be
 * replayed after reconnecting without relying on client-side randomness.
 */
export function merchantCaravanEncounter(level:number,seed:string,routeIndex:number):MerchantCaravanEncounter{
  const bracket=merchantCaravanBracketForLevel(level);
  const pool=POOLS[bracket.id];
  const index=stableHash(`${seed}:${bracket.id}:${routeIndex}`)%pool.length;
  const baseMonsterId=pool[index];
  const base=MONSTERS.find(monster=>monster.id===baseMonsterId);
  if(!base)throw new Error(`Unknown merchant caravan monster: ${baseMonsterId}`);
  const routeStop=ROUTE_STOPS[routeIndex%ROUTE_STOPS.length];
  const prefix=ENCOUNTER_PREFIXES[bracket.id==='local'?0:bracket.id==='trade'?1:2];
  return {bracket:bracket.id,index,baseMonsterId,displayName:`${prefix} ${base.name}`,routeStop,monster:scaleMonster(base,bracket.encounterLevel)};
}

export function merchantCaravanBracket(id:MerchantCaravanBracket){return MERCHANT_CARAVAN_BRACKETS.find(row=>row.id===id)!;}
