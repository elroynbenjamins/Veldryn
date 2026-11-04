import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {dungeonHealingPotionView} from '../src/core/coop-potion-view';
import type {CoopRunView} from '../src/core/coop-presentation';

const state=createCharacter(newGame(0),'IRONWARDEN','Potion Tester');
const id=state.character!.id;
state.character!.equippedHealingPotionId='RIVERHEART_DRAUGHT';
state.inventory.stacks=[{itemId:'RIVERHEART_DRAUGHT',quantity:3}];
const run:CoopRunView={runId:'test-run',mode:'qmode',phase:'awaiting_choice',tier:3,potionChargeCapacity:4,
 healingPotionUsesByActor:{[id]:2},syncedLevel:25,
 roleSlots:[{memberId:id,role:'tank',name:'Potion Tester',echo:false,currentHp:90,maximumHp:200,ready:true}],
 options:[]};
let view=dungeonHealingPotionView(run,state)!;
assert.equal(view.healPercent,35,'Alchemy balance is the authoritative 35% healing tier');
assert.equal(view.capacity,4,'tier-three capacity is four');
assert.equal(view.remaining,2,'charges are per actor and persist');
assert.equal(view.carried,3,'only carried Inventory funds a charge');
assert.equal(view.canUse,true,'healthy, available dungeon actor may consume');
assert.equal(dungeonHealingPotionView({...run,healingPotionUsesByActor:{[id]:4}},state)!.canUse,false,'tier cap enforced');
assert.equal(dungeonHealingPotionView({...run,roleSlots:[{...run.roleSlots[0],currentHp:200}]},state)!.canUse,false,'no full HP waste');
assert.equal(dungeonHealingPotionView({...run,roleSlots:[{...run.roleSlots[0],ready:false,currentHp:0}]},state)!.canUse,false,'cannot revive');
assert.equal(dungeonHealingPotionView({...run,phase:'resolving_node'},state)!.canUse,false,'no use during combat or node settlement');
assert.equal(dungeonHealingPotionView({...run,phase:'completed'},state)!.canUse,false,'no use after completion');
assert.equal(dungeonHealingPotionView(run,{...state,inventory:{...state.inventory,stacks:[]}})!.canUse,false,'bank or phantom stacks are not consumable');
assert.equal(dungeonHealingPotionView(run,{...state,character:{...state.character!,equippedHealingPotionId:'WARD_TONIC'}})!.canUse,false,'preparation tonics are not healing potions');
assert.equal(dungeonHealingPotionView(run,{...state,character:{...state.character!,equippedHealingPotionId:undefined}})!.name,undefined,'no selection is explicit');
assert.equal(dungeonHealingPotionView(run,{...state,character:{...state.character!,id:'other-character'}}),undefined,'other character cannot use owner slot');
console.log('PASS crafted dungeon healing display, tier budget, carried-only selection and combat lockout');
