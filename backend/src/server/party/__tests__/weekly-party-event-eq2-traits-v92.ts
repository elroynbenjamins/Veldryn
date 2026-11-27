import {planPartyRoleSwapResponseV107} from '../party-role-swap-transition-review-v107';
import {reviewPartyChatActionTransactionV106,type PartyChatStoreV106,type PartyChatTransactionV106,type PartyChatRequestV106,type PartyChatReceiptV106,type PartyChatEffectV106,type PartyChatWorkflowV106} from '../party-chat-action-transaction-review-v106';
import {projectPartyChatCardV105,type VoteCardV105,type ReadyCardV105,type RecruitmentCardV105,type AchievementCardV105} from '../party-chat-action-cards-review-v105';
import {projectPartySwapChatV104,type PartySwapChatProposalV104} from '../party-role-swap-chat-review-v104';
import {reviewPartyCharacterSwapV103,type PartyCharacterV103} from '../party-roster-character-swap-review-v103';
import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatInput,CombatV2Resource} from '../../combat/types';
import {launchPlayer} from '../../combat/content/launch-combat';
import {
 EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 type VerifiedV2EquipmentEffectSource,
} from '../../combat/v2/equipment-trait-engine-authority';
import {enemyV2SnapshotDigest} from '../../combat/v2/enemy-engine-authority';
import {
 PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
 preparePartyEventBossTraitKitV90,
} from '../weekly-party-boss-traits-v90';
import type {WeeklyPartyFamily,WeeklyPartyDifficulty} from '../weekly-party-events-v2';
import {reviewFrozenPartyEventReplayV96} from '../weekly-party-event-replay-v96';
import {
 recordNonpayingPartyReviewV97,type NonpayingReviewReceiptV97,
 type ReviewLedgerStoreV97,
} from '../weekly-party-event-review-ledger-v97';
import {
 PARTY_EVENT_RESULT_AUDIT_V95_RELEASED,
 reviewPartyEventCombatResultV95,
} from '../weekly-party-event-result-audit-v95';
import {
 PARTY_EVENT_EQ2_TRAIT_V92_RELEASED,
 PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,
 simulateFrozenPartyEventEquipmentV92,
 type FrozenPartyEventV92Witness,
 type VerifiedPartyEventV92Ports,
} from '../weekly-party-event-eq2-traits-v92';

const families:readonly WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const names:Record<WeeklyPartyFamily,string>={
 broken_caravan:'Roadbreaker Captain',nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',lost_reliquary:'Reliquary Sentinel',
};
const difficulties:readonly WeeklyPartyDifficulty[]=['standard','veteran','heroic'];
const difficultyScales:Record<WeeklyPartyDifficulty,number>={
 standard:1,veteran:1.2,heroic:1.4,
};
const players:[string,CombatV2Resource][]=[
 ['Ironwarden','guard'],['Dawnkeeper','radiance'],
 ['Wayfinder','focus'],['Ravager','fury'],
];
const weekStartsAtMs=Date.UTC(2026,10,9,0,0,0);
const weekEndsAtMs=weekStartsAtMs+7*86400000;

