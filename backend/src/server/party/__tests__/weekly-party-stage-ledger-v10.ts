import {launchPlayer} from '../../combat/content/launch-combat';
import {partyEventCadenceAt,selectPartyEventVariation,
 type WeeklyPartyFamily} from '../weekly-party-events-v2';
import {partyEventFamilyDesignV8} from '../weekly-party-distinct-finales-v8';
import {PARTY_EVENT_STAGE_LEDGER_V10_RELEASED,partyEventStageChecksumV10,
 projectLockedPartyEventStageV10,planPartyEventStageReceiptV10,
 type PartyEventWeekRecordV10,type PartyEventStageRecordV10,
 type PartyEventTrustedStageContextV10,type PartyEventStageReceiptV10}
 from '../weekly-party-stage-ledger-v10';

function assert(condition:unknown,message:string):asserts condition{
 if(!condition)throw Error('party_event_v10_test: '+message);
}
function rejects(callback:()=>unknown,expected:string):void{
 let error='';try{callback();}catch(e){error=String(e);}
 assert(error.includes(expected),'expected '+expected+' but received '+error);
}
assert(PARTY_EVENT_STAGE_LEDGER_V10_RELEASED===false,'hidden flag must remain disabled');

const EPOCH=Date.parse('2026-11-09T00:00:00.000Z');
const DAY=86_400_000;
const CLASSES=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'] as const;
function makeWeek(cycle:number):PartyEventWeekRecordV10{
 const start=EPOCH+cycle*21*DAY,cadence=partyEventCadenceAt(start),seed=cycle+4;
 const roster=CLASSES.map((name,index)=>{
  const accountId='account-'+cycle+'-test-'+index;
  const characterId='character-'+cycle+'-test-'+index;
  const classId=name.toUpperCase(),savedAtMs=start+500;
  const actor={...launchPlayer(name,25),id:characterId,classId};
  const payload={accountId,characterId,classId,
   loadoutId:'stored-loadout-'+cycle+'-'+index,revision:1,actor,savedAtMs};
  return {accountId,characterId,joinedAtMs:start,
   loadout:{...payload,snapshotHash:partyEventStageChecksumV10(payload)}};
 });
 return {partyId:'persistent-party-test-'+cycle,cycleIndex:cycle,
  eventStartsAtMs:start,eventEndsAtMs:cadence.eventEndsAtMs,
  family:cadence.family,variation:selectPartyEventVariation(cadence.family,seed),
  difficulty:'standard',seed,roster};
}
function makeContext(week:PartyEventWeekRecordV10,stage:1|2|3):
 PartyEventTrustedStageContextV10 {
 const start=week.eventStartsAtMs,options=partyEventFamilyDesignV8(week.family);
 const stageRecord:PartyEventStageRecordV10={
  stage,openedAtMs:start+(stage-1)*DAY+2000,
  stage2Vote:stage>=2?{choice:options.stage2[0].id,lockedAtMs:start+DAY+3000}:null,
  stage3Vote:stage===3?{choice:options.stage3[1].id,lockedAtMs:start+2*DAY+3000}:null,
  verifiedOrders:[],
 };
 return {week,stageRecord,nowMs:stageRecord.openedAtMs+12_000};
}

let projections=0;
for(let cycle=0;cycle<4;cycle++){
 const week=makeWeek(cycle);
 for(const stage of [1,2,3] as const){
  const ctx=makeContext(week,stage);
  const projection=projectLockedPartyEventStageV10(ctx);
  assert(projection.kind==='hidden_non_rewarding_locked_stage'
   &&projection.eligibleForEventPoints===false
   &&projection.eligibleForRewardGrant===false
   &&!('rewards' in projection)&&!('eventPoints' in projection),
   'projection must never mint event points or loot');
  assert(projection.story.stage===stage&&projection.story.family===week.family,
   'stage identity derives from canonical event');
  assert(projection.contextHash===partyEventStageChecksumV10({
    week,stageRecord:ctx.stageRecord}), 'stable server snapshot checksum');
  assert(projection.story.selectedChoice===(stage===1?null:stage===2
   ?ctx.stageRecord.stage2Vote!.choice:ctx.stageRecord.stage3Vote!.choice),
   'only locked stage votes used');
  assert(stage!==1||projection.story.combat===null,'scouting must remain noncombat');
  projections++;
 }
}
assert(projections===12,'cover all four stories and stages');

