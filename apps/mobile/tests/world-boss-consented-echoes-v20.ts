/**
 * Hidden V20 synthetic Echo consent, 5-bracket matching and frozen modifier tests.
 * No live DB, staging account, server API, rewards, or World Sigils.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import type {ClassId,GameState,GearSlot} from '../src/core/types';
import {loadWorldBossConsentedEchoesV20,type WorldBossEchoConsentRowV20,
 type WorldBossConsentedEchoSourceV20} from '../../../backend/online/world-boss-consented-echoes-v20';
import {resolveRealWorldBossSnapshotV12} from '../../../backend/online/world-boss-loadout-v12';
import {prepareWorldBossRosterV9} from '../../../backend/src/server/combat/world-boss-verified-roster-v9';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {makeWorldBossEncounterProfileV13} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {loadWorldBossFrozenRulesV20,verifyWorldBossFrozenRulesV20,
 type WorldBossRulesSourceV20} from '../../../backend/online/world-boss-frozen-modifiers-v20';
import {reserveAuthenticatedWorldBossV19,settleTrustedWorldBossV19,
 type WorldBossServiceDepsV19} from '../../../backend/online/world-boss-service-v19';
import type {WorldBossPrivateRepositoryV19,WorldBossReservePayloadV19,
 WorldBossLeaseV19,WorldBossSettlementViewV19} from '../../../backend/online/world-boss-private-pg-v19';

const NOW=1794564000000,EVENT='30000000-0000-4000-8000-000000000020';
const ACCOUNT='10000000-0000-4000-8000-000000000001';
const CHARACTER='20000000-0000-4000-8000-000000000001';
const OWNERS=[2,3,4].map(i=>'10000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const CHARS=[2,3,4].map(i=>'20000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const POLICY={version:'wb20-test-unapproved',bounds:[2500,5000,10000,20000] as [number,number,number,number]};
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
function game(classId:ClassId,id:string){
 const g=regionalCombatFixture({...T2,level:25,tier:'T2'},'prepared',classId);
 g.character={...g.character!,id};
 return g;
}
const state=new Map<string,GameState>([
 [ACCOUNT,game('IRONWARDEN',CHARACTER)],
 [OWNERS[0],game('WAYFINDER',CHARS[0])],
 [OWNERS[1],game('RAVAGER',CHARS[1])],
 [OWNERS[2],game('DAWNKEEPER',CHARS[2])],
]);
const records:WorldBossEchoConsentRowV20[]=OWNERS.map((ownerAccountId,i)=>({
 eventId:EVENT,ownerAccountId,characterId:CHARS[i],
 gameVersion:2,consentRevision:1,enabled:true,usageCount:i,
 grantedAtUtcMs:NOW-3600000,expiresAtUtcMs:NOW+3600000,
}));
const reject=async(action:()=>Promise<unknown>,needle:string)=>{
 let caught='';
 try{await action();}catch(e){caught=String(e);}
 assert.ok(caught.includes(needle),'expected '+needle+' got '+caught);
};
const rules:WorldBossRulesSourceV20={
 gearBandByBracket:[1,2,2,3,4],
 loadWarCamp:async eventId=>makeWorldBossWarCampSnapshotV11({
  eventId,revision:3,levels:{fortifications:1,fieldProvisions:2,siegecraft:1},
 }),
 loadProfile:async({eventId,boss,phase,gearBand})=>
  makeWorldBossEncounterProfileV13({
   eventId,boss,phase,gearBand,configVersion:'wb20-fixture-never-live',
   attack:1800,defense:900,guardMax:5000,
  }),
};
function source(initial=records):WorldBossConsentedEchoSourceV20{
 return {
  listConsents:async()=>structuredClone(initial),
  async verifyGrant({ownerAccountId,consentRevision}){
   return initial.some(row=>row.ownerAccountId===ownerAccountId&&
    row.consentRevision===consentRevision&&row.enabled);
  },
  async loadOwnedState(accountId,characterId){
   const s=state.get(accountId);
   if(!s)throw Error('missing_test_owner');
   return {ownerAccountId:accountId,characterId,gameVersion:2,
    updatedAtUtcMs:NOW-2000,serverState:structuredClone(s)};
  },
 };
}
async function resolve(candidateSource=source()){
 return loadWorldBossConsentedEchoesV20({
  source:candidateSource,eventId:EVENT,requesterAccountId:ACCOUNT,
  nowUtcMs:NOW,minimumCharacterLevel:1,policy:POLICY,
 });
}
async function main(){
 const result=await resolve();
 assert.equal(result.candidates.length,3);
 assert.equal(result.consentBindings.length,3);
 assert.equal(result.reviewed,3);
 assert.equal(result.rejectedInactive,0);
 assert.ok(result.candidates.every(c=>c.ownerAccountId!==ACCOUNT));
 const initiator=await resolveRealWorldBossSnapshotV12({
  reader:{principalAccountId:ACCOUNT,loadCharacterState:async()=>({
   ownerAccountId:ACCOUNT,gameVersion:2,serverState:state.get(ACCOUNT)!,
  })},characterId:CHARACTER,expectedGameVersion:2,
  nowUtcMs:NOW,minimumCharacterLevel:1,policy:POLICY,
 });
 const prepared=await prepareWorldBossRosterV9({
  principalAccountId:ACCOUNT,nowUtcMs:()=>NOW,
  randomSeed:()=> 'WB20_SECURE_PRIVATE_NONCE_RANDOM_TEST_001',
  loadCurrentCharacter:async()=>initiator.snapshot,
  listEligibleEchoes:async()=>result.candidates,
 },{
  eventId:EVENT,characterId:CHARACTER,requestId:'WB20_CONSENT_FULL_01',
  order:'hold_line',
 });
 assert.equal(prepared.npcSlots,0);
 assert.equal(prepared.selectedRealEchoIds.length,3);
 assert.deepEqual(prepared.command.squad.map(x=>x.resolvedCombatant.role),
  ['tank','damage','damage','support']);
 assert.equal(new Set(prepared.command.squad.map(x=>x.ownerAccountId)).size,4);
 const bindings=prepared.selectedRealEchoIds.map(id=>
  result.consentBindings.find(b=>b.snapshotId===id));
 assert.ok(bindings.every(Boolean));
 const revoked=structuredClone(records);
 revoked[2].enabled=false;
 const limited=await resolve(source(revoked));
 assert.equal(limited.candidates.length,2);
 assert.equal(limited.rejectedInactive,1);
 const fallback=await prepareWorldBossRosterV9({
  principalAccountId:ACCOUNT,nowUtcMs:()=>NOW,
  randomSeed:()=> 'WB20_SECURE_PRIVATE_NONCE_RANDOM_TEST_002',
  loadCurrentCharacter:async()=>initiator.snapshot,
  listEligibleEchoes:async()=>limited.candidates,
 },{
  eventId:EVENT,characterId:CHARACTER,requestId:'WB20_CONSENT_FALLBACK_02',
  order:'hold_line',
 });
 assert.equal(fallback.npcSlots,1);
 assert.equal(fallback.selectedRealEchoIds.length,2);

 const duplicate=[...records,{...records[0]}];
 await reject(()=>resolve(source(duplicate)),'invalid_or_duplicate_private_consent');
 const stolenSource:WorldBossConsentedEchoSourceV20={
  ...source(),
  async loadOwnedState(accountId,characterId){
   const row=await source().loadOwnedState(accountId,characterId);
   return {...row,ownerAccountId:ACCOUNT};
  },
 };
 await reject(()=>resolve(stolenSource),'owner_character_revision_mismatch');
 const oldSource:WorldBossConsentedEchoSourceV20={
  ...source(),async loadOwnedState(accountId,characterId){
   const row=await source().loadOwnedState(accountId,characterId);
   return {...row,gameVersion:1};
  },
 };
 await reject(()=>resolve(oldSource),'owner_character_revision_mismatch');
 const formerly=state.get(OWNERS[0])!;
 const counterfeit=structuredClone(formerly);
 const slot=Object.entries(counterfeit.character!.equipment)
  .find(([,item])=>Boolean(item))![0] as GearSlot;
 counterfeit.character!.equipmentInstanceIds={
  ...counterfeit.character!.equipmentInstanceIds,[slot]:'WB20_FORGED_COPY',
 };
 const fakeSource:WorldBossConsentedEchoSourceV20={
  ...source(),
  async loadOwnedState(accountId,characterId){
   const row=await source().loadOwnedState(accountId,characterId);
   return accountId===OWNERS[0]?{...row,serverState:counterfeit}:row;
  },
 };
 await reject(()=>resolve(fakeSource),'equipment_copy_not_owned');

 const modifiers=await loadWorldBossFrozenRulesV20({
  source:rules,eventId:EVENT,boss:'sunscar',
  initiatorBracket:initiator.snapshot.bracket,
 });
 const verified=verifyWorldBossFrozenRulesV20({
  frozen:modifiers,eventId:EVENT,boss:'sunscar',phase:'exposed',
  warCampDigest:modifiers.warCamp.digest,
  encounterProfileDigest:modifiers.encounterProfiles.exposed.digest,
 });
 assert.equal(verified.encounterProfile.phase,'exposed');
 const tampered=structuredClone(modifiers);
 tampered.warCamp.levels.siegecraft=2;
 await reject(async()=>verifyWorldBossFrozenRulesV20({
  frozen:tampered,eventId:EVENT,boss:'sunscar',phase:'exposed',
  warCampDigest:modifiers.warCamp.digest,
  encounterProfileDigest:modifiers.encounterProfiles.exposed.digest,
 }),'war_camp_digest_mismatch');
 const alteredProfile=structuredClone(modifiers);
 alteredProfile.encounterProfiles.exposed.attack+=1;
 await reject(async()=>verifyWorldBossFrozenRulesV20({
  frozen:alteredProfile,eventId:EVENT,boss:'sunscar',phase:'exposed',
  warCampDigest:modifiers.warCamp.digest,
  encounterProfileDigest:modifiers.encounterProfiles.exposed.digest,
 }),'invalid_or_foreign_profile');

 let stored:WorldBossReservePayloadV19|undefined;
 let settlements=0,replayWrites=0;
 const replayBodies:string[]=[];
 const db:WorldBossPrivateRepositoryV19={
  readAttempt:async()=>undefined,
  async loadOwnedState(accountId,characterId){
   assert.equal(accountId,ACCOUNT);assert.equal(characterId,CHARACTER);
   return {ownerAccountId:accountId,characterId,gameVersion:2,
    updatedAtUtcMs:NOW-1000,serverState:state.get(ACCOUNT)!};
  },
  loadEvent:async()=>({boss:'sunscar',status:'active',
   rulesVersion:'wb20-review-only'}),
  async reserve(payload){
   stored=structuredClone(payload);
   assert.ok((stored.frozenPacket as {realEchoConsents:unknown[]})
    .realEchoConsents.length===3);
   return {status:'reserved',ordinal:1,repeated:false,generation:1};
  },
  async checkout(){
   if(!stored)throw Error('not_reserved');
   const packet=structuredClone(stored.frozenPacket) as {
    encounterProfiles:typeof modifiers.encounterProfiles;
   };
   return {status:'reserved',ordinal:1,repeated:false,generation:1,
    seed:stored.seed,digest:stored.digest,squad:packet,
    order:stored.order,phase:'exposed',
    engine:stored.engineVersion,
    warCampDigest:stored.warCampDigest,
    encounterDigest:packet.encounterProfiles.exposed.digest};
  },
  async settle(payload){
   settlements++;
   assert.ok(payload.rawDamage>=0&&payload.guardDamage>=0);
   return {status:'committed',ordinal:1,repeated:false,
    creditedHp:Math.floor(payload.rawDamage),hpAfter:500000,residualEcho:false};
  },
 };
 const deps:WorldBossServiceDepsV19={
  authenticate:async token=>token==='wb20-auth-secret'?ACCOUNT:null,
  db,workerId:'WB20_PRIVATE_WORKER',nowUtcMs:()=>NOW,
  randomSeed:()=> 'WB20_SEEDED_SECRET_PRIVATE_NONCE_123456789',
  policy:POLICY,minimumCharacterLevel:1,
  echoSource:source(),rulesSource:rules,
  replayStore:{async putImmutable({content}){
   replayWrites++;replayBodies.push(content);
  }},
 };
 const sel={eventId:EVENT,characterId:CHARACTER,requestId:'WB20_FULL_SERVICE_03',
  order:'hold_line' as const,expectedGameVersion:2};
 const reserved=await reserveAuthenticatedWorldBossV19({
  token:'wb20-auth-secret',selection:sel,
 },deps);
 assert.equal(reserved.status,'reserved');
 assert.equal(stored?.warCampDigest,modifiers.warCamp.digest);
 const settled=await settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:sel.requestId,
 },deps);
 assert.equal(settled.status,'committed');
 assert.equal(settlements,1);
 assert.equal(replayWrites,1);
 assert.ok(replayBodies[0].includes(modifiers.warCamp.digest));
 assert.ok(replayBodies[0].includes(modifiers.encounterProfiles.exposed.digest));
 const stateBefore=stored!;
 const maliciousDb:WorldBossPrivateRepositoryV19={
  ...db,checkout:async(...args)=>{
   const job=await db.checkout(...args);
   return {...job,encounterDigest:'f'.repeat(64)};
  },
 };
 await reject(()=>settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:sel.requestId,
 },{...deps,db:maliciousDb}),'frozen_profile_mismatch');
 assert.equal(settlements,1,'bad modifier cannot settle or mint any currency');
 assert.ok((stateBefore.frozenPacket as {realEchoConsents:unknown[]})
  .realEchoConsents.length===3);
 console.log('WORLD_BOSS_V20_PRIVATE_ECHO_AND_MODIFIERS='+JSON.stringify({
  realConsentedEchoes:3,requiredRoles:['tank','damage','damage','support'],
  revokedFallsBackToNpc:true,forgedCopyDenied:true,ownerRevisionChecked:true,
  phaseProfilesFrozen:3,warCampDigestBound:true,serializedV9DigestPreserved:true,
  profileTamperDenied:true,dbReads:0,realWalletCredits:0,live:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
