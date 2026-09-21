import {EQUIPMENT_SETS,equipmentSetDef,equippedSetPieceCount,type EquipmentSetDef} from '../content/equipment-sets';
import {itemDef} from '../content/items';
import type {GameState} from './types';

export type EquipmentSetStatKey=
  'maxHp'|'armor'|'ward'|'tenacity'|'haste'|'power'|'accuracy'|'penetration'|'potency'|'critRate'|'critDamage'|'evasion';

export type EquipmentSetStats=Record<EquipmentSetStatKey,number>;

const EMPTY_STATS:EquipmentSetStats={
  maxHp:0,armor:0,ward:0,tenacity:0,haste:0,power:0,accuracy:0,penetration:0,potency:0,critRate:0,critDamage:0,evasion:0,
};
const STAT_KEY_BY_LABEL:Record<string,EquipmentSetStatKey>={
  'max hp':'maxHp',armor:'armor',ward:'ward',tenacity:'tenacity',haste:'haste',power:'power',accuracy:'accuracy',
  penetration:'penetration',potency:'potency','crit rate':'critRate','crit damage':'critDamage',evasion:'evasion',
};
const STATIC_BONUS_RE=/\+(\d+(?:\.\d+)?)%\s+(Max HP|Armor|Ward|Tenacity|Haste|Power|Accuracy|Penetration|Potency|Crit Rate|Crit Damage|Evasion)/gi;

export function emptyEquipmentSetStats():EquipmentSetStats{return {...EMPTY_STATS};}

export function parseEquipmentSetStaticBonus(text:string):Partial<EquipmentSetStats>{
  const result:Partial<EquipmentSetStats>={};
  for(const match of String(text??'').matchAll(STATIC_BONUS_RE)){
    const key=STAT_KEY_BY_LABEL[match[2].toLowerCase()],value=Number(match[1])/100;
    if(key&&Number.isFinite(value))result[key]=(result[key]??0)+value;
  }
  return result;
}

function addStats(target:EquipmentSetStats,source:Partial<EquipmentSetStats>){
  for(const key of Object.keys(EMPTY_STATS) as EquipmentSetStatKey[])target[key]+=source[key]??0;
}

export interface ActiveEquipmentSetRuntime{
  setId:string;
  setName:string;
  tier:string;
  pieces:number;
  activeThresholds:number[];
  staticStats:EquipmentSetStats;
  sixPieceText?:string;
  sixPieceStatus:'locked'|'trigger-hook-pending';
}

export interface EquipmentSetRuntimeSummary{
  stats:EquipmentSetStats;
  activeSets:ActiveEquipmentSetRuntime[];
}

export function equipmentSetStaticStatsForCount(set:EquipmentSetDef,pieces:number){
  const stats=emptyEquipmentSetStats();
  if(pieces>=2)addStats(stats,parseEquipmentSetStaticBonus(set.twoPiece));
  if(pieces>=4)addStats(stats,parseEquipmentSetStaticBonus(set.fourPiece));
  if(pieces>=8)addStats(stats,parseEquipmentSetStaticBonus(set.eightPiece));
  if(pieces>=10)addStats(stats,parseEquipmentSetStaticBonus(set.tenPiece));
  return stats;
}

export function activeEquipmentSetRuntime(state:GameState):EquipmentSetRuntimeSummary{
  const total=emptyEquipmentSetStats();
  if(!state.character)return {stats:total,activeSets:[]};
  const setIds=new Set<string>();
  for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;
    const setId=itemDef(itemId).equipmentSetId;if(setId)setIds.add(setId);
  }
  const activeSets:ActiveEquipmentSetRuntime[]=[];
  for(const setId of setIds){
    const set=equipmentSetDef(setId);if(!set)continue;
    const pieces=equippedSetPieceCount(state.character.equipment,set);
    const staticStats=equipmentSetStaticStatsForCount(set,pieces);
    addStats(total,staticStats);
    activeSets.push({
      setId:set.id,setName:set.name,tier:set.tier,pieces,
      activeThresholds:[2,4,6,8,10].filter(value=>pieces>=value),
      staticStats,
      sixPieceText:pieces>=6?set.sixPiece:undefined,
      sixPieceStatus:pieces>=6?'trigger-hook-pending':'locked',
    });
  }
  return {stats:total,activeSets:activeSets.sort((a,b)=>b.pieces-a.pieces||a.setId.localeCompare(b.setId))};
}

export function equipmentSetBonusCoverage(){
  const unsupportedStatic:string[]=[];
  for(const set of EQUIPMENT_SETS){
    for(const [threshold,text] of [[2,set.twoPiece],[4,set.fourPiece],[8,set.eightPiece],[10,set.tenPiece]] as const){
      const matches=[...String(text).matchAll(STATIC_BONUS_RE)];
      if(!matches.length)unsupportedStatic.push(`${set.id} ${threshold}pc: ${text}`);
    }
  }
  return {setCount:EQUIPMENT_SETS.length,unsupportedStatic};
}

/**
 * Maps authored always-on V33 stats into the current idle combat simulator.
 * This does not invent 6pc trigger behavior: those remain explicit trigger hooks
 * until the active-skill/ally/barrier event model can fire them faithfully.
 */
export function equipmentSetCombatModifiers(state:GameState){
  const stats=activeEquipmentSetRuntime(state).stats;
  const baseAccuracy=0.84,baseCritChance=0.05,baseCritDamage=0.50;
  const accuracyMultiplier=(baseAccuracy+stats.accuracy)/baseAccuracy;
  const baseCritExpected=1+baseCritChance*baseCritDamage;
  const setCritExpected=1+(baseCritChance+stats.critRate)*(baseCritDamage+stats.critDamage);
  return {
    maxHpMultiplier:1+stats.maxHp,
    defenseMultiplier:1+stats.armor,
    incomingDamageMultiplier:Math.max(.5,(1-stats.ward)*(1-stats.evasion)),
    speedMultiplier:1+stats.haste,
    powerMultiplier:1+stats.power,
    accuracyMultiplier,
    critExpectedMultiplier:setCritExpected/baseCritExpected,
    penetrationMultiplier:1+stats.penetration,
    recoveryMultiplier:1+stats.potency,
    tenacity:stats.tenacity,
    stats,
  };
}
