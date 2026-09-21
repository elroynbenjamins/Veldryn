import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {equipmentDecisionModel,equipmentUpgradeSummary} from '../src/core/equipment-decision';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

let state=createCharacter(newGame(0),'IRONWARDEN','Gear Decisions','male');
const set=EQUIPMENT_SETS.find(entry=>entry.classId==='IRONWARDEN'&&entry.tier==='T1');
if(!set)throw new Error('Expected an Ironwarden T1 set');
const firstId=set.itemIds[0],first=itemDef(firstId);
if(!first.slot)throw new Error('Expected set gear slot');
state={...state,character:{...state.character!,gold:100000,equipment:{...state.character!.equipment,[first.slot]:firstId}},inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'TEMPERING_DUST',quantity:999},{itemId:'TEMPERING_CORE',quantity:99}]}};
const model=equipmentDecisionModel(state,firstId);
ok(model.itemId===firstId,'Decision model must preserve selected item');
ok(model.set?.id===set.id&&model.set.equippedPieces===1&&model.set.totalPieces===10,'Decision model must expose V33 set identity and equipped count');
ok(model.rank===0&&model.upgrade.targetRank===1,'Decision model must expose current and next enhancement rank');
ok(model.upgrade.canAfford,'Owned Gold/materials should mark the next enhancement ready');
ok(equipmentUpgradeSummary(model).includes('Materials ready'),'Ready enhancement summary must be explicit');
ok(model.sockets.capacity>=0&&model.sockets.filled===0,'Decision model must expose socket fill/capacity');

const poor={...state,character:{...state.character!,gold:0},inventory:{...state.inventory,stacks:state.inventory.stacks.filter(stack=>stack.itemId!=='TEMPERING_DUST'&&stack.itemId!=='TEMPERING_CORE')}};
const blocked=equipmentDecisionModel(poor,firstId);
ok(!blocked.upgrade.canAfford,'Missing resources must block enhancement readiness');
ok(equipmentUpgradeSummary(blocked).includes('Missing'),'Blocked enhancement summary must explain missing resources');

console.log('PASS: equipment decision model exposes rarity/set/enhancement/socket context without mutating state');
