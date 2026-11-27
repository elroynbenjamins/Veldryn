import assert from 'node:assert/strict';
import {inspectMarketPhysicalReadback} from '../market-eq2-physical-readback-review';
const empty=()=>({capacity:30,stacks:[] as {itemId:string;instanceId?:string;quantity:number}[]});
const character=(id:string)=>({id,equipmentPouch:empty(),equipmentInstanceIds:{} as Record<string,string>});
const copy={itemId:'EQ2_TEST_HELMET',instanceId:'copy-1',quantity:1};
const base=()=>{
 const state={version:11,account:{craftedGearInstances:[] as {id:string}[]},character:character('a1'),
  inventory:empty(),overflow:{stacks:[] as typeof copy[]},bank:empty(),
  otherCharacters:[{character:character('a2'),inventory:empty(),overflow:{stacks:[] as typeof copy[]}}],
  settings:{lockedItemIds:[] as string[],favoriteItemIds:[] as string[]}};
 state.inventory.stacks.push({...copy});
 return {actorAccountId:'a',expectedRevision:9,ownedCharacterIds:['a1','a2'],
  row:{account_id:'a',character_id:'a1',revision:9,state},
  instanceId:'copy-1',itemId:copy.itemId,expectedLocation:'inventory' as 'inventory'|'pouch'|'bank'|'equipped'|'overflow',
  expectedCharacterId:'a1' as string|null,protectedInstanceIds:[] as string[]};
};
let count=0;
function test(name:string,mutate:(x:ReturnType<typeof base>)=>void,reason:string,match=false){
 const x=base();mutate(x);const before=JSON.stringify(x);
 const result=inspectMarketPhysicalReadback(x);
 assert.deepEqual(result,{reason,physicalMatch:match,canCommit:false,marketAuthorized:false},name);
 assert.equal(JSON.stringify(x),before,'never mutate source');
 count++;
}
test('exact source shape',()=>{},'physical_match_requires_original_mint_and_atomic_recheck',true);
test('wrong actor',x=>{x.row.account_id='b'},'account_or_revision');
test('stale revision',x=>{x.row.revision=8},'account_or_revision');
test('active character mismatch',x=>{x.row.character_id='a2'},'incomplete_state');
test('missing character',x=>{x.row.state.otherCharacters=[]},'roster_mismatch');
test('foreign character',x=>{x.ownedCharacterIds=['a1','b1']},'roster_mismatch');
test('duplicate in alt overflow',x=>{x.row.state.otherCharacters[0].overflow.stacks.push({...copy})},'physical_copy_count');
test('duplicate active overflow',x=>{x.row.state.overflow.stacks.push({...copy})},'physical_copy_count');
test('duplicate bank',x=>{x.row.state.bank.stacks.push({...copy})},'physical_copy_count');
test('duplicate equipped',x=>{x.row.state.character.equipmentInstanceIds.helmet=copy.instanceId},'physical_copy_count');
test('legacy registry collision',x=>{x.row.state.account.craftedGearInstances.push({id:copy.instanceId})},'legacy_instance_collision');
test('wrong item',x=>{x.row.state.inventory.stacks[0].itemId='OTHER'},'physical_location_mismatch');
test('bad quantity',x=>{x.row.state.inventory.stacks[0].quantity=2},'invalid_exact_quantity');
test('protected id',x=>{x.protectedInstanceIds.push(copy.instanceId)},'protected_copy',true);
test('locked item id',x=>{x.row.state.settings.lockedItemIds.push(copy.itemId)},'protected_copy',true);
test('favorite copy',x=>{x.row.state.settings.favoriteItemIds.push(copy.instanceId)},'protected_copy',true);
test('bank held',x=>{x.row.state.inventory.stacks=[];x.row.state.bank.stacks.push({...copy});x.expectedLocation='bank';x.expectedCharacterId=null},'location_not_listable',true);
test('overflow held',x=>{x.row.state.inventory.stacks=[];x.row.state.overflow.stacks.push({...copy});x.expectedLocation='overflow'},'location_not_listable',true);
test('equipped',x=>{x.row.state.inventory.stacks=[];x.row.state.character.equipmentInstanceIds.helmet=copy.instanceId;x.expectedLocation='equipped'},'location_not_listable',true);
test('alt pouch',x=>{x.row.state.inventory.stacks=[];x.row.state.otherCharacters[0].character.equipmentPouch.stacks.push({...copy});x.expectedLocation='pouch';x.expectedCharacterId='a2'},'physical_match_requires_original_mint_and_atomic_recheck',true);
test('missing copy',x=>{x.row.state.inventory.stacks=[]},'physical_copy_count');
test('bad capacity',x=>{x.row.state.inventory.capacity=0},'invalid_capacity');
test('incomplete pouch',x=>{delete (x.row.state.character as Partial<typeof x.row.state.character>).equipmentPouch},'missing_store');
console.log('Market source-shaped physical readback checks passed: '+count);
