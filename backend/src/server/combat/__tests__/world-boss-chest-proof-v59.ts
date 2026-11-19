import {
 WORLD_BOSS_CHEST_PROOF_V59_LIVE,
 resolveWorldBossChestEvidenceV59,previewAuthenticatedWorldBossChestsV59,
 type WorldBossCanonicalChestReadV59,
} from '../world-boss-chest-proof-v59';
import {previewVerifiedWorldBossChestsV58} from '../world-boss-chests-v58';
function check(v:unknown,msg:string):asserts v{
 if(!v)throw Error('world_boss_v59_test:'+msg);
}
function rejectsSync(fn:()=>unknown,code:string){
 let failed=false;try{fn();}catch(e){failed=String(e).includes(code);}
 check(failed,'expected_'+code);
}
const EVENT='11111111-1111-4111-8111-111111111111';
const ACCOUNT='22222222-2222-4222-8222-222222222222';
const req=(i:number)=>'requestproof'+i;
const sample:WorldBossCanonicalChestReadV59={
 eventId:EVENT,accountId:ACCOUNT,
 event:{bossId:'hollowroot',initialHp:1000,remainingHp:300},
 warCamp:{eventId:EVENT,
  trackTiers:{fortifications:1,fieldProvisions:1,siegecraft:0},
  ownDonationReceipts:[
   {eventId:EVENT,accountId:ACCOUNT,requestId:'supplyproof1',status:'committed'},
  ],
 },
 attacks:[1,2,3].map(ordinal=>({
  eventId:EVENT,accountId:ACCOUNT,ordinal,requestId:req(ordinal),
  status:'committed' as const,replayProof:'verified' as const,
 })),
};
check(!WORLD_BOSS_CHEST_PROOF_V59_LIVE,'hidden');
const evidence=resolveWorldBossChestEvidenceV59(sample);
check(previewVerifiedWorldBossChestsV58(evidence).length===3,
 'three_account_milestones');
check(evidence.committedAttempts===3&&evidence.personalProvenAttacks===3,
 'committed_replay_proof');
check(evidence.communityDamageGoalCompleted,'exact_70_percent_boundary');
check(!resolveWorldBossChestEvidenceV59({
 ...sample,event:{...sample.event,remainingHp:301},
}).communityDamageGoalCompleted,'below_70_percent_not_met');
check(!resolveWorldBossChestEvidenceV59({
 ...sample,warCamp:{...sample.warCamp,
  trackTiers:{fortifications:1,fieldProvisions:0,siegecraft:0}},
}).preparationGoalCompleted,'two_camp_tracks_required');
check(resolveWorldBossChestEvidenceV59({
 ...sample,warCamp:{...sample.warCamp,ownDonationReceipts:[]},
}).personalCommittedDonations===0,'own_donation_required');
check(previewVerifiedWorldBossChestsV58(resolveWorldBossChestEvidenceV59({
 ...sample,attacks:[...sample.attacks.slice(0,2),
  {...sample.attacks[2],status:'reserved',replayProof:'absent'}],
})).length===2,'reservation_not_counted');
check(previewVerifiedWorldBossChestsV58(resolveWorldBossChestEvidenceV59({
 ...sample,attacks:[...sample.attacks.slice(0,2),
  {...sample.attacks[2],replayProof:'pending'}],
})).length===2,'pending_replay_not_counted');
rejectsSync(()=>resolveWorldBossChestEvidenceV59({
 ...sample,warCamp:{...sample.warCamp,ownDonationReceipts:[
  sample.warCamp.ownDonationReceipts[0],
  sample.warCamp.ownDonationReceipts[0],
 ]},
}),'untrusted_private_evidence');
rejectsSync(()=>resolveWorldBossChestEvidenceV59({
 ...sample,attacks:[...sample.attacks,{...sample.attacks[0],requestId:'newreceipt1'}],
}),'untrusted_private_evidence');
rejectsSync(()=>resolveWorldBossChestEvidenceV59({
 ...sample,attacks:[{...sample.attacks[0],accountId:EVENT},...sample.attacks.slice(1)],
}),'untrusted_private_evidence');
rejectsSync(()=>resolveWorldBossChestEvidenceV59({
 ...sample,event:{...sample.event,remainingHp:1200},
}),'untrusted_private_evidence');
rejectsSync(()=>resolveWorldBossChestEvidenceV59({
 ...sample,warCamp:{...sample.warCamp,eventId:ACCOUNT},
}),'untrusted_private_evidence');
(async()=>{
 const result=await previewAuthenticatedWorldBossChestsV59({
  token:'valid-private-access-token',eventId:EVENT,
 },{
  authenticate:async()=>ACCOUNT,
  readCanonical:async()=>sample,
 });
 check(result.length===3&&result.every(x=>x.claimable===false),
  'auth_preview_still_nongranting');
 let rejected=false;
 try{
  await previewAuthenticatedWorldBossChestsV59({
   token:'valid-private-access-token',eventId:EVENT,
  },{
   authenticate:async()=>ACCOUNT,
   readCanonical:async()=>({...sample,accountId:EVENT}),
  });
 }catch(e){rejected=String(e).includes('untrusted_private_evidence');}
 check(rejected,'foreign_db_account_rejected');
 console.log('WORLD_BOSS_V59_PROOF_OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
