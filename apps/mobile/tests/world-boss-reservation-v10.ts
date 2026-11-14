/** Hidden World Boss v10 reservation/lease/last-HP test matrix. No DB or currency. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {makeWorldBossEncounterProfileV13} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {prepareWorldBossRosterV9,type WorldBossRosterLoaderV9} from '../../../backend/src/server/combat/world-boss-verified-roster-v9';
import {
 WorldBossReservationEmulatorV10,WORLD_BOSS_V10_LEASE_MS,WORLD_BOSS_V10_RECOVERY_MS,
 verifyWorldBossV9PreparedRoster,
} from '../../../backend/src/server/combat/world-boss-reservation-v10';
const NOW=1794315600000;
function instance(hp:number,until=NOW+7*86400000){
 return new WorldBossReservationEmulatorV10({
  eventId:'WORLD_BOSS_V10_TEST',boss:'hollowroot',
  startsAtUtcMs:NOW-1000,endsAtUtcMs:until,maxHp:hp,
 });
}
async function prepared(accountId:string,requestId:string,at=NOW){
 const player=launchPlayer('Ironwarden',25);
 const characterId='CHAR_'+accountId+'_'+requestId;
 const serverSeed='SERVER_ENTROPY_V10_'+accountId+'_'+requestId+'_long_random_test_value';
 const loader:WorldBossRosterLoaderV9={
  principalAccountId:accountId,nowUtcMs:()=>at,randomSeed:()=>serverSeed,
  loadCurrentCharacter:async()=>({
   snapshotId:'SNAP_'+characterId,ownerAccountId:accountId,capturedAtUtcMs:at-100,
   bracket:3,usageCount:0,eligible:true,
   verified:{
    characterId,classId:'IRONWARDEN',role:'tank',level:25,
    maxHp:player.stats.maxHp,attackPower:player.stats.attackPower,
    healingPower:player.stats.healingPower,defense:player.stats.defense,
    accuracy:player.stats.accuracy,evasion:player.stats.evasion,
    critChance:player.stats.critChance,critMultiplier:player.stats.critMultiplier,
    haste:player.stats.haste,
   },
   abilities:player.abilities.map(a=>({...a,effects:a.effects.map(e=>({...e}))})),
  }),
  listEligibleEchoes:async()=>[],
 };
 return prepareWorldBossRosterV9(loader,{
  eventId:'WORLD_BOSS_V10_TEST',characterId,requestId,order:'steady_assault',
 });
}
async function reject(fn:()=>Promise<unknown>,match:string){
 let ok=false;try{await fn();}catch(e){ok=String(e).includes(match);}
 assert.ok(ok,'expected '+match);
}
async function main(){
 const first=await prepared('OWNER_A','REQUEST_FIRST_01');
 verifyWorldBossV9PreparedRoster('WORLD_BOSS_V10_TEST',first);
 const tampered=structuredClone(first);
 tampered.command.squad[0].resolvedCombatant.stats.attackPower+=12345;
 await reject(async()=>verifyWorldBossV9PreparedRoster('WORLD_BOSS_V10_TEST',tampered),
  'roster_digest_mismatch');
 await reject(async()=>verifyWorldBossV9PreparedRoster('WRONG_EVENT',first),
  'roster_digest_mismatch');
 const immutable=instance(100000);
 const reservation=await immutable.reserve(first,NOW);
 assert.equal(reservation.repeated,false);
 assert.equal(reservation.reservation.ordinal,1);
 assert.equal(reservation.reservation.phase,'armored');
 assert.equal(reservation.reservation.generation,1);
 const again=await immutable.reserve(first,NOW+3000);
 assert.equal(again.repeated,true);
 assert.equal(again.reservation.serverSeed,first.serverSeed);
 const wrongSeed=structuredClone(first);
 wrongSeed.serverSeed='DIFFERENT_RANDOM_SEED_AT_LEAST_24_CHARS';
 wrongSeed.command.serverSeed=wrongSeed.serverSeed;
 await reject(()=>immutable.reserve(wrongSeed,NOW+3000),'idempotency_payload_mismatch');
 const detached=await immutable.read('OWNER_A','REQUEST_FIRST_01');
 assert.ok(detached);
 detached!.command.squad[0].resolvedCombatant.stats.maxHp=1;
 assert.ok((await immutable.read('OWNER_A','REQUEST_FIRST_01'))!.command.squad[0].resolvedCombatant.stats.maxHp>1);

 // Every battle is simulated between reservation and finalization, never
 // under the exclusive event write lock. Only one account gets the last HP.
 const last=instance(1);
 const preps=await Promise.all(Array.from({length:24},(_,i)=>prepared('ACCOUNT_'+i,'REQUEST_SHARED_001')));
 const reserved=await Promise.all(preps.map(p=>last.reserve(p,NOW)));
 assert.ok(reserved.every(x=>!x.repeated));
 const results=await Promise.all(preps.map(p=>last.run(p.command.accountId,p.command.requestId,NOW)));
 assert.equal(results.filter(x=>x.settlement.worldHpCredited>0).length,1);
 assert.equal(results.reduce((n,x)=>n+x.settlement.worldHpCredited,0),1);
 assert.equal(results.filter(x=>x.settlement.residualEcho).length,23);
 assert.equal(last.snapshot().remainingHp,0);
 assert.equal(last.snapshot().revision,24);
 assert.deepEqual(last.snapshot().crossedThresholds,[70,30,0]);
 assert.ok(results.every(x=>!x.settlement.rewardsGranted));

 const limit=instance(1000000);
 const sameAccount=await Promise.all(Array.from({length:12},(_,i)=>prepared('SAME_OWNER','ATTEMPT_'+i+'_V10')));
 // These are twelve distinct owned fighter IDs on one account. The World
 // Boss attempts cap must apply to the account, not multiply per character.
 assert.equal(new Set(sameAccount.map(p=>p.command.characterId)).size,12);
 assert.ok(sameAccount.every(p=>p.command.accountId==='SAME_OWNER'));
 const slots=await Promise.allSettled(sameAccount.map(p=>limit.reserve(p,NOW)));
 assert.equal(slots.filter(x=>x.status==='fulfilled').length,3);
 assert.equal(slots.filter(x=>x.status==='rejected').length,9);
 assert.deepEqual(Object.values(limit.snapshot().reservations).map(x=>x.ordinal).sort(),[1,2,3]);

 // A recovered worker does NOT regenerate seed, snapshot, phase or request.
 const recovery=instance(500000);
 const recoverP=await prepared('RECOVER_OWNER','REQUEST_RECOVER_1');
 await recovery.reserve(recoverP,NOW);
 const oldJob=await recovery.checkout('RECOVER_OWNER','REQUEST_RECOVER_1',NOW);
 const newJob=await recovery.checkout('RECOVER_OWNER','REQUEST_RECOVER_1',NOW+WORLD_BOSS_V10_LEASE_MS+1);
 assert.equal(newJob.generation,oldJob.generation+1);
 assert.deepEqual(newJob.command,oldJob.command);
 assert.equal(newJob.phase,oldJob.phase);
 await reject(()=>recovery.settleJob(oldJob,NOW+WORLD_BOSS_V10_LEASE_MS+2),
  'stale_or_altered_job');
 const settled=await recovery.settleJob(newJob,NOW+WORLD_BOSS_V10_LEASE_MS+2);
 assert.equal(settled.repeated,false);
 assert.equal(settled.settlement.ordinal,1);
 assert.equal(recovery.snapshot().revision,1);
 await reject(()=>recovery.voidFailed('RECOVER_OWNER','REQUEST_RECOVER_1'),'cannot_void_committed');

 // Concurrent retransmits of one finished job return the SAME receipt.
 const duplicates=instance(1000000);
 const duplicateP=await prepared('DUP_OWNER','REQUEST_DUP_001');
 await duplicates.reserve(duplicateP,NOW);
 const duplicateJob=await duplicates.checkout('DUP_OWNER','REQUEST_DUP_001',NOW);
 const dupResults=await Promise.all(Array.from({length:18},()=>duplicates.settleJob(duplicateJob,NOW)));
 assert.equal(dupResults.filter(x=>!x.repeated).length,1);
 assert.equal(dupResults.filter(x=>x.repeated).length,17);
 assert.equal(duplicates.snapshot().revision,1);
 assert.equal(new Set(dupResults.map(x=>x.settlement.replayDigest)).size,1);
 const modifiedJob=structuredClone(duplicateJob);
 modifiedJob.command.squad[0].resolvedCombatant.stats.attackPower+=1;
 await reject(()=>duplicates.settleJob(modifiedJob,NOW),'settlement_conflict');

 // An abandoned reservation is a tombstone: no permanent debit, no reroll
 // with the same request ID, and a replacement request can reuse the slot.
 const expired=instance(400000);
 const abandonedP=await prepared('EXPIRE_OWNER','REQUEST_EXPIRE_1');
 await expired.reserve(abandonedP,NOW);
 await reject(()=>expired.checkout('EXPIRE_OWNER','REQUEST_EXPIRE_1',NOW+WORLD_BOSS_V10_RECOVERY_MS+1),
  'reservation_expired');
 assert.equal((await expired.read('EXPIRE_OWNER','REQUEST_EXPIRE_1'))!.status,'voided');
 const replacementAt=NOW+WORLD_BOSS_V10_RECOVERY_MS+2;
 const replacement=await expired.reserve(await prepared('EXPIRE_OWNER','REQUEST_REPLACE_1',replacementAt),replacementAt);
 assert.equal(replacement.reservation.ordinal,1);
 const tombstone=await expired.reserve(abandonedP,NOW+WORLD_BOSS_V10_RECOVERY_MS+3);
 assert.equal(tombstone.reservation.status,'voided');
 const cancelled=instance(100000);
 await cancelled.reserve(await prepared('VOID_OWNER','REQUEST_CANCEL_1'),NOW);
 await cancelled.voidFailed('VOID_OWNER','REQUEST_CANCEL_1');
 const reclaimed=await cancelled.reserve(await prepared('VOID_OWNER','REQUEST_CANCEL_2'),NOW);
 assert.equal(reclaimed.reservation.ordinal,1);
 assert.equal(cancelled.snapshot().revision,0);

 // Pre-close reservations may settle during the grace period; new
 // reservations cannot arrive after the event close timestamp.
 const closing=instance(100000,NOW+1000);
 const closeP=await prepared('CLOSE_OWNER','REQUEST_CLOSE_001');
 await closing.reserve(closeP,NOW);
 const closeJob=await closing.checkout('CLOSE_OWNER','REQUEST_CLOSE_001',NOW);
 const completed=await closing.settleJob(closeJob,NOW+1500);
 assert.equal(completed.repeated,false);
 const lateP=await prepared('LATE_OWNER','REQUEST_LATE_001',NOW+1500);
 await reject(()=>closing.reserve(lateP,NOW+1500),
  'event_not_accepting_reservations');
 const receipt=await closing.run('CLOSE_OWNER','REQUEST_CLOSE_001',NOW+1500);
 assert.equal(receipt.repeated,true);
 assert.equal(receipt.settlement.replayDigest,completed.settlement.replayDigest);
 // War Camp benefits must be frozen with the original server reservation and
 // cannot change on network retry after the community has advanced a tier.
 const warCamp=makeWorldBossWarCampSnapshotV11({eventId:'WORLD_BOSS_V10_TEST',revision:42,
  levels:{fortifications:1,fieldProvisions:2,siegecraft:1}});
 const campModel=instance(100000);
 const campP=await prepared('CAMP_OWNER','REQUEST_CAMP_001');
 await campModel.reserve(campP,NOW,warCamp);
 const campRetry=await campModel.reserve(campP,NOW+1,
  makeWorldBossWarCampSnapshotV11({eventId:'WORLD_BOSS_V10_TEST',revision:43,
   levels:{fortifications:2,fieldProvisions:2,siegecraft:2}}));
 assert.equal(campRetry.reservation.serverWarCamp?.digest,warCamp.digest,'retry keeps first War Camp revision');
 const campJob=await campModel.checkout('CAMP_OWNER','REQUEST_CAMP_001',NOW);
 assert.equal(campJob.serverWarCamp?.digest,warCamp.digest);
 const corruptCampJob=structuredClone(campJob);
 corruptCampJob.serverWarCamp!.levels.siegecraft=2;
 await reject(()=>campModel.settleJob(corruptCampJob,NOW),'war_camp_digest_mismatch');
 const campReceipt=await campModel.settleJob(campJob,NOW);
 assert.equal(campReceipt.settlement.warCampDigest,warCamp.digest);
 assert.equal(campReceipt.settlement.rewardsGranted,false);
 // V13: profile is frozen alongside War Camp, seed, phase and squad. A client
 // retry cannot upgrade the band or replace its guard, even after event change.
 const profile=makeWorldBossEncounterProfileV13({
  eventId:'WORLD_BOSS_V10_TEST',configVersion:'v13-test-frozen-reference',
  boss:'hollowroot',phase:'armored',gearBand:1,attack:100,defense:20,guardMax:90,
 });
 const bossModel=instance(100000);
 const bossP=await prepared('PROFILE_OWNER','REQUEST_PROFILE_1');
 await bossModel.reserve(bossP,NOW,undefined,profile,1);
 const profileRetry=await bossModel.reserve(bossP,NOW+1,undefined,
  makeWorldBossEncounterProfileV13({...profile,gearBand:2,guardMax:200}),1);
 assert.equal(profileRetry.reservation.serverEncounterProfile?.digest,profile.digest);
 const bossJob=await bossModel.checkout('PROFILE_OWNER','REQUEST_PROFILE_1',NOW);
 assert.equal(bossJob.serverEncounterProfile?.digest,profile.digest);
 const badJob=structuredClone(bossJob);
 badJob.serverEncounterProfile!.guardMax=999;
 await reject(()=>bossModel.settleJob(badJob,NOW),'invalid_or_foreign_profile');
 const bossSettlement=await bossModel.settleJob(bossJob,NOW);
 assert.equal(bossSettlement.settlement.encounterProfileDigest,profile.digest);
 assert.equal(bossSettlement.settlement.rewardsGranted,false);
 const bossReplay=await bossModel.run('PROFILE_OWNER','REQUEST_PROFILE_1',NOW);
 assert.equal(bossReplay.repeated,true);
 assert.equal(bossReplay.settlement.replayDigest,bossSettlement.settlement.replayDigest);
 const foreignProfile=makeWorldBossEncounterProfileV13({...profile,eventId:'OTHER_EVENT'});
 const foreignP=await prepared('FOREIGN_OWNER','REQUEST_FOREIGN_1');
 await reject(()=>bossModel.reserve(foreignP,NOW,undefined,foreignProfile,1),'invalid_or_foreign_profile');
 await reject(()=>bossModel.reserve(foreignP,NOW,undefined,profile,2),'unverified_encounter_band');
 console.log('WB_RESERVATION_V10='+JSON.stringify({
  lastHpConcurrentAccounts:24,lastHpCredits:1,residualEchoes:23,
  accountAttemptsAccepted:3,rejected:9,duplicateFinalizations:18,
  recoverableSameSeed:true,staleGenerationRejected:true,abandonedSlotReclaimed:true,
  afterClosePreReservedSettled:true,mintedSigils:0,actualDatabaseTransactions:0,
  liveWorldBossEnabled:false,
 }));
}
void main().catch(err=>{console.error(err);throw err;});
