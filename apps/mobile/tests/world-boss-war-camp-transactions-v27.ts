/**
 * Hidden V27: twelve checked in-game recipes, authenticated selection,
 * private-only parameterized SQL boundary, frozen V11 digest and progress.
 * Real inventory/transaction concurrency is exercised by disposable SQL CI.
 */
import {assert} from './test-assert';
import {makeWorldBossWarCampSnapshotV11,
 deriveWorldBossWarCampEffectsV11} from
 '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {WORLD_BOSS_V27_WAR_CAMP_LIVE,WORLD_BOSS_V27_RECIPES,
 validateWorldBossV27Recipes,donateAuthenticatedWorldBossV27,
 readAuthenticatedWorldBossWarCampV27,withWorldBossFrozenWarCampV27,
 createWorldBossWarCampPgV27,
 type WorldBossWarCampProgressV27} from
 '../../../backend/online/world-boss-war-camp-service-v27';
import type {WorldBossRulesSourceV20} from
 '../../../backend/online/world-boss-frozen-modifiers-v20';

const EVENT='30000000-0000-4000-8000-000000000027';
const ACCOUNT='10000000-0000-4000-8000-000000000027';
const CHAR='20000000-0000-4000-8000-000000000027';
const requestId='WB27_DONATION_REQUEST_001';
const recipeId='T2_FORTIFICATIONS';
const camp=makeWorldBossWarCampSnapshotV11({
 eventId:EVENT,revision:3,
 levels:{fortifications:1,fieldProvisions:1,siegecraft:0},
});
const goals={
 fortifications:{tier1At:2,tier2At:5},
 fieldProvisions:{tier1At:2,tier2At:4},
 siegecraft:{tier1At:2,tier2At:4},
};
const projection:WorldBossWarCampProgressV27={
 eventId:EVENT,revision:3,contributions:{
  fortifications:2,fieldProvisions:2,siegecraft:0,
 },goals,frozen:true,snapshot:camp,
};
const fail=async(f:()=>Promise<unknown>,fragment:string)=>{
 let msg='';try{await f();}catch(e){msg=String(e);}
 assert.ok(msg.includes(fragment),'expected '+fragment+', got '+msg);
};
async function main(){
 assert.equal(WORLD_BOSS_V27_WAR_CAMP_LIVE,false);
 assert.equal(validateWorldBossV27Recipes(),12);
 assert.equal(WORLD_BOSS_V27_RECIPES.length,12);
 assert.equal(new Set(WORLD_BOSS_V27_RECIPES.map(x=>x.id)).size,12);
 for(const tier of [1,2,3,4])for(const track of [
  'fortifications','fieldProvisions','siegecraft'
 ]){
  const chosen=WORLD_BOSS_V27_RECIPES.filter(x=>
   x.tier===tier&&x.track===track);
  assert.equal(chosen.length,1);
  assert.equal(chosen[0].materials.length,2);
 }
 assert.equal(WORLD_BOSS_V27_RECIPES.find(r=>
  r.id==='T4_FORTIFICATIONS')!.materials[0].itemId,'DUNEWOOD');
 assert.equal(deriveWorldBossWarCampEffectsV11(camp).bossDamageReduction,.05);
 const paid=WORLD_BOSS_V27_RECIPES.find(x=>x.id===recipeId)!.materials;
 const queries:Array<{sql:string;args:readonly unknown[]}>=[],calls={
  donation:0,freeze:0,progress:0,
 };
 let broken=false;
 const privateDb=createWorldBossWarCampPgV27({
  async query<T extends object>(sql:string,args:readonly unknown[]){
   queries.push({sql,args});
   assert.ok(sql.startsWith('SELECT private.world_boss_v27_'));
   assert.ok(!sql.includes(ACCOUNT)&&!sql.includes(CHAR));
   if(sql.includes('_donate(')){
    calls.donation++;
    assert.equal(args.length,5);
    assert.deepEqual(args,[EVENT,ACCOUNT,CHAR,requestId,recipeId]);
    return {rows:[{receipt:{
     eventId:EVENT,accountId:ACCOUNT,requestId,recipeId,
     track:'fortifications',ordinal:1,revision:3,
     paidMaterials:broken?[{itemId:'FAKE',quantity:1}]:paid,
     repeated:false,
    }} as unknown as T]};
   }
   if(sql.includes('_progress(')){
    calls.progress++;
    return {rows:[{progress:projection} as unknown as T]};
   }
   if(sql.includes('_freeze(')){
    calls.freeze++;
    return {rows:[{snapshot:broken?{...camp,digest:'0'.repeat(64)}:camp} as unknown as T]};
   }
   throw Error('WB27_UNEXPECTED_SQL');
  },
 });
 const deps={
  authenticate:async(token:string)=>
   token==='verified-auth-token'?ACCOUNT:null,
  db:privateDb,
 };
 const selection={eventId:EVENT,characterId:CHAR,requestId,recipeId};
 await fail(()=>donateAuthenticatedWorldBossV27({
  token:'invalid-auth-token',selection,
 },deps),'auth_required');
 assert.equal(calls.donation,0);
 await fail(()=>donateAuthenticatedWorldBossV27({
  token:'verified-auth-token',selection:{...selection,quantity:9999} as never,
 },deps),'invalid_private_request');
 await fail(()=>donateAuthenticatedWorldBossV27({
  token:'verified-auth-token',selection:{...selection,recipeId:'WRONG_RECIPE'},
 },deps),'invalid_donation_selection');
 await fail(()=>donateAuthenticatedWorldBossV27({
  token:'verified-auth-token',selection:{...selection,characterId:'INVALID'},
 },deps),'invalid_donation_selection');
 assert.equal(calls.donation,0);
 const result=await donateAuthenticatedWorldBossV27({
  token:'verified-auth-token',selection,
 },deps);
 assert.equal(result.repeated,false);
 assert.equal(result.ordinal,1);
 assert.equal(result.paidMaterials[0].itemId,'IRONWOOD_LOG');
 assert.equal(calls.donation,1);
 broken=true;
 await fail(()=>donateAuthenticatedWorldBossV27({
  token:'verified-auth-token',selection,
 },deps),'untrusted_db_receipt');
 broken=false;
 const p=await readAuthenticatedWorldBossWarCampV27({
  token:'verified-auth-token',eventId:EVENT,
 },deps);
 assert.deepEqual(p,projection);
 assert.equal(calls.progress,1);
 await fail(()=>readAuthenticatedWorldBossWarCampV27({
  token:'invalid-auth-token',eventId:EVENT,
 },deps),'progress_auth_required');
 assert.equal(calls.progress,1);
 const loaded=await privateDb.freeze(EVENT);
 assert.deepEqual(loaded,camp);
 broken=true;
 await fail(()=>privateDb.freeze(EVENT),'war_camp_digest_mismatch');
 broken=false;
 const existing={
  gearBandByBracket:[2,2,2,2,2],
  loadWarCamp:async()=>{throw Error('untrusted old source called');},
  loadProfile:async()=>{throw Error('not needed for War Camp test');},
 } as unknown as WorldBossRulesSourceV20;
 const sourced=withWorldBossFrozenWarCampV27(existing,privateDb);
 assert.deepEqual(await sourced.loadWarCamp(EVENT),camp);
 assert.equal(calls.freeze,3);
 assert.equal(queries.every(q=>!q.sql.includes(requestId)),true);
 assert.equal(queries.filter(q=>q.sql.includes('_donate')).length,2);
 console.log('WORLD_BOSS_V27_PRIVATE_WAR_CAMP='+JSON.stringify({
  realItemRecipes:12,tiers:4,tracks:3,inventorySource:'owned-character-inventory',
  accountBundleCap:2,weekdayDonationCutoff:'Saturday 00:00 UTC',
  authRequired:true,sqlParameterized:true,privateDigestValidated:true,
  receiptsValidated:true,noWalletCredits:true,noLiveRoutes:true,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
