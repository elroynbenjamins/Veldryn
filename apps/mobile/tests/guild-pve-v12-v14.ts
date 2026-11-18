/** Hidden Guild PvE V12–V14 regressions. All identities and saves fictional. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {GuildPveV12VerifiedActorLoader} from '../../../backend/online/guild-pve-verified-loader-v12';
import type {GuildPveV12OwnedState} from '../../../backend/online/guild-pve-verified-loader-v12';
import {GUILD_PVE_V8_MANIFEST} from '../../../backend/src/server/combat/guild-pve-shared-v8';
import {makeGuildPveReferenceV7} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {guildPveV13PhaseCues,projectGuildPveV13Receipt,verifyGuildPveV13Scripts} from '../../../backend/src/server/combat/guild-pve-cues-v13';
import {GuildPveV14NonPayingProofJournal,proveGuildPveV14Candidate} from '../../../backend/src/server/combat/guild-pve-reward-proof-v14';
import {
 InMemoryGuildPveV9Store,GuildPveV9TransactionService,
 makeGuildPveV9Run,registerGuildPveV9TestRun,
} from '../../../backend/src/server/combat/guild-pve-transaction-v9';

const OWNER='GX_V12_ACCOUNT_A',CHAR='GX_V12_CHAR_A';
const CYCLE='GX_V12_CYCLE',GUILD='GX_V12_GUILD';
const START=Date.UTC(2026,10,16);
const BASE=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='IRONWOOD')!;
const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',CLASSES[0].id);
state.character={...state.character!,id:CHAR};
const expected:GuildPveV12OwnedState={
 ownerAccountId:OWNER,characterId:CHAR,revision:7,state,
};
const loader=(row:GuildPveV12OwnedState|null)=>new GuildPveV12VerifiedActorLoader({
 async readOwnedState(){return row;}
});
async function reject(fn:()=>Promise<unknown>,part:string){
 let error='';try{await fn();}catch(e){error=String(e);}
 assert.ok(error.length>0&&error.includes(part),'Expected '+part+'; got '+error);
}
function rejectSync(fn:()=>unknown,part:string){
 let error='';try{fn();}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+'; got '+error);
}
async function main(){
 assert.equal(verifyGuildPveV13Scripts(),36);
 const actual=await loader(expected).resolveOwnedActor(OWNER,CHAR);
 assert.equal(actual.actor.id,CHAR);
 assert.equal(actual.gameRevision,7);
 assert.equal(actual.sourceHash.length,64);
 assert.ok(actual.actor.stats.attackPower>0);
 await reject(()=>loader(null).resolveOwnedActor(OWNER,CHAR),'character_not_owned');
 await reject(()=>loader({...expected,ownerAccountId:'GX_V12_OTHER'}).resolveOwnedActor(OWNER,CHAR),'character_not_owned');
 await reject(()=>loader({...expected,characterId:'GX_V12_OTHER'}).resolveOwnedActor(OWNER,CHAR),'character_not_owned');
 await reject(()=>loader({...expected,revision:0}).resolveOwnedActor(OWNER,CHAR),'invalid_server_revision');
 await reject(()=>loader(expected).resolveOwnedActor('bad!',CHAR),'invalid_identity');
 const corrupted=structuredClone(state);corrupted.character!.equipment.weapon='INVENTED_FAKE_GEAR';
 await reject(()=>loader({...expected,state:corrupted}).resolveOwnedActor(OWNER,CHAR),'');
 
 const store=new InMemoryGuildPveV9Store();
 const run=makeGuildPveV9Run({cycleId:CYCLE,guildId:GUILD,startMs:START,
  difficulty:'Scout',accountIds:[OWNER],
  reference:makeGuildPveReferenceV7('T2',{attack:1000,defense:650,maxHp:4500}),
 });
 await registerGuildPveV9TestRun(store,run);
 const service=new GuildPveV9TransactionService(store,loader(expected));
 const action={
  kind:'battle' as const,cycleId:CYCLE,guildId:GUILD,characterId:CHAR,
  requestId:'GX_V12_REQ_A',nodeId:'C1-04' as const,stance:'Assault' as const,
 };
 const receipt=await service.commit({
  principalAccountId:OWNER,nowUtcMs:START+86400000,
 },action);
 assert.equal(receipt.costSeals,1);
 assert.equal(receipt.rewardMinted,false);
 const repeated=await service.commit({
  principalAccountId:OWNER,nowUtcMs:START+15*86400000,
 },action);
 assert.deepEqual(repeated,receipt);

 const projected=projectGuildPveV13Receipt(receipt,'Scout');
 assert.equal(projected.cues.length,4);
 assert.equal(projected.actualHpCredit,receipt.creditedHp);
 assert.equal(projected.actualEngineDamage,receipt.combat!.rawPlayerDamage);
 assert.equal(projected.neverCausesGameplayMutation,true);
 assert.ok(projected.cues.every(c=>c.damageSource==='engine-receipt-only'));
 const warning=projected.cues.find(c=>c.kind==='warning')!;
 assert.equal(warning.warningMs,1700);
 assert.equal(guildPveV13PhaseCues({
  boss:'warden',phase:'exposed_core',difficulty:'Mythic',
 }).find(c=>c.kind==='warning')!.warningMs,1100);
 rejectSync(()=>guildPveV13PhaseCues({
  boss:'seer',phase:'iron_skin',difficulty:'Scout',
 }), 'invalid_phase');
 rejectSync(()=>projectGuildPveV13Receipt({
  ...receipt,costSeals:0,
 },'Scout'), 'requires_settled_combat_receipt');
 rejectSync(()=>projectGuildPveV13Receipt({
  ...receipt,phaseTransitions:['exposed_core'],
 },'Scout'), 'invalid_phase_transition');

 const unfinished=proveGuildPveV14Candidate({
  state:store.inspect(),cycleId:CYCLE,guildId:GUILD,principalAccountId:OWNER,
 });
 assert.equal(unfinished.reason,'campaign_incomplete');
 assert.equal(unfinished.canClaim,false);

 // The next check manipulates a TEST DOUBLE ONLY. This is not a real clear.
 const fabricatedComplete=store.inspect();
 const row=fabricatedComplete.guildRuns[JSON.stringify([CYCLE,GUILD])];
 for(const n of GUILD_PVE_V8_MANIFEST.filter(x=>x.required&&x.boss)){
  row.nodes[n.id].cleared=true;row.nodes[n.id].hp=0;
 }
 row.revision++;
 const eligible=proveGuildPveV14Candidate({
  state:fabricatedComplete,cycleId:CYCLE,guildId:GUILD,principalAccountId:OWNER,
 });
 assert.equal(eligible.reason,'candidate_only');
 assert.equal(eligible.eligibleForFurtherReview,true);
 assert.equal(eligible.committedActions,1);
 assert.equal(eligible.finalizationVerified,false);
 assert.equal(eligible.proposedTokenAmount,null);
 assert.equal(eligible.rewardGranted,false);
 assert.equal(eligible.canClaim,false);
 assert.equal(eligible.evidenceDigest.length,64);
 const journal=new GuildPveV14NonPayingProofJournal();
 assert.deepEqual(journal.inspectOrRecord('GX_V14_CLAIM_1',eligible),eligible);
 assert.deepEqual(journal.inspectOrRecord('GX_V14_CLAIM_1',eligible),eligible);
 rejectSync(()=>journal.inspectOrRecord('GX_V14_CLAIM_1',{
  ...eligible,evidenceDigest:'changed',
 }), 'proof_nonce_conflict');
 rejectSync(()=>journal.inspectOrRecord('GX_V14_CLAIM_2',{
  ...eligible,canClaim:true,
 }), 'payout_forbidden');
 const noBinding=structuredClone(fabricatedComplete);
 noBinding.cycleBindings={};
 assert.equal(proveGuildPveV14Candidate({
  state:noBinding,cycleId:CYCLE,guildId:GUILD,principalAccountId:OWNER,
 }).reason,'guild_binding_missing');
 const mismatched=structuredClone(fabricatedComplete);
 mismatched.cycleBindings[JSON.stringify([CYCLE,OWNER])]='GX_OTHER_GUILD';
 rejectSync(()=>proveGuildPveV14Candidate({
  state:mismatched,cycleId:CYCLE,guildId:GUILD,principalAccountId:OWNER,
 }), 'other_guild_binding');
 const tampered=structuredClone(fabricatedComplete);
 const key=Object.keys(tampered.receipts)[0];
 tampered.receipts[key].value.rewardMinted=true as false;
 rejectSync(()=>proveGuildPveV14Candidate({
  state:tampered,cycleId:CYCLE,guildId:GUILD,principalAccountId:OWNER,
 }), 'tampered_receipt');
 console.log('Guild PvE hidden V12/V13/V14 actor, scripted replay and nonpaying reward proof PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
