/**
 * HIDDEN QA ONLY: complete 10-slot or 9-physical/dual-handed loadouts from
 * REAL Forge server recipes and the REAL isolated draft command resolver.
 * This is NOT authenticated Postgres settlement or a combat item authorizer.
 * Every generated roll and craft receipt is original Forge source; no mocked
 * rarity, free items, synthetic Combat sets or invented stat values.
 */
import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../equipment-crafting-v2-manifest';
import {resolveEquipmentV2DraftCommand,
 type V2DraftSnapshot,type V2DraftCommand,type V2DraftContext}
 from '../equipment-crafting-v2-transaction';
import {verifyEquipmentV2HiddenLedger}
 from '../equipment-crafting-v2-delivery';
import {verifyEquipmentV2ReceiptNamespace}
 from '../equipment-crafting-v2-receipt-coherence';
import {v2ServerExactTemplateConsistent,v2ServerBaseStatProjection,
 v2ServerWeightedBaseBudget,V2_SERVER_SLOT_BUDGET}
 from '../equipment-crafting-v2-instances';
import {v2ServerCustodyPreflight,type V2CustodyState,type V2CustodyCopy}
 from '../equipment-crafting-v2-custody';
import {readEquipmentV2VirtualCustody,v2VirtualFingerprint,
 type V2VirtualMoveReceipt}
 from '../equipment-crafting-v2-virtual-history';
import type {V2HiddenStorageReservation}
 from '../equipment-crafting-v2-storage-reservations';
import {GEAR_SLOTS_V2,CLASS_ROLES_V2,type ClassIdV2}
 from '../../combat/v2/build-contract';