function legacyBoss(family:WeeklyPartyFamily,difficulty:WeeklyPartyDifficulty,
 size:number,tier:number):CombatantDefinition{
 const scale=difficultyScales[difficulty];
 return {
  id:'PARTY_EVENT_BOSS',name:names[family],team:'enemies',role:'enemy',
  boss:true,level:25+2*(tier-1),
  stats:{
   maxHp:Math.round(size*5400*Math.pow(1.42,tier-1)*scale),
   attackPower:Math.round(355*Math.pow(1.20,tier-1)*scale),
   healingPower:0,
   defense:Math.round(520*Math.pow(1.16,tier-1)*scale),
   accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03,
  },
  basicAttackMs:2700,basicAttackCoeff:.8,
  abilities:[
   {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
    castTimeMs:400,target:'current_target',priority:80,
    effects:[{kind:'damage',coeff:1.15}]},
   {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
    castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
    effects:[{kind:'damage',coeff:.38+Math.min(.3,.03*tier)}]},
  ],
  phases:[{id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',
    value:Math.min(.35,.07+.015*tier),durationMs:90_000}]}],
 };
}
function fixture(
 family:WeeklyPartyFamily,difficulty:WeeklyPartyDifficulty,
 partySize:number,tier:number,traits=true,
){
 const heroes=players.slice(0,partySize).map(([classId,resource],i)=>{
  const actor=launchPlayer(classId,25);
  return {...actor,id:'QA_V92_ACTOR_'+i,
   combatV2:{version:2 as const,resource,specializationId:'QA_V92_SPEC_'+classId}};
 });
 const sources:VerifiedV2EquipmentEffectSource[]=heroes.map(
  (actor,i):VerifiedV2EquipmentEffectSource=>({
  source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
  revision:3,accountId:'QA_ACCOUNT_'+i,characterId:'QA_CHAR_'+i,
  actorId:actor.id,ownedEquippedInstanceIds:['QA_COPY_'+i],
  equipmentReceiptDigest:(i+1).toString(16).repeat(64),
  basicAttackDamagePct:traits?2.5:0,
  abilityDamagePct:traits?3.5:0,
  reflectDamagePct:traits&&i===0?1.2:0,
  traits:traits?[{instanceId:'QA_COPY_'+i,traitId:
   i===0?'thornbound_riposte':i===1?'mending_echo':'sword_dance'}]:[],
 }));
 const boss=preparePartyEventBossTraitKitV90(
  legacyBoss(family,difficulty,partySize,tier),family,tier,true);
 const eventId='QA_EVENT_'+family;
 const seed=['QA_V92',family,difficulty,partySize,tier,traits?'trait':'plain'].join('_');
 const combat:CombatInput={
  seed,players:heroes,enemies:[boss],maxDurationMs:PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,
 };
 const witness:FrozenPartyEventV92Witness={
  source:'server-persisted-party-boss-v92',
  ruleset:PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
  phaseKitVersion:PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
  mode:'new-run-only',encounterId:seed,
  eventId,partyId:'QA_PARTY_1',family,difficulty,tier,
  revision:2,seed,weekStartsAtMs,weekEndsAtMs,
  frozenAtMs:weekEndsAtMs-3600000,
  settlementAtMs:weekEndsAtMs+3600000,
  roster:sources.map(source=>({
   accountId:source.accountId,characterId:source.characterId,
   actorId:source.actorId,receiptRevision:source.revision,
   equipmentReceiptDigest:source.equipmentReceiptDigest,
  })),
 };
 // QA fixture only! Real deployment MUST independently load and lock these
 // records from V11/V18/V23/V87 and equipped-item storage. This fake callback
 // is *never* an approved persistence or victory source.
 const ports:VerifiedPartyEventV92Ports={verifyPersisted:(w,s,d)=>
  d===enemyV2SnapshotDigest({
   witness:w,combatDigest:enemyV2SnapshotDigest(combat),sources:s,
  })};
 return {witness,combat,sources,ports};
}
function denied(fn:()=>unknown,needle:string){
 let error:unknown;
 try{fn();}catch(caught:unknown){error=caught;}
 assert.ok(error!==undefined&&String(error).includes(needle),
  'expected '+needle+', got '+String(error));
}
const currentRoster:PartyCharacterV103[]=[
 {accountId:'A',characterId:'A_tank',classId:'IRONWARDEN'},
 {accountId:'B',characterId:'B_damage',classId:'RAVAGER'},
 {accountId:'C',characterId:'C_damage',classId:'HEXWEAVER'},
 {accountId:'D',characterId:'D_support',classId:'DAWNKEEPER'},
];
const alternateA:PartyCharacterV103={accountId:'A',characterId:'A_damage',classId:'WAYFINDER'};
const alternateB:PartyCharacterV103={accountId:'B',characterId:'B_tank',classId:'BASTION'};
const swapInput={
 partyId:'QA_PARTY_SWAP',mode:'dungeon' as const,phase:'lobby' as const,
 rosterRevision:7,expectedRevision:7,current:currentRoster,
 proposed:[alternateB,alternateA,...currentRoster.slice(2)],
 ownedCharacters:[...currentRoster,alternateA,alternateB],
 consents:[{accountId:'A',characterId:'A_damage',rosterRevision:7},
  {accountId:'B',characterId:'B_tank',rosterRevision:7}],
};
const swapped=reviewPartyCharacterSwapV103(swapInput,true);
assert.deepEqual(swapped.roster.map(r=>r.accountId),['A','B','C','D']);
assert.deepEqual(swapped.roster.map(r=>r.characterId),['A_damage','B_tank','C_damage','D_support']);
assert.equal(swapped.proposedRevision,8);
assert.equal(swapped.requiresFreshReadyCheck,true);
assert.equal(swapped.canPersist,false);
assert.equal(currentRoster[0]!.characterId,'A_tank');
denied(()=>reviewPartyCharacterSwapV103({...swapInput,expectedRevision:6},true),'stale_or_invalid_revision');
denied(()=>reviewPartyCharacterSwapV103({...swapInput,consents:swapInput.consents.slice(0,1)},true),'consent_missing_or_mismatched');
for(const phase of ['ready_check','committed_run','event_frozen'] as const)
 denied(()=>reviewPartyCharacterSwapV103({...swapInput,phase},true),'roster_locked');
denied(()=>reviewPartyCharacterSwapV103({...swapInput,proposed:[alternateA,...currentRoster.slice(1)],
 consents:swapInput.consents.slice(0,1)},true),'invalid_dungeon_roles');
denied(()=>reviewPartyCharacterSwapV103({...swapInput,ownedCharacters:currentRoster},true),'character_not_owned');
const flexible=reviewPartyCharacterSwapV103({...swapInput,mode:'party_event',current:currentRoster.slice(0,2),
 proposed:[alternateA,currentRoster[1]!],consents:swapInput.consents.slice(0,1)},true);
assert.equal(flexible.roster.length,2,'event lobby permits two damage characters');
denied(()=>reviewPartyCharacterSwapV103(swapInput),'unreleased');
const permanent={
 ...swapInput,mode:'persistent_party' as const,proposalId:'QA_SWAP_1',minimumLevel:10,
 ownedCharacters:swapInput.ownedCharacters.map(row=>({...row,combatLevel:25})),
 consents:swapInput.consents.map(row=>({...row,partyId:swapInput.partyId,proposalId:'QA_SWAP_1'})),
};
const permanentResult=reviewPartyCharacterSwapV103(permanent,true);
assert.equal(permanentResult.partyId,permanent.partyId);
assert.deepEqual(permanentResult.roster.map(row=>row.characterId),['A_damage','B_tank','C_damage','D_support']);
assert.ok(permanentResult.roster.every(row=>row.combatLevel===25));
assert.equal(permanentResult.canPersist,false);
denied(()=>reviewPartyCharacterSwapV103({...permanent,proposed:[alternateA,...currentRoster.slice(1)],
 consents:permanent.consents.slice(0,1)},true),'coordinated_swap_required');
