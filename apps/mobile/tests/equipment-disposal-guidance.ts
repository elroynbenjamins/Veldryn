import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {disposeCraftedGearInstance} from '../src/core/crafted-gear-ownership';
import {equipmentCopyDisposalDecision,equipmentDisposalExplanation} from '../src/core/equipment-disposal-guidance';
import type {GameState} from '../src/core/types';

const assert=require('node:assert/strict') as {equal:(a:unknown,b:unknown,message?:string)=>void;match:(a:string,b:RegExp,message?:string)=>void;deepEqual:(a:unknown,b:unknown,message?:string)=>void};
const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T1P_001')!;
const initial=createCharacter(newGame(0),recipe.classId,'Disposal Tester');
const copy=draftCraftedGearInstance({itemId:recipe.output.itemId,ownerCharacterId:initial.character!.id,jobId:'disposal-guide',createdAtMs:100,roll:.1});
const stack={itemId:copy.itemId,quantity:1,instanceId:copy.id};
const state:GameState={...initial,
 inventory:{...initial.inventory,stacks:[stack]},
 account:{...initial.account,craftedGearInstances:[copy]}};
assert.equal(equipmentCopyDisposalDecision(state,copy.id,'sell').allowed,true,'clean exact copy can be sold');
assert.equal(equipmentCopyDisposalDecision(state,copy.id,'salvage').allowed,true,'clean exact copy can be salvaged');
const socketed:GameState={...state,account:{...state.account,craftedGearInstances:[{...copy,
 enhancement:{...copy.enhancement,gemIds:['EMBER_SHARD'],statGemId:'EMBER_SHARD'}}]}};
for(const action of ['sell','salvage'] as const){
 const result=equipmentCopyDisposalDecision(socketed,copy.id,action);
 assert.equal(result.allowed,true,'socketed exact equipment copy can be disposed manually');
}
const upgraded:GameState={...state,account:{...state.account,craftedGearInstances:[{...copy,enhancement:{...copy.enhancement,rank:1}}]}};
assert.equal(equipmentCopyDisposalDecision(upgraded,copy.id,'sell').allowed,true,'upgraded exact copies are sellable when not manually protected');
assert.equal(equipmentCopyDisposalDecision(upgraded,copy.id,'salvage').allowed,true,'upgraded exact copies are salvageable when not manually protected');
// Regression: older saves retain an itemId-only +1 enchantment even after
// independently tracked forged copies (sometimes socketed) replace that gear.
// Manual exact-copy disposal must not be blocked by the orphaned legacy key.
const legacyEnhancement={rank:1,failures:0,gemIds:[] as string[]};
const legacyAndSocketed:GameState={...socketed,character:{...socketed.character!,
 gearEnhancements:{...(socketed.character!.gearEnhancements??{}),[copy.itemId]:legacyEnhancement}}};
for(const action of ['sell','salvage'] as const){
 assert.equal(equipmentCopyDisposalDecision(legacyAndSocketed,copy.id,action).allowed,true,
  'an unrelated itemId-only old enchantment must not block an exact copy');
}
const legacyPouch:GameState={...legacyAndSocketed,
 inventory:{...legacyAndSocketed.inventory,stacks:[]},
 character:{...legacyAndSocketed.character!,equipmentPouch:{capacity:30,stacks:[stack]}}};
assert.equal(equipmentCopyDisposalDecision(legacyPouch,copy.id,'salvage').allowed,true,
 'a socketed, exact pouch copy can be salvaged despite a stale itemId +1 record');
const legacyPouchSalvaged=disposeCraftedGearInstance(legacyPouch,copy.id,'salvage');
assert.equal(legacyPouchSalvaged.account.craftedGearInstances?.some(row=>row.id===copy.id),false,
 'only the selected exact copy is destroyed');
assert.equal(legacyPouchSalvaged.character!.equipmentPouch!.stacks.length,0,
 'the selected pouch copy is removed');
assert.deepEqual(legacyPouchSalvaged.character!.gearEnhancements?.[copy.itemId],legacyEnhancement,
 'the unrelated historical enhancement record remains untouched for reconciliation');
assert.equal(legacyPouch.account.craftedGearInstances?.some(row=>row.id===copy.id),true,
 'the original state retains its exact copy and receipt');

const locked:GameState={...state,account:{...state.account,craftedGearInstances:[{...copy,locked:true}]}};
assert.match(equipmentCopyDisposalDecision(locked,copy.id,'sell').reason??'',/locked/i,'per-copy lock persists');
const typeLocked:GameState={...state,settings:{...state.settings,lockedItemIds:[copy.itemId]}};
assert.equal(equipmentCopyDisposalDecision(typeLocked,copy.id,'sell').allowed,false,'type-level lock blocks the preview');
let directTypeLockBlocked=false;
try{disposeCraftedGearInstance(typeLocked,copy.id,'sell')}catch(error){directTypeLockBlocked=/locked/i.test(String(error))}
assert.equal(directTypeLockBlocked,true,'type-level lock cannot be bypassed with an exact-copy server command');
const favorite:GameState={...state,settings:{...state.settings,favoriteItemIds:[copy.itemId]}};
assert.match(equipmentCopyDisposalDecision(favorite,copy.id,'sell').reason??'',/favorite/i,'favorite remains protected');
const unknown=equipmentCopyDisposalDecision(state,'not-a-receipt','sell');
assert.equal(unknown.allowed,false,'unknown receipt never enters a command');
const full:GameState={...state,inventory:{capacity:1,stacks:[{itemId:'GEM_DUST',quantity:1}]},
 character:{...state.character!,equipmentPouch:{capacity:30,stacks:[stack]}}};
assert.equal(equipmentCopyDisposalDecision(full,copy.id,'sell').allowed,true,'full Inventory does not block a safe pouch sale');
const blocked=equipmentCopyDisposalDecision(full,copy.id,'salvage');
assert.equal(blocked.allowed,false,'full Inventory can prevent material recovery');
assert.match(blocked.reason??'',/full/i,'capacity problem remains visible');
assert.match(equipmentDisposalExplanation(blocked.reason??'').nextStep,/Free an Inventory slot/,'capacity advice is actionable');
assert.deepEqual(full.account.craftedGearInstances,state.account.craftedGearInstances,'previews never remove original Forge receipts');
assert.deepEqual(full.character!.equipmentPouch!.stacks,[stack],'previews never destroy physical gear');
console.log('PASS: exact-copy disposal explanations, socketed/upgraded disposal, locked/favorite protection and capacity');
