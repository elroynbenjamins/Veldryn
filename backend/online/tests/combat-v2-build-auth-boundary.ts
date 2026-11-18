import {strict as assert} from 'node:assert';
import {
  bindAuthenticatedBuildRequestV2,createHiddenCombatV2BuildHandler,
  BuildRequestErrorV2,COMBAT_V2_BUILDS_TRANSPORT_RELEASED,
} from '../combat-v2-build-auth-boundary';

const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const base='https://example.test/gameplay?view=combat_v2_builds&action=';
const service={authenticate:async(t:string)=>t==='token'?account:null};
const selection={
 specializationId:'v2:spec:ironwarden:sentinel',
 equipment:{helmet:'crafted_T2_abc'},
 activeSkills:[{skillId:'v2:skill:ironwarden:rune_challenge',
   variantId:'v2:variant:ironwarden:rune_challenge:0'}],
 talentRanks:{},signaturePassiveIds:[],capstoneId:null,
};
const req=(action:string,body?:unknown,headers?:Record<string,string>)=>
 new Request(base+action,{
  method:action==='read'?'GET':'POST',
  headers:{authorization:'Bearer token',...(body===undefined?{}:{'content-type':'application/json'}),...headers},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 });
const payload=(extra:Record<string,unknown>={})=>({
 characterId:character,slot:0,expectedRevision:3,name:'Farming',selected:selection,...extra,
});
async function rejects(action:string,body:unknown,code:string,headers?:Record<string,string>){
 try{
  await bindAuthenticatedBuildRequestV2(req(action,body,headers),service);
  assert.fail('Accepted invalid request: '+code);
 }catch(e){
  assert.ok(e instanceof BuildRequestErrorV2);
  assert.equal(e.code,code);
 }
}
async function main(){
 assert.equal(COMBAT_V2_BUILDS_TRANSPORT_RELEASED,false);
 const bound=await bindAuthenticatedBuildRequestV2(req('save',payload()),service);
 assert.equal(bound.trustedAccountId,account);
 assert.equal(bound.characterId,character);
 assert.equal(bound.action.kind,'mutate');
 if(bound.action.kind==='mutate'){
  assert.equal(bound.action.mutation.action,'save');
  assert.deepEqual(bound.action.mutation.slot,0);
 }
 const read=await bindAuthenticatedBuildRequestV2(req('read',undefined,{'x-veldryn-character-id':character}),service);
 assert.equal(read.action.kind,'read');
 assert.equal(read.characterId,character);
 for(const key of ['accountId','ownerCharacterId','classId','level','rarity',
    'statRolls','damage','attack','baseStats','serverEnabled','isAdmin']){
  await rejects('save',payload({[key]:'spoofed'}),'build_invalid_fields');
 }
 await rejects('save',payload({selected:{...selection,attackPower:999999}}),'build_invalid_fields');
 await rejects('save',payload({selected:{...selection,equipment:{helmet:'craft',__proto__:'evil',bonus:999}}}),'build_invalid_equipment');
 await rejects('save',payload({selected:{...selection,
    activeSkills:[{...selection.activeSkills[0],cooldownMs:0}]}}),'build_invalid_fields');
 await rejects('save',payload({slot:2}),'build_invalid_payload');
 await rejects('save',payload({expectedRevision:-1}),'build_invalid_payload');
 await rejects('save',payload({name:'\nInjected'}),'build_invalid_name');
 await rejects('activate',{characterId:character,slot:1,expectedRevision:1,selected:selection},'build_invalid_fields');
 await rejects('save',payload({selected:{...selection,talentRanks:{'v2:passive:ironwarden:iron_skin':4}}}),'build_invalid_talents');
 try{await bindAuthenticatedBuildRequestV2(req('save',payload(),{authorization:'Bearer wrong'}),service);
  assert.fail('accepted invalid session');
 }catch(e){assert.ok(e instanceof BuildRequestErrorV2);assert.equal(e.code,'invalid_session');}
 const badToken=req('save',payload());badToken.headers.delete('authorization');
 try{await bindAuthenticatedBuildRequestV2(badToken,service);assert.fail('accepted missing token')}
 catch(e){assert.ok(e instanceof BuildRequestErrorV2);assert.equal(e.code,'auth_required');}
 let accessed=false;
 const hidden=createHiddenCombatV2BuildHandler({
  authenticate:async()=>{accessed=true;throw Error('should not execute')},
 });
 const response=await hidden(req('save',payload()));
 assert.equal(response.status,404);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(accessed,false);
 console.log('PASS: hardened build boundary, session identity, strict field validation and hidden route');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