denied(()=>reviewPartyCharacterSwapV103({...permanent,consents:permanent.consents.map(row=>({...row,proposalId:'OTHER'}))},true),'invalid_consent');
denied(()=>reviewPartyCharacterSwapV103({...permanent,ownedCharacters:permanent.ownedCharacters.map(row=>
 row.characterId==='A_damage'?{...row,combatLevel:9}:row)},true),'character_minimum_level_not_met');
denied(()=>reviewPartyCharacterSwapV103({...permanent,ownedCharacters:[...permanent.ownedCharacters,
 {accountId:'A',characterId:'A_second_tank',classId:'BASTION',combatLevel:25}]},true),'multiple_characters_same_role');
const partialPermanent=reviewPartyCharacterSwapV103({...permanent,current:currentRoster.slice(0,2),
 proposed:[alternateB,alternateA]},true);
assert.equal(partialPermanent.roster.length,2,'permanent partial party retains existing role slots');
const third:{accountId:string;characterId:string;classId:'STONECALLER';combatLevel:number}={
 accountId:'B',characterId:'B_support',classId:'STONECALLER',combatLevel:25};
const fourth:{accountId:string;characterId:string;classId:'DREADGUARD';combatLevel:number}={
 accountId:'D',characterId:'D_tank',classId:'DREADGUARD',combatLevel:25};
const rotation=reviewPartyCharacterSwapV103({...permanent,proposed:[alternateA,third,currentRoster[2]!,fourth],
 ownedCharacters:[...permanent.ownedCharacters,third,fourth],
 consents:[{accountId:'A',characterId:'A_damage',rosterRevision:7},
 {accountId:'B',characterId:'B_support',rosterRevision:7},
 {accountId:'D',characterId:'D_tank',rosterRevision:7}].map(row=>({...row,partyId:permanent.partyId,proposalId:permanent.proposalId}))},true);
assert.equal(rotation.changedAccounts.length,3,'consented three-way rotation');
denied(()=>reviewPartyCharacterSwapV103({...permanent,proposed:[alternateA,third,...currentRoster.slice(2)],
 ownedCharacters:[...permanent.ownedCharacters,third],
 consents:permanent.consents.map(row=>row.accountId==='B'?{...row,characterId:third.characterId}:row)},true),'party_role_distribution_changed');
console.log('PARTY_PERMANENT_ROLE_SWAP_REVIEW_OK: paired/three-way consent, stable role counts, owned hero and minimum level');
const chatProposal:PartySwapChatProposalV104={
 proposalId:'QA_SWAP_1',partyId:'QA_PARTY_SWAP',messageId:'QA_SYSTEM_MSG',
 rosterRevision:7,createdAtMs:1000,state:'pending',
 members:[
  {accountId:'A',fromRole:'tank',toRole:'damage',fromCharacterId:'A_tank',toCharacterId:'A_damage',accepted:true},
  {accountId:'B',fromRole:'damage',toRole:'tank',fromCharacterId:'B_damage',toCharacterId:'B_tank',accepted:false},
 ],
};
const chatInput={
 proposal:chatProposal,message:{id:'QA_SYSTEM_MSG',partyId:'QA_PARTY_SWAP',accountId:null,isSystem:true},
 viewerAccountId:'B',activePartyId:'QA_PARTY_SWAP',activeAccountIds:['A','B','C','D'],
 rosterRevision:7,serverNowMs:300999,
};
const chatCard=projectPartySwapChatV104(chatInput,true);
assert.equal(chatCard.status,'pending');
assert.equal(chatCard.showAccept,true);
assert.equal(chatCard.showDecline,true);
assert.equal(chatCard.acceptedCount,1);
assert.equal(chatCard.canExecute,false);
for(const viewerAccountId of ['A','C','D'])
 assert.equal(projectPartySwapChatV104({...chatInput,viewerAccountId},true).showAccept,false);
const expiredChat=projectPartySwapChatV104({...chatInput,serverNowMs:301000},true);
assert.equal(expiredChat.status,'expired');
assert.equal(expiredChat.showAccept,false);
assert.equal(projectPartySwapChatV104({...chatInput,rosterRevision:8},true).status,'stale');
assert.equal(projectPartySwapChatV104({...chatInput,viewerAccountId:'A',activeAccountIds:['A','C','D']},true).status,'stale');
for(const state of ['declined','cancelled','expired'] as const)
 assert.equal(projectPartySwapChatV104({...chatInput,proposal:{...chatProposal,state}},true).showAccept,false);
const completedChat=projectPartySwapChatV104({...chatInput,rosterRevision:9,serverNowMs:400000,
 proposal:{...chatProposal,state:'completed',committedRevision:8,members:chatProposal.members.map(m=>({...m,accepted:true}))}},true);
assert.equal(completedChat.status,'completed');
assert.equal(completedChat.showAccept,false);
denied(()=>projectPartySwapChatV104({...chatInput,proposal:{...chatProposal,state:'completed',committedRevision:8}},true),'missing_completion_evidence');
denied(()=>projectPartySwapChatV104({...chatInput,message:{...chatInput.message,accountId:'B',isSystem:false}},true),'chat_scope_mismatch');
denied(()=>projectPartySwapChatV104({...chatInput,message:{...chatInput.message,id:'FORGED'}},true),'chat_scope_mismatch');
denied(()=>projectPartySwapChatV104({...chatInput,viewerAccountId:'OUTSIDER'},true),'chat_scope_mismatch');
denied(()=>projectPartySwapChatV104({...chatInput,activePartyId:'OTHER_PARTY'},true),'chat_scope_mismatch');
denied(()=>projectPartySwapChatV104(chatInput),'unreleased');
console.log('PARTY_ROLE_SWAP_CHAT_V104_REVIEW_OK');
const swapTransition={scope:chatInput,response:'accept' as const,current:currentRoster,
 ownedCharacters:permanent.ownedCharacters,minimumLevel:10,phase:'lobby' as const};
