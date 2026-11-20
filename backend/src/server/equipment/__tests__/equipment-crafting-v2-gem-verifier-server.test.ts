import assert from 'node:assert/strict';
import {STAT_GEMS_V1,EFFECT_GEMS_V1,gemItemId} from '../gems/gem-catalog-v1';
import {v2ServerSocketGemKind} from '../equipment-crafting-v2-gem-identity';
import {verifyEquipmentV2GemSidecar} from '../equipment-crafting-v2-gem-verifier';
import type {V2GemSidecarState} from '../equipment-crafting-v2-gem-sidecar-types';
import {v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import type {V2DraftItem} from '../equipment-crafting-v2-transaction';

let checked=0;
for(const kind of ['stat','effect'] as const){
 for(const family of kind==='stat'?STAT_GEMS_V1:EFFECT_GEMS_V1){
  for(const grade of [1,2,3,4,5] as const){
   assert.equal(v2ServerSocketGemKind(gemItemId(family.familyId,grade)),kind);
   checked++;
  }
 }
}
assert.equal(checked,160,'All 12 stat and 20 effect families have five grades');
for(const bad of [undefined,null,'STAT_MIGHT','gem:stat_might:g0',
 'gem:stat_might:g6','gem:stat_missing:g1','gem:effect_missing:g1',
 'raw_gem:stat_might:g1','gem:stat_might:g01','gem:effect_momentum:g1;DROP',
 'gem:stat_might:g1 ']){
 assert.throws(()=>v2ServerSocketGemKind(bad),/unknown_v2_socket_gem/);
}
const canonical=v2ServerRecipeAndPiece('EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
if(!canonical)throw Error('missing_eq2_server_gem_fixture');
const outcome=draftEquipmentV2Outcome({
 recipeId:canonical.recipe.id,pieceId:canonical.piece.id,tier:canonical.piece.tier,
 role:canonical.piece.role,slot:canonical.piece.slot,
},()=>0);
const item:V2DraftItem={
 id:'socket-server-copy',accountId:'socket-owner',ownerCharacterId:'socket-hero',
 jobId:'socket-forge-job',createdAtMs:2_000_000_000_000,
 outcome,exactItem:v2ServerCreateExactTemplate(canonical.piece,outcome),
};
const first='gem:stat_might:g1',second='gem:stat_keen:g1';
const base:V2GemSidecarState={
 slots:[{instanceId:item.id,stat:{gemId:second,rollPercent:110}}],
 receipts:[
  {requestId:'socket-request-01',fingerprint:'gem:'+item.id+':'+first,
   instanceId:item.id,socket:'stat',gemId:first,source:'gem_pouch',
   rollPercent:90,burnedGemId:null,version:21},
  {requestId:'socket-request-02',fingerprint:'gem:'+item.id+':'+second,
   instanceId:item.id,socket:'stat',gemId:second,source:'bank',
   rollPercent:110,burnedGemId:first,version:22},
 ],
};
const original=JSON.stringify(base);
assert.doesNotThrow(()=>verifyEquipmentV2GemSidecar([item],base));
assert.equal(JSON.stringify(base),original,'Server receipt verification must be read-only');
const tamper=(mutate:(row:V2GemSidecarState)=>void,pattern:RegExp)=>{
 const copy=structuredClone(base);mutate(copy);
 assert.throws(()=>verifyEquipmentV2GemSidecar([item],copy),pattern);
};
tamper(s=>{s.slots[0].stat!.rollPercent=115},/v2_gem_sidecar_state_mismatch/);
tamper(s=>{s.receipts[1].burnedGemId=null},/invalid_v2_gem_receipt_history/);
tamper(s=>{s.receipts[1].requestId=s.receipts[0].requestId},/invalid_v2_gem_receipt/);
tamper(s=>{s.receipts[1].version=20},/out_of_order_v2_gem_receipt/);
tamper(s=>{s.receipts[1].gemId='gem:stat_missing:g1'},/unknown_v2_socket_gem/);
tamper(s=>{s.slots[0].stat!.gemId='gem:effect_momentum:g1'},/invalid_v2_installed_gem/);
tamper(s=>{s.slots[0].stat!.rollPercent=125},/invalid_v2_installed_gem/);
tamper(s=>{s.receipts[1].instanceId='other-copy'},/invalid_v2_gem_receipt/);
console.log('PASS: 160 canonical server gem identities, exact socket receipt replay, burnt-gem and immutable sidecar checks');
