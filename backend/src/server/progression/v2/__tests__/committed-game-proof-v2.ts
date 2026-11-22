import {recoverCommittedCareerProofV2} from '../committed-game-proof-v2';
import {projectServerSettlementV2} from '../settlement-journal-preview';

const actor='11111111-1111-4111-8111-111111111111';
const account='22222222-2222-4222-8222-222222222222';
const proof={
 source_kind:'gathering_claim',source_id:'a'.repeat(64),account_id:account,
 request_id:'claim0000001',request_hash:'b'.repeat(64),
 segment_index:0,expected_game_revision:18,character_id:actor,
 profession_id:'mining',claimed_elapsed_seconds:240,
 base_effort_seconds:240,difficulty_basis_points:10000,
 completed_at:'2026-11-22T13:52:00.000+00:00',
};
const link={
 accountId:account,action:'online_game_v1' as const,
 requestId:'claim0000001',requestHash:'b'.repeat(64),
 committedRevision:18,committedCharacterId:actor,
};
function eq(a:unknown,b:unknown,label:string){
 if(a!==b)throw Error(label+': expected '+String(b)+' got '+String(a));
}
function rejects(fn:()=>unknown,pattern:RegExp,label:string){
 try{fn()}catch(e){
  if(pattern.test(String(e)))return;
  throw Error(label+': wrong rejection '+String(e));
 }
 throw Error(label+': unexpectedly accepted');
}
const verified=recoverCommittedCareerProofV2(proof,link);
eq(verified.source,'gathering_claim','source bound');
eq(verified.sourceId,'a'.repeat(64),'canonical source ID');
eq(verified.ownerCharacterId,actor,'no character switching');
eq(verified.completedAtMs,Date.parse('2026-11-22T13:52:00Z'),'DB timestamp');
const credit=projectServerSettlementV2(verified);
eq(credit.award.overallCharacterXp,120,'recorded work XP awarded at rate');
eq(credit.award.professionId,'mining','correct single skill');
eq(credit.award.professionXp,240,'profession XP projection');
eq(credit.award.combatXp,0,'no combat XP from gathering');
const retry=recoverCommittedCareerProofV2(proof,link);
eq(projectServerSettlementV2(retry).fingerprint,credit.fingerprint,'retry fingerprint consistent');

rejects(()=>recoverCommittedCareerProofV2({...proof,source_id:'foo'},link),
 /invalid_source/,'untrusted source ID');
rejects(()=>recoverCommittedCareerProofV2({...proof,profession_id:'smithing'},link),
 /invalid_source/,'invalid gathering profession');
rejects(()=>recoverCommittedCareerProofV2({...proof,claimed_elapsed_seconds:108000},link),
 /invalid_source/,'overlong elapsed claim');
rejects(()=>recoverCommittedCareerProofV2({...proof,completed_at:'2026-11-22T13:52:00'},link),
 /invalid_db_time/,'unoffset client clock not proof');
rejects(()=>recoverCommittedCareerProofV2(proof,{...link,accountId:actor}),
 /unlinked_game_commit/,'cross-account receipt');
rejects(()=>recoverCommittedCareerProofV2(proof,{...link,requestHash:'c'.repeat(64)}),
 /unlinked_game_commit/,'request hash changed');
rejects(()=>recoverCommittedCareerProofV2(proof,{...link,committedRevision:19}),
 /unlinked_game_commit/,'old game revision replay');
rejects(()=>recoverCommittedCareerProofV2(proof,{...link,committedCharacterId:account}),
 /unlinked_game_commit/,'post-command alternate character');
rejects(()=>recoverCommittedCareerProofV2(proof,{...link,requestId:'claim0000002'}),
 /unlinked_game_commit/,'different request');
console.log('PASS: DB-backed Career XP proof rehydration is bound to canonical game receipt and owner');