const finalSwap=planPartyRoleSwapResponseV107(swapTransition,true);
assert.equal(finalSwap.proposal.state,'completed');
assert.equal(finalSwap.proposedRevision,8);
assert.equal(finalSwap.refreshRoster,true);
assert.equal(finalSwap.canPersist,false);
assert.deepEqual(finalSwap.roster?.map(x=>x.characterId),['A_damage','B_tank','C_damage','D_support']);
assert.equal(currentRoster[0]!.characterId,'A_tank');
const initiallyUnaccepted={...chatProposal,members:chatProposal.members.map(m=>({...m,accepted:false}))};
const firstConsent=planPartyRoleSwapResponseV107({...swapTransition,scope:{...chatInput,proposal:initiallyUnaccepted,viewerAccountId:'A'}},true);
assert.equal(firstConsent.proposal.state,'pending');
assert.equal(firstConsent.roster,null);
assert.equal(firstConsent.proposedRevision,7);
assert.equal(firstConsent.refreshRoster,false);
const afterBoth=planPartyRoleSwapResponseV107({...swapTransition,scope:{...chatInput,proposal:firstConsent.proposal}},true);
assert.deepEqual(afterBoth.roster,finalSwap.roster);
const declined=planPartyRoleSwapResponseV107({...swapTransition,response:'decline'},true);
assert.equal(declined.proposal.state,'declined');
assert.equal(declined.roster,null);
denied(()=>planPartyRoleSwapResponseV107({...swapTransition,scope:{...chatInput,serverNowMs:301000}},true),'response_not_allowed');
denied(()=>planPartyRoleSwapResponseV107({...swapTransition,scope:{...chatInput,viewerAccountId:'C'}},true),'response_not_allowed');
denied(()=>planPartyRoleSwapResponseV107({...swapTransition,phase:'committed_run'},true),'roster_locked');
denied(()=>planPartyRoleSwapResponseV107({...swapTransition,ownedCharacters:permanent.ownedCharacters.filter(x=>x.characterId!=='B_tank')},true),'character_mismatch');
denied(()=>planPartyRoleSwapResponseV107({...swapTransition,minimumLevel:26},true),'character_minimum_level_not_met');
denied(()=>planPartyRoleSwapResponseV107(swapTransition),'unreleased');
console.log('PARTY_ROLE_SWAP_TRANSITION_V107_REVIEW_OK');

const workflowBase={partyId:'QA_PARTY_SWAP',messageId:'QA_SYSTEM_MSG',sourceId:'QA_SOURCE',
 createdAtMs:1000,expiresAtMs:301000,rosterRevision:7,sourceRevision:2,state:'pending' as const,
 eligibleAccountIds:['A','B','C','D']};
const cardScope={...chatInput,leaderAccountId:'A',currentSourceRevision:2};
const options=[{id:'hunt',labelKey:'contract_hunt'},{id:'gather',labelKey:'contract_gather'}];
for(const kind of ['contract_vote','event_vote'] as const){
 const vote:VoteCardV105={...workflowBase,kind,options,ballots:[{accountId:'A',optionId:'hunt'}]};
 const open=projectPartyChatCardV105({...cardScope,card:vote},true);
 assert.equal(open.kind,kind);
 assert.deepEqual(open.actions,['vote']);
 assert.equal(open.canExecute,false);
 assert.equal(open.canGrantRewards,false);
 if(open.kind!=='contract_vote'&&open.kind!=='event_vote')throw Error('wrong vote card');
 assert.equal(open.options[0]!.votes,1);
 assert.equal(open.respondedCount,1);
 assert.deepEqual(projectPartyChatCardV105({...cardScope,card:vote,viewerAccountId:'A'},true).actions,[]);
 assert.deepEqual(projectPartyChatCardV105({...cardScope,card:vote,serverNowMs:301000},true).actions,[]);
 assert.deepEqual(projectPartyChatCardV105({...cardScope,card:vote,currentSourceRevision:3},true).actions,[]);
 assert.deepEqual(projectPartyChatCardV105({...cardScope,card:vote,rosterRevision:8},true).actions,[]);
 assert.deepEqual(projectPartyChatCardV105({...cardScope,card:{...vote,state:'completed',selectedOptionId:'hunt'}},true).actions,[]);
 denied(()=>projectPartyChatCardV105({...cardScope,card:{...vote,ballots:[...vote.ballots,...vote.ballots]}},true),'invalid_ballot');
 denied(()=>projectPartyChatCardV105({...cardScope,card:{...vote,ballots:[{accountId:'OUTSIDER',optionId:'hunt'}]}},true),'invalid_ballot');
 denied(()=>projectPartyChatCardV105({...cardScope,card:{...vote,ballots:[{accountId:'A',optionId:'FORGED'}]}},true),'invalid_ballot');
 denied(()=>projectPartyChatCardV105({...cardScope,card:{...vote,state:'completed',selectedOptionId:'FORGED'}},true),'invalid_vote_result');
}
const groupReady:ReadyCardV105={...workflowBase,kind:'group_readiness',responses:[
 {accountId:'A',ready:true},{accountId:'C',ready:false}]};
