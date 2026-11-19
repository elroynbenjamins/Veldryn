/** Hidden V21 Echo consent auth, private bind and lost-ACK tests.
 * Private PG is an in-memory stub; no Supabase account or event is touched.
 */
import {assert} from './test-assert';
import {
 createWorldBossPrivateConsentPgV21,
 setAuthenticatedWorldBossConsentV21,
 WORLD_BOSS_V21_CONSENT_LIVE,
 type WorldBossConsentCommandV21,type WorldBossConsentReceiptV21,
} from '../../../backend/online/world-boss-consent-command-v21';
import type {WorldBossPgExecutorV19} from '../../../backend/online/world-boss-private-pg-v19';

const EVENT='30000000-0000-4000-8000-000000000021';
const OWNER='10000000-0000-4000-8000-000000000002';
const CHARACTER='20000000-0000-4000-8000-000000000002';
const OTHER='10000000-0000-4000-8000-000000000003';
const grant:WorldBossConsentCommandV21={
 eventId:EVENT,characterId:CHARACTER,requestId:'WB21_PUBLISH_01',
 enabled:true,expectedRevision:0,
};
const fail=async(fn:()=>Promise<unknown>,needle:string)=>{
 let message='';
 try{await fn();}catch(e){message=String(e);}
 assert.ok(message.includes(needle),'expected '+needle+' got '+message);
};
async function main(){
 assert.equal(WORLD_BOSS_V21_CONSENT_LIVE,false);
 const ledger=new Map<string,{command:WorldBossConsentCommandV21;
  receipt:WorldBossConsentReceiptV21}>();
 let revision=0,enabled=false,calls=0,authCalls=0;
 const pg:WorldBossPgExecutorV19={
  async query<T extends object>(sql:string,binds:readonly unknown[]){
   assert.equal(sql,'SELECT private.world_boss_v21_set_consent($1::uuid,$2::uuid,$3::uuid,$4::boolean,$5::bigint,$6::text) AS receipt');
   assert.equal(binds.length,6);
   assert.equal(binds[0],EVENT);assert.equal(binds[1],OWNER);
   assert.equal(binds[2],CHARACTER);
   calls++;
   const command:WorldBossConsentCommandV21={
    eventId:binds[0] as string,characterId:binds[2] as string,
    enabled:binds[3] as boolean,expectedRevision:binds[4] as number,
    requestId:binds[5] as string,
   };
   const prior=ledger.get(command.requestId);
   if(prior){
    if(JSON.stringify(prior.command)!==JSON.stringify(command))
     throw Error('WB21_REQUEST_REUSED');
    return {rows:[{receipt:{...prior.receipt,repeated:true}} as T]};
   }
   if(command.expectedRevision!==revision)
    throw Error('WB21_STALE_CONSENT_REVISION');
   if(!command.enabled&&revision===0)throw Error('WB21_NO_GRANT_TO_REVOKE');
   revision++;enabled=command.enabled;
   const receipt:WorldBossConsentReceiptV21={
    eventId:EVENT,characterId:CHARACTER,enabled,
    consentRevision:revision,repeated:false,
   };
   ledger.set(command.requestId,{command,receipt});
   return {rows:[{receipt} as T]};
  },
 };
 const repository=createWorldBossPrivateConsentPgV21(pg);
 const service={
  async authenticate(token:string){
   authCalls++;
   return token==='verified-owner-token'?OWNER:
    token==='different-valid-owner'?OTHER:null;
  },repository,
 };
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'forged-token',command:grant,
 },service),'unverified_owner');
 assert.equal(calls,0,'unverified tokens cannot call private SQL');
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,ownerAccountId:OTHER} as WorldBossConsentCommandV21,
 },service),'invalid_consent_command');
 assert.equal(calls,0,'clients cannot inject an owner identity');
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',command:{...grant,expectedRevision:-1},
 },service),'invalid_consent_command');
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,requestId:'short'},
 },service),'invalid_consent_command');

 const first=await setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',command:grant,
 },service);
 assert.deepEqual(first,{eventId:EVENT,characterId:CHARACTER,enabled:true,
  consentRevision:1,repeated:false});
 const retry=await setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',command:grant,
 },service);
 assert.equal(retry.consentRevision,1);assert.equal(retry.repeated,true);
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,enabled:false},
 },service),'WB21_REQUEST_REUSED');
 await fail(()=>setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,requestId:'WB21_STALE_PUBLISH',expectedRevision:0},
 },service),'WB21_STALE_CONSENT_REVISION');
 assert.equal(revision,1);

 const revoked=await setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,requestId:'WB21_REVOKE_002',
   enabled:false,expectedRevision:1},
 },service);
 assert.equal(revoked.consentRevision,2);
 assert.equal(enabled,false);
 assert.equal((await setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',command:grant,
 },service)).repeated,true);
 assert.equal(enabled,false,'old successful ACK cannot re-enable a revoked grant');
 const renewed=await setAuthenticatedWorldBossConsentV21({
  token:'verified-owner-token',
  command:{...grant,requestId:'WB21_RENEW_003',expectedRevision:2},
 },service);
 assert.equal(renewed.consentRevision,3);assert.equal(enabled,true);
 assert.equal(calls,7);
 assert.ok(authCalls>=calls);
 console.log('WORLD_BOSS_V21_PRIVATE_CONSENT_AUTH='+JSON.stringify({
  verifiedOwnerOnly:true,ownerNotClientSupplied:true,parameterizedSql:true,
  revision:3,staleRejected:true,lostAckIdempotent:true,
  revokeFencesOldRevision:true,publicRouteMounted:false,live:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