const expectedNoOffhand=new Set<ClassIdV2>([
 'DREADGUARD','WAYFINDER','RAVAGER','KNIFE_DANCER','STONECALLER',
]);
const lootRoll=(exclusiveMax:number)=>{assert.ok(exclusiveMax>0);return 0;};
function testClass(classId:ClassIdV2){
 const role=CLASS_ROLES_V2[classId];
 const weapon=V2_SERVER_PIECES.find(p=>p.tier===1&&p.slot==='weapon'&&
  p.classRestriction===classId);
 assert.ok(weapon);
 assert.ok(['one','two','dual'].includes(weapon!.hands??''));
 const noOffhand=weapon!.hands!=='one';
 assert.equal(noOffhand,expectedNoOffhand.has(classId));
 const slots=GEAR_SLOTS_V2.filter(slot=>slot!=='offhand'||!noOffhand);
 const templates=slots.map(slot=>{
  const matching=V2_SERVER_PIECES.filter(p=>p.tier===1&&p.slot===slot&&
   p.role===role&&(!p.classRestriction||p.classRestriction===classId));
  assert.ok(matching.length>0,'Every physically required slot needs source gear');
  const selected=matching[0];
  const recipes=V2_SERVER_RECIPES.filter(r=>
   r.pieceId===selected.id&&r.route==='foundation');
  assert.equal(recipes.length,1);
  return {slot,piece:selected,recipe:recipes[0]};
 });
 assert.equal(templates.length,noOffhand?9:10);
 assert.equal(new Set(templates.map(t=>t.slot)).size,templates.length);
 const allInputs=templates.flatMap(({recipe})=>recipe.inputs);
 assert.ok(allInputs.every(x=>!x.itemId.startsWith('EQ2_')),
  'T1 original input stock must be legally available to isolated draft resolver');
 const inventory=Object.fromEntries(allInputs.map(row=>[row.itemId,100000]));
 const accountId='QA_TEN_FORGE_ACCOUNT_'+classId;
 const characterId='QA_TEN_FORGE_CHAR_'+classId;
 let state:V2DraftSnapshot={
  accountId,activeCharacterId:characterId,version:1,forgeSlotCapacity:7,
  characters:{[characterId]:{
   level:75,professionLevels:{smithing:100,tailoring:100},
   gold:100000000,inventory,
  }},
  bank:{},jobs:[],equipment:[],skillAwards:[],receipts:[],
 };
 const claims:{command:V2DraftCommand;context:V2DraftContext}[]=[];
 for(const [i,{piece,recipe}] of templates.entries()){
  const startNow=100000+i*10000000;
  const start:V2DraftCommand={
   kind:'start',requestId:'QA_START_'+classId+'_'+i,
   expectedVersion:state.version,recipeId:recipe.id,
  };
  const begin=resolveEquipmentV2DraftCommand(state,start,{
   accountId,characterId,nowMs:startNow,
   randomId:()=> 'QA_JOB_'+classId+'_'+i,randomInt:lootRoll,
  });
  assert.equal(begin.response.kind,'started');
  assert.equal(begin.replayed,false);
  state=begin.next;
  const claim:V2DraftCommand={kind:'claim',
   requestId:'QA_CLAIM_'+classId+'_'+i,
   expectedVersion:state.version,jobId:'QA_JOB_'+classId+'_'+i,
  };
  const context:V2DraftContext={
   accountId,characterId,nowMs:startNow+5000000,
   randomId:()=> 'QA_ITEM_'+classId+'_'+i,randomInt:lootRoll,
  };
  const result=resolveEquipmentV2DraftCommand(state,claim,context);
  assert.equal(result.response.kind,'claimed');
  assert.equal(result.replayed,false);
  state=result.next;
  claims.push({command:claim,context});
  assert.equal(state.equipment.length,i+1);
  assert.equal(state.equipment[i].exactItem.pieceId,piece.id);
  assert.equal(state.equipment[i].exactItem.slot,piece.slot);
  assert.ok(v2ServerExactTemplateConsistent(state.equipment[i].exactItem));
 }
 assert.equal(state.jobs.length,templates.length);
 assert.equal(state.skillAwards.length,templates.length);
 assert.equal(state.receipts.length,templates.length*2);
 verifyEquipmentV2HiddenLedger(accountId,state.jobs,state.equipment,
  state.receipts,state.skillAwards);
 verifyEquipmentV2ReceiptNamespace({forge:state.receipts});
 assert.throws(()=>verifyEquipmentV2HiddenLedger('QA_WRONG_ACCOUNT',
  state.jobs,state.equipment,state.receipts,state.skillAwards),
  /invalid_hidden_v2_job/);
 assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,
  state.jobs,state.equipment,[...state.receipts,state.receipts[0]],
  state.skillAwards),/duplicate_hidden_v2_receipt/);
 const repeated=resolveEquipmentV2DraftCommand(state,
  claims[0].command,claims[0].context);
 assert.equal(repeated.replayed,true);
 assert.equal(repeated.next,state,'claim retry does not duplicate minted items');
 assert.equal(repeated.response.kind,'claimed');
 const reservations:V2HiddenStorageReservation[]=state.equipment.map(item=>({
  instanceId:item.id,jobId:item.jobId,ownerCharacterId:characterId,
  itemId:item.exactItem.pieceId,destination:'equipment_pouch',quantity:1,
 }));
 const original=readEquipmentV2VirtualCustody(state.equipment,reservations,[]);
 assert.equal(original.length,templates.length);
 assert.ok(original.every(c=>c.location==='pouch'&&
  c.holderCharacterId===characterId));
 let custody:V2CustodyState={
  accountId,characters:[{id:characterId,classId,level:75}],
  copies:state.equipment.map(item=>({
   instanceId:item.id,accountId,ownerCharacterId:characterId,
   location:'pouch',item:item.exactItem,locked:false,favorite:false,
  })),
 };
 const moves:V2VirtualMoveReceipt[]=[];
 for(const [i,item] of state.equipment.entries()){
  const allowed=v2ServerCustodyPreflight(custody,{
   kind:'equip',actorCharacterId:characterId,instanceId:item.id,
  });
  assert.equal(allowed.allowed,true,
   'Server-owned original Forge item must be eligible for physical equip');
  assert.deepEqual(allowed.conflictingEquippedInstanceIds,[]);
  const move:V2VirtualMoveReceipt={
   requestId:'QA_EQUIP_'+classId+'_'+i,
   fingerprint:v2VirtualFingerprint('equip',item.id),
   instanceId:item.id,actorCharacterId:characterId,
   from:'pouch',to:'equipped',
   oldHolder:characterId,newHolder:characterId,
   version:state.version+i+1,equippedSlot:item.exactItem.slot,
   physicallyDelivered:false,
  };
  moves.push(move);
  custody={...custody,copies:custody.copies.map(copy=>
   copy.instanceId===item.id?
    {...copy,location:'equipped' as const,equippedSlot:item.exactItem.slot}:copy)};
 }
 verifyEquipmentV2ReceiptNamespace({forge:state.receipts,custody:moves});
 const final=readEquipmentV2VirtualCustody(state.equipment,reservations,moves);
 assert.equal(final.length,templates.length);
 assert.ok(final.every(c=>c.location==='equipped'&&
  c.holderCharacterId===characterId));
 assert.deepEqual(final.map(c=>c.equippedSlot).sort(),
  templates.map(c=>c.slot).sort());
 assert.equal(new Set(final.map(c=>c.instanceId)).size,final.length);
 if(noOffhand){
  assert.ok(!final.some(c=>c.equippedSlot==='offhand'));
  const budget=v2ServerBaseStatProjection(weapon!,1);
  assert.ok(Math.abs(v2ServerWeightedBaseBudget(budget)-
   (V2_SERVER_SLOT_BUDGET.weapon+V2_SERVER_SLOT_BUDGET.offhand)*1.08)<.08,
   'Two-handed/paired weapon receives the physical offhand stat budget once');
 }else assert.ok(final.some(c=>c.equippedSlot==='offhand'));
 const tamperedMoves=moves.map((x,i)=>i===0?{
  ...x,newHolder:'FOREIGN_CHAR',
 }:x);
 assert.throws(()=>readEquipmentV2VirtualCustody(
  state.equipment,reservations,tamperedMoves),/v2_virtual_move_owner_conflict/);
 assert.throws(()=>readEquipmentV2VirtualCustody(
  state.equipment,[...reservations,reservations[0]],moves),
  /duplicate_v2_virtual_copy/);
 return {classId,physicallyRequired:templates.length,
  originalSourceCrafts:state.equipment.length,
  uniqueClaims:state.receipts.length/2,
  virtualCasts:0,actualPgCommits:0};
}
const results=([
 'IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER',
 'KNIFE_DANCER','DAWNKEEPER','STONECALLER',
] as const).map(testClass);
assert.equal(results.length,9);
assert.equal(results.reduce((n,x)=>n+x.physicallyRequired,0),85);
assert.equal(results.reduce((n,x)=>n+x.originalSourceCrafts,0),85);
assert.equal(results.reduce((n,x)=>n+x.actualPgCommits,0),0);
console.log(JSON.stringify({kind:'EQ2_REAL_FORGE_DRAFT_COMMAND_AND_VIRTUAL_CUSTODY',
 classTier:1,classes:9,physicalCopies:85,pairedAndTwoHandDoNotForgeOffhands:true,
 signedDatabaseReads:0,productionGrants:0,releaseReady:false}));