const readyCard=projectPartyChatCardV105({...cardScope,card:groupReady},true);
assert.equal(readyCard.kind,'group_readiness');
if(readyCard.kind!=='group_readiness')throw Error('wrong readiness card');
assert.deepEqual(readyCard.actions,['ready','not_ready']);
assert.equal(readyCard.readyCount,1);
assert.equal(readyCard.members.find(m=>m.accountId==='C')?.ready,false);
assert.equal(readyCard.canLaunchCombat,false);
assert.deepEqual(projectPartyChatCardV105({...cardScope,card:groupReady,viewerAccountId:'C'},true).actions,[]);
denied(()=>projectPartyChatCardV105({...cardScope,card:{...groupReady,responses:[...groupReady.responses,...groupReady.responses]}},true),'invalid_readiness');
const recruit:RecruitmentCardV105={...workflowBase,kind:'recruitment_request',eligibleAccountIds:['A'],applicantAccountId:'APPLICANT'};
const leaderCard=projectPartyChatCardV105({...cardScope,viewerAccountId:'A',card:recruit},true);
assert.deepEqual(leaderCard.actions,['accept','decline']);
const memberCard=projectPartyChatCardV105({...cardScope,card:recruit},true);
if(memberCard.kind!=='recruitment_request')throw Error('wrong recruitment card');
assert.equal(memberCard.applicantAccountId,null);
assert.deepEqual(memberCard.actions,[]);
assert.deepEqual(projectPartyChatCardV105({...cardScope,card:recruit,viewerAccountId:'A',rosterRevision:8},true).actions,[]);
denied(()=>projectPartyChatCardV105({...cardScope,card:recruit,leaderAccountId:'B'},true),'invalid_recruitment');
const achievement:AchievementCardV105={partyId:workflowBase.partyId,messageId:workflowBase.messageId,
 sourceId:'QA_CONTRACT',createdAtMs:1000,kind:'shared_achievement',achievementKind:'contract_completed',
 milestoneId:'tier_1',verifiedReceiptId:'QA_RECEIPT'};
const announcement=projectPartyChatCardV105({...cardScope,card:achievement},true);
if(announcement.kind!=='shared_achievement')throw Error('wrong achievement card');
assert.deepEqual(announcement.actions,[]);
assert.equal(announcement.canGrantRewards,false);
const duplicate=projectPartyChatCardV105({...cardScope,card:{...achievement,verifiedReceiptId:'RETRY_RECEIPT'}},true);
if(duplicate.kind!=='shared_achievement')throw Error('wrong achievement retry card');
assert.equal(duplicate.deduplicationKey,announcement.deduplicationKey);
denied(()=>projectPartyChatCardV105({...cardScope,card:achievement,message:{...cardScope.message,isSystem:false,accountId:'A'}},true),'chat_scope_mismatch');
denied(()=>projectPartyChatCardV105({...cardScope,card:achievement,viewerAccountId:'OUTSIDER'},true),'chat_scope_mismatch');
denied(()=>projectPartyChatCardV105({...cardScope,card:achievement}), 'unreleased');
console.log('PARTY_CHAT_ACTION_CARDS_V105_REVIEW_OK');
async function testPartyChatTransactionsV106(){
 const vote:VoteCardV105={...workflowBase,kind:'contract_vote',options,ballots:[]};
 const scope:PartyChatWorkflowV106={...cardScope,kind:'contract_vote',card:vote};
 let workflow=structuredClone(scope) as PartyChatWorkflowV106;
 let receipts=new Map<string,PartyChatReceiptV106>(),effects=new Map<string,PartyChatEffectV106>();
 let dispatches=0,tail:Promise<unknown>=Promise.resolve(),fault:'none'|'effect'|'receipt'='none';
 const store:PartyChatStoreV106={
  transact:<T>(_scope:{partyId:string;requestKey:string},fn:(tx:PartyChatTransactionV106)=>Promise<T>)=>{
   const run=tail.then(async()=>{
    const savedReceipts=structuredClone(receipts),savedEffects=structuredClone(effects),savedWorkflow=structuredClone(workflow);
    const tx:PartyChatTransactionV106={
     readReceipt:async key=>fault==='receipt'?null:receipts.get(key)??null,
     loadWorkflow:async()=>structuredClone(workflow),
     dispatch:async input=>{
      dispatches++;
      const effect:PartyChatEffectV106={sourceId:input.request.sourceId,actorAccountId:input.actorAccountId,
       requestDigest:enemyV2SnapshotDigest({actor:input.actorAccountId,request:input.request}),
       status:'response_recorded',effectId:'QA_EFFECT_'+dispatches};
      if(workflow.kind!=='contract_vote'||workflow.card.kind!=='contract_vote')throw Error('wrong fixture workflow');
      workflow={...workflow,card:{...workflow.card,ballots:[...workflow.card.ballots,
       {accountId:input.actorAccountId,optionId:input.request.optionId!}]}};
      effects.set(effect.effectId,effect);
      return effect;
     },
     readEffect:async key=>fault==='effect'?null:effects.get(key)??null,
     insertReceipt:async receipt=>{receipts.set(receipt.key,structuredClone(receipt));},
    };
    try{return await fn(tx);}catch(e){receipts=savedReceipts;effects=savedEffects;workflow=savedWorkflow;throw e;}
   });
   tail=run.catch(()=>undefined);return run;
  },
 };
 const request:PartyChatRequestV106={requestId:'QA_REQUEST',partyId:workflowBase.partyId,
  sourceId:workflowBase.sourceId,messageId:workflowBase.messageId,
  rosterRevision:7,sourceRevision:2,kind:'contract_vote',action:'vote',optionId:'hunt'};
 const execute=(req:PartyChatRequestV106=request,actorAccountId='B')=>
  reviewPartyChatActionTransactionV106({actorAccountId,request:req,store},true);
 for(const mode of ['effect','receipt'] as const){
  fault=mode;
  await assert.rejects(execute(),mode==='effect'?/missing_effect_readback/:/missing_receipt_readback/);
  assert.equal(receipts.size,0);assert.equal(effects.size,0);
  assert.deepEqual(workflow,scope,'both owner action and receipt roll back');
 }
 fault='none';
 await assert.rejects(execute({...request,optionId:'FORGED'}),/invalid_option/);
 await assert.rejects(execute({...request,rosterRevision:6}),/stale_scope/);
 await assert.rejects(execute(request,'OUTSIDER'),/chat_scope_mismatch/);
 const callsBefore=dispatches;
 const results=await Promise.all([execute(),execute()]);
 assert.equal(results.filter(x=>x.newlyRecorded).length,1);
 assert.deepEqual(results[0]!.receipt,results[1]!.receipt);
 assert.equal(dispatches,callsBefore+1);
 assert.equal(receipts.size,1);assert.equal(effects.size,1);
 await assert.rejects(execute({...request,optionId:'gather'}),/conflicting_replay/);
 await assert.rejects(execute({...request,requestId:'ANOTHER_REQUEST'}),/action_not_allowed/);
 workflow={...workflow,serverNowMs:301000,rosterRevision:8};
 const recovered=await execute();
 assert.equal(recovered.newlyRecorded,false,'lost acknowledgement replays after deadline/revision');
 assert.equal(dispatches,callsBefore+1);
 effects.clear();
 await assert.rejects(execute(),/missing_replay_evidence/);
 await assert.rejects(reviewPartyChatActionTransactionV106({actorAccountId:'B',request,store}),/unreleased/);
 console.log('PARTY_CHAT_ACTION_TRANSACTION_V106_REVIEW_OK');
}
void testPartyChatTransactionsV106().catch(error=>{console.error(error);process.exitCode=1;});



