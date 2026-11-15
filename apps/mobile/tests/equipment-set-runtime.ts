import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {itemDef} from '../src/content/items';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {activeEquipmentBuildStats,activeEquipmentSetRuntime,equipmentSetBonusCoverage,isLiveSixPieceBonus,equipmentSetCombatModifiers,equipmentSetStaticStatsForCount,parseEquipmentSetStaticBonus} from '../src/core/equipment-set-runtime';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function close(actual:number,expected:number,message:string){if(Math.abs(actual-expected)>0.000001)throw new Error(message+' · expected '+expected+', got '+actual)}
function withSetPieces(state:GameState,setId:string,count:number){
  const set=EQUIPMENT_SETS.find(row=>row.id===setId);if(!set||!state.character)throw new Error('Missing test set');
  const equipment={...state.character.equipment};
  for(const id of set.itemIds.slice(0,count)){const item=itemDef(id);if(!item.slot)throw new Error('Set piece without slot');equipment[item.slot]=id;}
  return {...state,character:{...state.character,equipment}};
}

const coverage=equipmentSetBonusCoverage();
ok(coverage.setCount===162,'Expected all 162 shipped V33 sets in runtime coverage');
ok(coverage.unsupportedStatic.length===0,'Every early 2/4/6/8/10 and later 2/4/8/10 bonus must parse: '+coverage.unsupportedStatic.slice(0,3).join(' | '));

ok(EQUIPMENT_SETS.filter(row=>/^T[1-4]$/.test(row.tier)&&isLiveSixPieceBonus(row)).length===72,'All 72 T1–T4 six-piece bonuses must be always-on');
ok(EQUIPMENT_SETS.filter(row=>/^T[5-9]$/.test(row.tier)&&isLiveSixPieceBonus(row)).length===0,'T5+ conditional hooks must not be treated as static');
const oathbound=EQUIPMENT_SETS.find(row=>row.id==='T1_001');if(!oathbound)throw new Error('Missing Oathbound Rampart');
const parsed=parseEquipmentSetStaticBonus('Full Set Mastery: +3% Armor and +2% Tenacity.');
close(parsed.armor??0,.03,'Parser must read the first stat in a multi-stat bonus');
close(parsed.tenacity??0,.02,'Parser must read the second stat in a multi-stat bonus');

const at2=equipmentSetStaticStatsForCount(oathbound,2);
close(at2.maxHp,.03,'Oathbound 2pc must grant +3% Max HP');
close(at2.armor,0,'Oathbound 4pc must remain locked at 2 pieces');

const at4=equipmentSetStaticStatsForCount(oathbound,4);
close(at4.maxHp,.03,'Oathbound 2pc persists at 4 pieces');
close(at4.armor,.04,'Oathbound 4pc must grant +4% Armor');

const at6=equipmentSetStaticStatsForCount(oathbound,6);
close(at6.maxHp,.03,'6pc preserves the earlier Max HP bonus');
close(at6.armor,.04,'6pc preserves the earlier Armor bonus');
close(at6.ward,.02,'6pc adds its live Ward bonus in all combat');

const at8=equipmentSetStaticStatsForCount(oathbound,8);
close(at8.maxHp,.06,'Oathbound 8pc must stack another +3% Max HP');

const at10=equipmentSetStaticStatsForCount(oathbound,10);
close(at10.armor,.07,'Oathbound 10pc must stack +3% Armor on the 4pc bonus');
close(at10.tenacity,.02,'Oathbound 10pc must grant +2% Tenacity');

let state=createCharacter(newGame(0),'IRONWARDEN','Set Runtime','male');
const base=effectiveStats(state);
state=withSetPieces(state,'T1_001',2);
const runtime2=activeEquipmentSetRuntime(state),stats2=effectiveStats(state);
ok(runtime2.activeSets[0]?.activeThresholds.join(',')==='2','Exactly the 2pc threshold should be active at two pieces');
close(runtime2.stats.maxHp,.03,'Live runtime must expose Oathbound 2pc Max HP');
ok(stats2.hp>base.hp,'Live effective stats must include set Max HP');

state=withSetPieces(state,'T1_001',6);
const runtime6=activeEquipmentSetRuntime(state);
ok(runtime6.activeSets[0]?.activeThresholds.join(',')==='2,4,6','6pc threshold should appear in active threshold state');
ok(runtime6.activeSets[0]?.sixPieceStatus==='active','Early 6pc must be active in the character runtime');
close(runtime6.stats.ward,.02,'Early 6pc bonus must contribute to equipped combat stats');
ok(runtime6.activeSets[0]?.sixPieceText===oathbound.sixPiece,'6pc hook must preserve the exact authored catalog text');

state=withSetPieces(state,'T1_001',10);
const runtime10=activeEquipmentSetRuntime(state),stats10=effectiveStats(state);
ok(runtime10.activeSets[0]?.activeThresholds.join(',')==='2,4,6,8,10','Full V33 threshold chain must activate at ten pieces');
close(runtime10.stats.maxHp,.06,'Full Oathbound runtime must include both Max HP thresholds');
close(runtime10.stats.armor,.07,'Full Oathbound runtime must include both Armor thresholds');
close(runtime10.stats.tenacity,.02,'Full Oathbound runtime must include Tenacity mastery');
close(stats10.armor??0,.07,'Effective stats must surface live Armor');
close(stats10.tenacity??0,.02,'Effective stats must surface live Tenacity');

const t5Set=EQUIPMENT_SETS.find(row=>row.id==='T5_001');if(!t5Set)throw new Error('Missing T5_001 set');
let t5State=createCharacter(newGame(0),'IRONWARDEN','Affix Test','male');
t5State=withSetPieces(t5State,'T5_001',10);
const t5Build=activeEquipmentBuildStats(t5State);
ok(t5Build.haste>.01,'Full T5 build stats must include Haste from Gloves affix slot');
ok(activeEquipmentSetRuntime(t5State).activeSets[0]?.sixPieceStatus==='trigger-hook-pending','T5 conditional 6pc remains pending');
ok(t5Build.critRate>.01,'Full T5 build stats must include Crit Rate from Amulet affix slot');
ok(t5Build.evasion>.01,'Full T5 build stats must include Evasion from Boots affix slot');
const t5Combat=equipmentSetCombatModifiers(t5State);
ok(t5Combat.speedMultiplier>1,'T5 Haste affix must increase combat speed multiplier');
ok(t5Combat.incomingDamageMultiplier<1,'T5 Evasion affix must reduce incoming damage multiplier');
ok(t5Combat.critExpectedMultiplier>1,'T5 Crit Rate affix must increase expected crit multiplier');

console.log('PASS: T1–T4 6pc static bonuses apply live, T5+ 6pc stays pending, and build stats reach combat');