const week=makeWeek(0),stageOne=makeContext(week,1);
// V32: no fixed 1T/2D/1S quota. All player classes must still resolve from
// the server-trusted class catalog with matching role and frozen checksum.
const allDamageWeek={...week,roster:week.roster.map(member=>{
 const actor={...launchPlayer('Wayfinder',25),
  id:member.characterId,classId:'WAYFINDER'};
 const payload={...member.loadout,classId:'WAYFINDER',actor};
 const {snapshotHash:unused,...raw}=payload;
 void unused;
 return {...member,loadout:{...raw,
  snapshotHash:partyEventStageChecksumV10(raw)}};
})};
const fourDamage=projectLockedPartyEventStageV10(
 {...stageOne,week:allDamageWeek});
assert(fourDamage.story.combat===null&&
 fourDamage.story.verifiedRequiredStages===0,
 'four Damage participants may enroll without changing stage evidence');
const spoofedRole={...allDamageWeek,roster:allDamageWeek.roster.map((member,index)=>
 index===0?{...member,loadout:{...member.loadout,
  actor:{...member.loadout.actor,role:'tank' as const}}}:member)};
rejects(()=>projectLockedPartyEventStageV10(
 {...stageOne,week:spoofedRole}),'invalid_frozen_loadout');
const member=week.roster[0]!;
const evidence={sourceEventId:'source-event-0001',partyId:week.partyId,
 accountId:member.accountId,kind:'verified_noncombat' as const,
 occurredAtMs:stageOne.stageRecord.openedAtMs+1000,
 committedAtMs:stageOne.stageRecord.openedAtMs+2000};
const requestId='request-unique-0001';
const plan=planPartyEventStageReceiptV10({context:stageOne,evidence,requestId,
 actionId:'scout_route',existingReceipts:[]});
assert(plan.status==='new'&&plan.eventPointsGranted===0,
 'new receipt is only a plan and awards zero points');
const replay=planPartyEventStageReceiptV10({context:stageOne,evidence,requestId,
 actionId:'scout_route',existingReceipts:[plan.receipt]});
assert(replay.status==='replay'&&replay.eventPointsGranted===0
 &&replay.receipt.sourceEventId===plan.receipt.sourceEventId,
 'same request and event are idempotent');

rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,sourceEventId:'source-event-0002'},requestId:'request-unique-0002',
 actionId:'scout_route',existingReceipts:[plan.receipt]}),'action_already_claimed');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,accountId:'spoofed-member-999'},requestId,
 actionId:'scout_route',existingReceipts:[]}), 'unverified_or_out_of_window_source');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,partyId:'some-other-party'},requestId,
 actionId:'scout_route',existingReceipts:[]}), 'unverified_or_out_of_window_source');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,kind:'verified_combat'},requestId,
 actionId:'scout_route',existingReceipts:[]}), 'unverified_or_out_of_window_source');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,occurredAtMs:week.eventStartsAtMs-1},
 requestId,actionId:'scout_route',existingReceipts:[]}),
 'unverified_or_out_of_window_source');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,
 evidence:{...evidence,committedAtMs:stageOne.nowMs+1},
 requestId,actionId:'scout_route',existingReceipts:[]}),
 'unverified_or_out_of_window_source');
rejects(()=>planPartyEventStageReceiptV10({context:stageOne,evidence,
 requestId,actionId:'prepare_finale',existingReceipts:[]}), 'action_wrong_stage');

const stageTwo=makeContext(week,2);
const secondEvidence={...evidence,sourceEventId:'source-event-0003',
 occurredAtMs:stageTwo.stageRecord.openedAtMs+1000,
 committedAtMs:stageTwo.stageRecord.openedAtMs+2000};
const second=planPartyEventStageReceiptV10({context:stageTwo,
 evidence:secondEvidence,requestId:'request-unique-0003',
 actionId:'secure_approach',existingReceipts:[]});
rejects(()=>planPartyEventStageReceiptV10({context:stageTwo,
 evidence:secondEvidence,requestId:'request-unique-0004',
 actionId:'support_expedition',existingReceipts:[second.receipt]}),
 'reused_source_or_request');
rejects(()=>planPartyEventStageReceiptV10({context:stageTwo,
 evidence:{...secondEvidence,sourceEventId:'source-event-0004'},
 requestId:'request-unique-0003',actionId:'support_expedition',
 existingReceipts:[second.receipt]}), 'reused_source_or_request');

const changedRoster={...week,roster:week.roster.map((member,index)=>index===0
 ?{...member,loadout:{...member.loadout,actor:{...member.loadout.actor,
 stats:{...member.loadout.actor.stats,attackPower:member.loadout.actor.stats.attackPower+100}}}}
 :member)};
rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:changedRoster}),
 'loadout_checksum_mismatch');
const duplicate={...week,roster:week.roster.map((member,index)=>index===1
 ?{...member,accountId:week.roster[0]!.accountId}:member)};
rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:duplicate}),
 'invalid_enrollment');
// Enrollment must be in the actual event window and before the stage opened.
for(const joinedAtMs of [week.eventStartsAtMs-1,stageOne.stageRecord.openedAtMs+1]){
 const changed={...week,roster:week.roster.map((m,i)=>i===0?{...m,joinedAtMs}:m)};
 rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:changed}),'invalid_frozen_loadout');
}
for(const size of [2,3,4]){
 const flexible={...allDamageWeek,roster:allDamageWeek.roster.slice(0,size)};
 const projected=projectLockedPartyEventStageV10({...stageOne,week:flexible});
 assert(projected.eligibleForRewardGrant===false,'valid flexible roster size '+size);
}
for(const size of [0,1,5]){
 const roster=size===5?[...week.roster,week.roster[0]!]:week.roster.slice(0,size);
 rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:{...week,roster}}),'invalid_enrollment');
}
const duplicateCharacter={...week,roster:week.roster.map((m,i)=>i===1?{...m,characterId:member.characterId}:m)};
rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:duplicateCharacter}),'invalid_enrollment');
const wrongOwner={...week,roster:week.roster.map((m,i)=>i===0?{...m,loadout:{...m.loadout,accountId:'foreign-owner-test'}}:m)};
rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:wrongOwner}),'invalid_frozen_loadout');
// V11 uniqueness applies across parties and weeks, not just the current view.
const planWith=(existingReceipts:readonly PartyEventStageReceiptV10[])=>planPartyEventStageReceiptV10({
 context:stageOne,evidence,requestId,actionId:'scout_route',existingReceipts,
});
rejects(()=>planWith([{...plan.receipt,partyId:'other-party-0001'}]),'action_already_claimed');
for(const collision of [
 {...plan.receipt,eventStartsAtMs:week.eventStartsAtMs-21*DAY,requestId:'old-request-0001'},
 {...plan.receipt,eventStartsAtMs:week.eventStartsAtMs-21*DAY,sourceEventId:'old-source-0001'},
 {...plan.receipt,partyId:'other-party-0001',accountId:'other-account-0001'},
])rejects(()=>planWith([collision]),'reused_source_or_request');
rejects(()=>planWith([plan.receipt,{...plan.receipt}]),'action_already_claimed');
rejects(()=>planWith([plan.receipt,{...plan.receipt,eventStartsAtMs:week.eventStartsAtMs-21*DAY}]),'reused_source_or_request');
const leaking={...stageOne,stageRecord:{...stageOne.stageRecord,
 stage3Vote:{choice:'brace_wagons',lockedAtMs:stageOne.nowMs}}};
rejects(()=>projectLockedPartyEventStageV10(leaking),'future_vote_leak');
const missingVote={...stageTwo,stageRecord:{...stageTwo.stageRecord,stage2Vote:null}};
rejects(()=>projectLockedPartyEventStageV10(missingVote),'vote_not_locked');
const tamperedVote={...stageTwo,stageRecord:{...stageTwo.stageRecord,
 stage2Vote:{choice:'fake_route',lockedAtMs:stageTwo.nowMs}}};
rejects(()=>projectLockedPartyEventStageV10(tamperedVote),'vote_not_locked');
const futureStage={...stageTwo,stageRecord:{...stageTwo.stageRecord,
 stage3Vote:{choice:'brace_wagons',lockedAtMs:stageTwo.nowMs}}};
rejects(()=>projectLockedPartyEventStageV10(futureStage),'future_vote_leak');
const late={...stageOne,nowMs:week.eventEndsAtMs};
rejects(()=>projectLockedPartyEventStageV10(late),'closed_or_invalid_window');
const wrongFamily={...week,family:'lost_reliquary' as WeeklyPartyFamily};
rejects(()=>projectLockedPartyEventStageV10({...stageOne,week:wrongFamily}),
 'week_identity_mismatch');
const supply={stage:1 as const,kind:'required' as const,itemId:'GREENWOOD_LOG',
 category:'wood' as const,tier:'common' as const,quantity:10,
 estimatedGatherSeconds:300,donatedQuantity:1};
const duplicateSupply={...stageOne,stageRecord:{...stageOne.stageRecord,
 verifiedOrders:[supply,supply]}};
rejects(()=>projectLockedPartyEventStageV10(duplicateSupply),
 'invalid_supply_ledger');

const recorded:readonly PartyEventStageReceiptV10[]=Object.freeze([plan.receipt]);
assert(recorded.length===1,'fixture tests plan output without storing anything');
console.log('Party Events v10: 12 family/stage projections and receipt security cases passed');