console.log('PARTY_ROSTER_SWAP_V103_REVIEW_OK: account-stable role exchange and frozen encounter isolation');
assert.equal(PARTY_EVENT_EQ2_TRAIT_V92_RELEASED,false);
let scenarios=0,traitEvents=0,baselineEvents=0;
let totalReflect=0,phases70=0,phases35=0,losses=0,timeouts=0;
const rows:Record<string,{
 scenarios:number;victories:number;wipes:number;timeouts:number;
 durationMs:number;damageTaken:number;traitEvents:number;
}>={};
for(const family of families)for(const difficulty of difficulties)
 for(const partySize of [2,3,4])for(const tier of [1,4,8,12]){
  const pair=fixture(family,difficulty,partySize,tier);
  const before=enemyV2SnapshotDigest({witness:pair.witness,
   combat:pair.combat,sources:pair.sources});
  const result=simulateFrozenPartyEventEquipmentV92(pair,true);
  const replay=simulateFrozenPartyEventEquipmentV92(pair,true);
  assert.deepEqual(result,replay,'full V2 equipment trait replay: '+pair.witness.seed);
  assert.equal(enemyV2SnapshotDigest({witness:pair.witness,
   combat:pair.combat,sources:pair.sources}),before,'never mutate frozen input');
  assert.equal(result.durationMs<=PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,true);
  assert.ok(result.events.some(e=>e.type==='combat_start'));
  assert.equal(result.enemies[0].definition.name,names[family]);
  assert.ok(result.events.every(e=>Number.isFinite(e.atMs)&&
   (e.amount===undefined||Number.isFinite(e.amount))));
  assert.ok(result.players.every(p=>
   Number.isFinite(p.damageDone)&&Number.isFinite(p.damageTaken)));
  const hits=result.enemies[0].triggeredPhases;
  assert.ok(!hits.includes(result.enemies[0].definition.phases![1].id)||
   hits.includes(result.enemies[0].definition.phases![0].id));
  if(hits.includes(result.enemies[0].definition.phases![0].id))phases70++;
  if(hits.includes(result.enemies[0].definition.phases![1].id))phases35++;
  const triggers=result.events.filter(e=>e.type==='equipment_trait_trigger');
  traitEvents+=triggers.length;
  const reflect=triggers.filter(e=>e.abilityId==='V2_EQUIPMENT_TRAIT:reflect_damage_affix'||
   e.abilityId==='V2_EQUIPMENT_TRAIT:thornbound_riposte');
  totalReflect+=reflect.length;
  // Shared 0.1% boss max HP per 5 s across defenders, not per defender.
  for(const event of reflect){
   const last5s=reflect.filter(e=>e.atMs<=event.atMs&&
    event.atMs-e.atMs<5000);
   const amount=last5s.reduce((sum,e)=>sum+(e.amount??0),0);
   assert.ok(amount<=result.enemies[0].definition.stats.maxHp*.001+.001,
    'shared boss reflect budget cannot be bypassed by a party');
  }
  const row=rows[family+':'+difficulty]??={
   scenarios:0,victories:0,wipes:0,timeouts:0,
   durationMs:0,damageTaken:0,traitEvents:0,
  };
  row.scenarios++;row.durationMs+=result.durationMs;row.traitEvents+=triggers.length;
  row.damageTaken+=result.players.reduce((n,p)=>n+p.damageTaken,0);
  if(result.reason==='victory')row.victories++;
  if(result.reason==='wipe'){row.wipes++;losses++;}
  if(result.reason==='timeout'){row.timeouts++;timeouts++;}
  rows[family+':'+difficulty]=row;
  scenarios++;
 }
