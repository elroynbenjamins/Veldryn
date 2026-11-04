import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {dungeonTonicView} from '../src/core/coop-tonic-view';
import type {CoopRunView} from '../src/core/coop-presentation';

const state=createCharacter(newGame(0),'RAVAGER','Tonic Tester');
const actor=state.character!.id;
state.inventory.stacks=[
 {itemId:'VIGOR_TONIC',quantity:2},
 {itemId:'HARMONY_TONIC',quantity:1},
 {itemId:'OATH_WARD_TONIC',quantity:1},
 {itemId:'DEWLEAF_DRAUGHT',quantity:8},
];
const run:CoopRunView={runId:'run',mode:'qmode',phase:'awaiting_choice',tier:3,syncedLevel:25,
 potionPreparationOpen:true,preparedAlchemyPotionIdsByActor:{},
 roleSlots:[{memberId:actor,role:'damage',name:'Tonic Tester',echo:false}],options:[]};
const view=dungeonTonicView(run,state)!;
assert.equal(view.open,true,'tonics available only before first room');
assert.equal(view.options.length,3,'healing draughts never appear as preparations');
assert.equal(view.options[0].id,'HARMONY_TONIC','tonics sort by tier');
assert.equal(view.options.find(row=>row.id==='VIGOR_TONIC')!.owned,2,'show real carried count');
assert.equal(view.options.find(row=>row.id==='OATH_WARD_TONIC')!.effect,'−15% damage taken','real T3 Ward amount');
assert.equal(view.options.find(row=>row.id==='HARMONY_TONIC')!.effect,'+2% damage · +5% healing/shields','support benefit');
assert.equal(dungeonTonicView({...run,potionPreparationOpen:false},state),undefined,'cannot prepare after first room');
assert.equal(dungeonTonicView({...run,phase:'resolving_node'},state),undefined,'cannot prepare during battle');
const prepared=dungeonTonicView({...run,preparedAlchemyPotionIdsByActor:{[actor]:'VIGOR_TONIC'}},state)!;
assert.equal(prepared.open,false,'one tonic only');
assert.equal(prepared.preparedName,'Vigor Tonic','show saved server selection');
assert.equal(prepared.options.length,0,'no second purchase UI');
assert.equal(dungeonTonicView(run,{...state,character:{...state.character!,id:'another-character'}}),undefined,'no cross-character selection');
console.log('PASS role tonic list, precise effects and first-room lockout');
