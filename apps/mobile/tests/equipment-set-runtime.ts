import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {itemDef} from '../src/content/items';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {activeEquipmentSetRuntime,equipmentSetBonusCoverage,equipmentSetStaticStatsForCount,parseEquipmentSetStaticBonus} from '../src/core/equipment-set-runtime';
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
ok(coverage.setCount===243,'Expected all 243 V33 sets in runtime coverage');
ok(coverage.unsupportedStatic.length===0,'Every 2/4/8/10 V33 bonus must parse as an always-on runtime stat: '+coverage.unsupportedStatic.slice(0,3).join(' | '));

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
close(at6.maxHp,.03,'6pc conditional must not invent a static Max HP bonus');
close(at6.armor,.04,'6pc conditional must not invent a static Armor bonus');

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
ok(runtime6.activeSets[0]?.sixPieceStatus==='trigger-hook-pending','6pc authored condition must stay a trigger hook instead of receiving a fake static scalar');
ok(runtime6.activeSets[0]?.sixPieceText===oathbound.sixPiece,'6pc hook must preserve the exact authored catalog text');

state=withSetPieces(state,'T1_001',10);
const runtime10=activeEquipmentSetRuntime(state),stats10=effectiveStats(state);
ok(runtime10.activeSets[0]?.activeThresholds.join(',')==='2,4,6,8,10','Full V33 threshold chain must activate at ten pieces');
close(runtime10.stats.maxHp,.06,'Full Oathbound runtime must include both Max HP thresholds');
close(runtime10.stats.armor,.07,'Full Oathbound runtime must include both Armor thresholds');
close(runtime10.stats.tenacity,.02,'Full Oathbound runtime must include Tenacity mastery');
close(stats10.armor??0,.07,'Effective stats must surface live Armor');
close(stats10.tenacity??0,.02,'Effective stats must surface live Tenacity');

console.log('PASS: all V33 always-on set bonuses parse and Oathbound 2/4/6/8/10 runtime thresholds behave correctly');