assert.equal(scenarios,144);
assert.equal(Object.keys(rows).length,12);
assert.ok(phases35<=phases70);
assert.ok(traitEvents>0,'must execute at least one REAL equipment trait hook');
// A matched optional no-trait equipment configuration retains canonical party
// boss mechanics but cannot fabricate a trait event.
for(const family of families){
 const clean=fixture(family,'standard',4,1,false);
 const result=simulateFrozenPartyEventEquipmentV92(clean,true);
 assert.equal(result.events.filter(e=>e.type==='equipment_trait_trigger').length,0);
 baselineEvents+=result.events.length;
}
// Every caller must be refused unless independently authenticated, versioned
// and bound to the frozen account/character/item snapshot.
const original=fixture('broken_caravan','standard',4,1);
for(const extension of [
 {synchronization:{mode:'party_event'}},
 {aiPolicy:'tactical'},
 {initialPlayerState:{}},
 {enemyDamageProfile:'qmode-v1'},
 {futureEngineAuthority:{enabled:true}},
]){
 let calls=0;
 denied(()=>simulateFrozenPartyEventEquipmentV92({
  ...original,combat:{...original.combat,...extension} as CombatInput,
  ports:{verifyPersisted:()=>{calls++;return true;}},
 },true),'party_equipment_snapshot_mismatch');
 assert.equal(calls,0,'unsupported engine fields must fail before verifier');
}

denied(()=>simulateFrozenPartyEventEquipmentV92(original),
 'party_event_v92_unreleased');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,ports:{verifyPersisted:()=>false}},true),
 'persisted_ledger_not_verified');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,seed:'FORGED'}},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  characterId:'QA_CHAR_FORGED'},...original.sources.slice(1)]},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  reflectDamagePct:80},...original.sources.slice(1)]},true),
 'combat_v2_equipment_trait_invalid_persisted_source');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  traits:[{instanceId:'QA_COPY_0',traitId:'thornbound_riposte'},
   {instanceId:'QA_COPY_0',traitId:'sword_dance'}]},
  ...original.sources.slice(1)]},true),
 'combat_v2_equipment_trait_trait_not_owned_selected_or_supported');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,witness:{...original.witness,mode:'legacy' as 'new-run-only'}},true),
 'invalid_frozen_new_run_witness');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,
  initialPlayerState:{QA_V92_ACTOR_0:{hp:1,downed:false,
   cooldownRemainingMs:{},basicAttackRemainingMs:0}}}},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,
  enemies:[{...original.combat.enemies[0],name:'FAKE BOSS'}]}},true),
 'untrusted_or_unbounded_v90_boss');
// V94: off-budget attacks were already denied; these within-budget edits
// used to pass. Every bit of the authored V90 kit must now be canonical.
// A copied physical item identity across actors is invalid even with a permissive
// QA persistence callback. A distinct item template is not the custody key.
for(const size of [2,3,4]){
 const scope=fixture('broken_caravan','standard',size,1);
 let verifierCalls=0;
 const reused=scope.sources.map((row,i)=>i===1?{
  ...row,ownedEquippedInstanceIds:[...row.ownedEquippedInstanceIds,scope.sources[0]!.ownedEquippedInstanceIds[0]!],
 }:row);
 denied(()=>simulateFrozenPartyEventEquipmentV92({
  ...scope,sources:reused,ports:{verifyPersisted:()=>{verifierCalls++;return true;}},
 },true),'duplicate_party_equipment_copy');
 assert.equal(verifierCalls,0,'duplicate physical copy rejected before persistence');
}
const canonicalBoss=original.combat.enemies[0];
for(const changed of [
 {...canonicalBoss,stats:{...canonicalBoss.stats,accuracy:751}},
 {...canonicalBoss,abilities:[
  {...canonicalBoss.abilities[0],cooldownMs:14250},
  ...canonicalBoss.abilities.slice(1)]},
 {...canonicalBoss,phases:[
  {...canonicalBoss.phases![0],effects:[{kind:'shield' as const,flat:1}]},
  ...canonicalBoss.phases!.slice(1)]},
 {...canonicalBoss,tags:[...(canonicalBoss.tags??[]),'extra:untrusted']},
])denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,enemies:[changed]},
},true),'noncanonical_v90_boss_kit');
// V95 is strictly a QA evidence envelope — no minted certificates, claims,
// Sigils, XP, Gold, items or Inbox rows. Replay must be stable.
assert.equal(PARTY_EVENT_RESULT_AUDIT_V95_RELEASED,false);
const reviewResult=simulateFrozenPartyEventEquipmentV92(original,true);
const reviewInput={...original,result:reviewResult};
const review=reviewPartyEventCombatResultV95(reviewInput,true);
assert.deepEqual(review,reviewPartyEventCombatResultV95(reviewInput,true));
assert.equal(review.independentlyCertified,false);
assert.equal(review.claimable,false);
assert.equal(review.rewardGranted,false);
assert.equal(review.contributions.length,4);
assert.equal(review.reason,reviewResult.reason);
assert.equal(review.reviewDigest.length,64);
const tamperedOutcome={...reviewResult,
 players:[{...reviewResult.players[0],damageDone:
  reviewResult.players[0].damageDone+1},...reviewResult.players.slice(1)]};
const changedReview=reviewPartyEventCombatResultV95({
 ...reviewInput,result:tamperedOutcome,
},true);
assert.notEqual(changedReview.reviewDigest,review.reviewDigest);
denied(()=>reviewPartyEventCombatResultV95({
 ...reviewInput,sources:[{...original.sources[0],
  characterId:'FOREIGN_CHARACTER'},...original.sources.slice(1)],
},true),'source_witness_mismatch');
denied(()=>reviewPartyEventCombatResultV95({
 ...reviewInput,result:{...reviewResult,durationMs:90001},
},true),'invalid_result_or_timeline');
denied(()=>reviewPartyEventCombatResultV95(reviewInput),
 'party_event_v95_unreleased');
