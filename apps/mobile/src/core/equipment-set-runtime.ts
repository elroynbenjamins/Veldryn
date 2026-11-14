import {EQUIPMENT_SETS,equipmentSetDef,equippedSetPieceCount,type EquipmentSetDef} from '../content/equipment-sets';
import {itemDef} from '../content/items';
import {equippedCanonicalStatGemBonusesV1} from './equipment-enhancement';
import {equippedT5EquipmentAffixStats} from './t5-equipment-affixes';
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

/** T1–T4 have always-on 6pc bonuses; T5+ retain conditional hooks. */
export function isLiveSixPieceBonus(set:Pick<EquipmentSetDef,'tier'|'sixPiece'>):boolean{
  return /^T[1-4]$/.test(set.tier)&&/^\+\d+(?:\.\d+)?% (Max HP|Armor|Ward|Tenacity|Haste|Power|Accuracy|Penetration|Potency|Crit Rate|Crit Damage|Evasion)$/.test(set.sixPiece);
}
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
  sixPieceStatus:'locked'|'active'|'trigger-hook-pending';
}

export interface EquipmentSetRuntimeSummary{
  stats:EquipmentSetStats;
  activeSets:ActiveEquipmentSetRuntime[];
}

export function equipmentSetStaticStatsForCount(set:EquipmentSetDef,pieces:number){
  const stats=emptyEquipmentSetStats();
  if(pieces>=2)addStats(stats,parseEquipmentSetStaticBonus(set.twoPiece));
  if(pieces>=4)addStats(stats,parseEquipmentSetStaticBonus(set.fourPiece));
  if(pieces>=6&&isLiveSixPieceBonus(set))addStats(stats,parseEquipmentSetStaticBonus(set.sixPiece));
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
      sixPieceStatus:pieces>=6?(isLiveSixPieceBonus(set)?'active':'trigger-hook-pending'):'locked',
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
    if(/^T[1-4]$/.test(set.tier)&&!isLiveSixPieceBonus(set))unsupportedStatic.push(`${set.id} 6pc: ${set.sixPiece}`);
  }
  return {setCount:EQUIPMENT_SETS.length,unsupportedStatic};
}

/**
 * Full always-on secondary-stat bonuses from sets and equipped canonical
 * Stat Gems. The server's gem catalog defines which values are percent
 * multipliers vs. additive percentage points. The mobile character model
 * represents most of those stats as bonus ratios (base = 0), so percent
 * multipliers apply to 1 + existing bonus; otherwise gems on a character
 * without a matching set would incorrectly have no effect.
 *
 * Critical Damage is special: its underlying base is the 0.50 critical
 * damage bonus above a 1.0 normal hit (displayed as a 1.5x crit).
 */
export function activeEquipmentBuildStats(state:GameState):EquipmentSetStats{
  const sets=activeEquipmentSetRuntime(state).stats;
  const gems=equippedCanonicalStatGemBonusesV1(state);
  const t5Affixes=equippedT5EquipmentAffixStats(state);
  const p=gems.statPercent,pp=gems.statPercentagePoints;
  const multiplied=(bonus:number,percent:number|undefined)=>(1+bonus)*(1+(percent??0))-1;
  return {
    maxHp:multiplied(sets.maxHp,p.maxHp),
    armor:multiplied(sets.armor,p.armor),
    ward:multiplied(sets.ward,p.ward),
    tenacity:multiplied(sets.tenacity,p.tenacity),
    haste:multiplied(sets.haste,p.haste)+t5Affixes.haste,
    power:multiplied(sets.power,p.power),
    accuracy:sets.accuracy+(pp.accuracy??0),
    penetration:sets.penetration+(pp.penetration??0),
    potency:multiplied(sets.potency,p.potency),
    critRate:sets.critRate+(pp.critRate??0)+t5Affixes.critRate,
    critDamage:(.5+sets.critDamage)*(1+(p.critDamage??0))-.5,
    evasion:sets.evasion+(pp.evasion??0)+t5Affixes.evasion,
  };
}

/**
 * Maps authored always-on V33 stats into the current idle combat simulator.
 * T1–T4 six-piece bonuses are always-on stats. T5+ conditional mechanics
 * remain event hooks until their actual skill/ally/barrier triggers exist.
 */
export function equipmentSetCombatModifiers(state:GameState,baseCritChance=.05,baseAccuracy=.84){
  const stats=activeEquipmentBuildStats(state);
  const baseCritDamage=0.50;
  const accuracyMultiplier=Math.min(.99,baseAccuracy+stats.accuracy)/baseAccuracy;
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
