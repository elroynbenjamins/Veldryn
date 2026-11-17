import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
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
 assert.equal(result.allowed,false,'socketed copy stays protected');
 assert.match(result.reason??'',/socketed gem/i,'specific gem protection is shown');
 assert.equal(equipmentDisposalExplanation(result.reason??'').canExtractGem,true,'player receives extraction route');
}
const upgraded:GameState={...state,account:{...state.account,craftedGearInstances:[{...copy,enhancement:{...copy.enhancement,rank:1}}]}};
assert.match(equipmentCopyDisposalDecision(upgraded,copy.id,'sell').reason??'',/enhanced/i,'upgrade protection is distinct from gem protection');
assert.equal(equipmentDisposalExplanation('Enhanced (upgraded) equipment cannot be sold or salvaged').canExtractGem,false,'upgrade is not promised to become disposable after gem extraction');
const locked:GameState={...state,account:{...state.account,craftedGearInstances:[{...copy,locked:true}]}};
assert.match(equipmentCopyDisposalDecision(locked,copy.id,'sell').reason??'',/locked/i,'per-copy lock persists');
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
console.log('PASS: exact-copy disposal explanations, extracted-gem guidance, upgrades, locked/favorite protection and capacity');