// V96 must deterministically replay the exact frozen source before audit.
const replayedReview=reviewFrozenPartyEventReplayV96(original,true);
assert.equal(replayedReview.identicalReplay,true);
assert.equal(replayedReview.replayCount,2);
assert.equal(replayedReview.independentlyCertified,false);
assert.equal(replayedReview.claimable,false);
assert.equal(replayedReview.rewardGranted,false);
assert.equal(replayedReview.audit.reviewDigest,review.reviewDigest);
let verifierCalls=0;
denied(()=>reviewFrozenPartyEventReplayV96({
 ...original,ports:{verifyPersisted:()=>verifierCalls++===0},
},true),'persisted_ledger_not_verified');
denied(()=>reviewFrozenPartyEventReplayV96(original),
 'party_event_v96_unreleased');
const env=process.env.NODE_ENV;
try{
 process.env.NODE_ENV='production';
 denied(()=>simulateFrozenPartyEventEquipmentV92(original,true),
  'party_event_v92_unreleased');
}finally{process.env.NODE_ENV=env}
// V97 fake-only serializable transaction. This does not certify actual
// PostgreSQL SERIALIZABLE behavior, row locks, auth, or reward settlements.
async function testNonpayingLedgerV97():Promise<void>{
 const saved=new Map<string,NonpayingReviewReceiptV97>();
 const locks=new Map<string,Promise<void>>();
 let failInsert=false;
 let readbackFault:'none'|'missing'|'incorrect'='none';
 const store:ReviewLedgerStoreV97={
  async transact<T>(key:string,fn:(tx:{
   read:(key:string)=>Promise<NonpayingReviewReceiptV97|null>;
   insert:(r:NonpayingReviewReceiptV97)=>Promise<void>;
  })=>Promise<T>):Promise<T>{
   const previous=locks.get(key)??Promise.resolve();
   let unlock:()=>void=()=>{};
   const released=new Promise<void>(resolve=>{unlock=resolve;});
   locks.set(key,previous.then(()=>released));
   await previous;
   const pending=new Map(saved);
   try{
    let inserted=false;
    const value=await fn({
     read:async k=>{
      const row=pending.get(k)??null;
      if(inserted&&readbackFault==='missing')return null;
      if(inserted&&readbackFault==='incorrect'&&row)
       return {...row,eventId:'QA_CORRUPTED_READBACK'};
      return row;
     },
     insert:async receipt=>{
      pending.set(receipt.key,receipt);
      inserted=true;
      if(failInsert){failInsert=false;throw Error('qa_insert_fault');}
     },
    });
    saved.clear();
    for(const [k,v] of pending)saved.set(k,v);
    return value;
   }finally{unlock();}
  },
 };
 assert.equal(saved.size,0);
 failInsert=true;
 await assert.rejects(recordNonpayingPartyReviewV97({
  replay:replayedReview,store,
 },true),/qa_insert_fault/);
 assert.equal(saved.size,0,'failed insert must roll back in QA store');
 for(const fault of ['missing','incorrect'] as const){
  readbackFault=fault;
  await assert.rejects(recordNonpayingPartyReviewV97({
   replay:replayedReview,store,
  },true),new RegExp('party_event_v97_'+fault+'_readback'));
  assert.equal(saved.size,0,'readback rejection must roll back in QA store: '+fault);
 }
 readbackFault='none';
 const [winner,replayer]=await Promise.all([
  recordNonpayingPartyReviewV97({replay:replayedReview,store},true),
  recordNonpayingPartyReviewV97({replay:replayedReview,store},true),
 ]);
 assert.equal(Number(winner.newlyRecorded)+Number(replayer.newlyRecorded),1);
 assert.deepEqual(winner.receipt,replayer.receipt);
 assert.equal(saved.size,1);
 assert.equal(winner.receipt.rewardGranted,false);
 assert.equal(winner.receipt.claimable,false);
 const ackLostRetry=await recordNonpayingPartyReviewV97({
  replay:replayedReview,store,
 },true);
 assert.equal(ackLostRetry.newlyRecorded,false);
 assert.deepEqual(ackLostRetry.receipt,winner.receipt);
 const forgedReplay={...replayedReview,audit:{
  ...replayedReview.audit,reviewDigest:'f'.repeat(64),
 }};
 await assert.rejects(recordNonpayingPartyReviewV97({
  replay:forgedReplay,store,
 },true),/conflicting_replay/);
 const reusedEncounter={...replayedReview,audit:{
  ...replayedReview.audit,eventId:'QA_WRONG_EVENT',
 }};
 await assert.rejects(recordNonpayingPartyReviewV97({
  replay:reusedEncounter,store,
 },true),/conflicting_replay/);
 await assert.rejects(recordNonpayingPartyReviewV97({
  replay:replayedReview,store,
 }),/party_event_v97_unreleased/);
 assert.equal(saved.size,1);
 console.log('PARTY_EVENT_V96_V97_NONPAYING_REPLAY_LEDGER_PASS');
}
void testNonpayingLedgerV97().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
console.log('PARTY_EVENT_V92_EQ2_TRAIT_MATRIX='+JSON.stringify({
 releaseReady:false,qaOnly:true,scenarios,traitEvents,totalReflect,
 phases70,phases35,losses,timeouts,baselineEvents,
 sample:'level-25 synthetic actor/gear fixtures, real V2 trait engine, 90s',
 rows,
}));
