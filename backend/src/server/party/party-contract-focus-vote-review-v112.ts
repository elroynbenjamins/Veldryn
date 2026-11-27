/** Hidden contract focus vote adapter. Existing ensure_party_contracts_v16
 * assigns ALL active weekly definitions. Never remove/replace these contracts,
 * add a reward-bearing instance or change reward eligibility from a chat poll.
 * Server owns definition/instance snapshot, vote window and eventual result.
 */
import {projectPartyChatCardV105,type VoteCardV105} from './party-chat-action-cards-review-v105';
import {enemyV2SnapshotDigest as digest} from '../combat/v2/enemy-engine-authority';
export const PARTY_CONTRACT_FOCUS_V112_RELEASED=false;
const WEEK=604800000;
const id=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
interface WeeklyContractInstanceV112{
 readonly id:string;readonly partyId:string;readonly definitionId:string;readonly definitionVersion:number;
 readonly cadence:'weekly'|'mini_event';readonly seasonKey:string;
 readonly startsAtMs:number;readonly endsAtMs:number;readonly status:'active'|'completed'|'expired';
 readonly labelKey:string;readonly totalTargetPoints:number;
}
export interface ContractFocusOfferV112{
 readonly partyId:string;readonly sourceId:string;readonly messageId:string;
 readonly rosterRevision:number;readonly sourceRevision:number;
 readonly createdAtMs:number;readonly expiresAtMs:number;
 readonly weekStartsAtMs:number;readonly weekEndsAtMs:number;
 readonly eligibleAccountIds:readonly string[];
 readonly instanceIds:readonly string[];
 readonly ballots:VoteCardV105['ballots'];
}
function fail(s:string):never{throw Error('party_contract_focus_v112_'+s);}
export function buildContractFocusCardV112(input:{
 readonly offer:ContractFocusOfferV112;
 readonly instances:readonly WeeklyContractInstanceV112[];
},qaEnabled=false):VoteCardV105{
 if(!qaEnabled||PARTY_CONTRACT_FOCUS_V112_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 const {offer:o,instances}=input;
 if(!o||!id(o.partyId)||!id(o.sourceId)||!id(o.messageId)||
  !Number.isSafeInteger(o.weekStartsAtMs)||!Number.isSafeInteger(o.weekEndsAtMs)||
  o.weekEndsAtMs-o.weekStartsAtMs!==WEEK||
  !Number.isSafeInteger(o.createdAtMs)||!Number.isSafeInteger(o.expiresAtMs)||
  o.createdAtMs<o.weekStartsAtMs||o.expiresAtMs>o.weekEndsAtMs||o.expiresAtMs<=o.createdAtMs)
  fail('invalid_week_scope');
 const date=new Date(o.weekStartsAtMs);
 if(date.getUTCDay()!==1||date.getUTCHours()!==0||date.getUTCMinutes()!==0||
  date.getUTCSeconds()!==0||date.getUTCMilliseconds()!==0)fail('invalid_week_scope');
 const seasonKey=date.toISOString().slice(0,10);
 if(!Array.isArray(o.instanceIds)||o.instanceIds.length<2||o.instanceIds.length>5||
  !o.instanceIds.every(id)||new Set(o.instanceIds).size!==o.instanceIds.length||
  !Array.isArray(instances))fail('invalid_offer');
 const rows:readonly WeeklyContractInstanceV112[]=instances;
 const byId=new Map(rows.map(row=>[row.id,row]));
 if(byId.size!==rows.length)fail('duplicate_instance');
 const options=o.instanceIds.map(optionId=>{
  const row=byId.get(optionId);
  if(!row||row.partyId!==o.partyId||row.cadence!=='weekly'||row.status!=='active'||
   row.seasonKey!==seasonKey||row.startsAtMs!==o.weekStartsAtMs||row.endsAtMs!==o.weekEndsAtMs||
   !id(row.definitionId)||!id(row.labelKey)||!Number.isSafeInteger(row.definitionVersion)||row.definitionVersion<1||
   !Number.isSafeInteger(row.totalTargetPoints)||row.totalTargetPoints<1)
   throw Error('party_contract_focus_v112_instance_not_eligible');
  return Object.freeze({id:row.id,labelKey:row.labelKey});
 });
 if(new Set(o.instanceIds.map(key=>byId.get(key)!.definitionId)).size!==options.length)fail('duplicate_definition');
 return Object.freeze({kind:'contract_vote',partyId:o.partyId,sourceId:o.sourceId,messageId:o.messageId,
  createdAtMs:o.createdAtMs,expiresAtMs:o.expiresAtMs,rosterRevision:o.rosterRevision,
  sourceRevision:o.sourceRevision,state:'pending',eligibleAccountIds:Object.freeze([...o.eligibleAccountIds]),
  options:Object.freeze(options),ballots:Object.freeze(o.ballots.map(row=>Object.freeze({...row})))});
}
export function planContractFocusBallotV112(input:{
 readonly offer:ContractFocusOfferV112;
 readonly instances:readonly WeeklyContractInstanceV112[];
 readonly scope:Omit<Parameters<typeof projectPartyChatCardV105>[0],'card'>;
 readonly optionId:string;
},qaEnabled=false){
 if(!qaEnabled||process.env.NODE_ENV==='production')fail('unreleased');
 const card=buildContractFocusCardV112(input,true);
 const view=projectPartyChatCardV105({...input.scope,card},true);
 if(view.kind!=='contract_vote'||!view.actions.includes('vote'))throw Error('party_contract_focus_v112_vote_not_allowed');
 if(!view.options.some(row=>row.id===input.optionId))fail('invalid_option');
 const ballot=Object.freeze({accountId:input.scope.viewerAccountId,optionId:input.optionId});
 return Object.freeze({sourceId:card.sourceId,partyId:card.partyId,ballot,
  sourceDigest:digest(card),proposedBallots:Object.freeze([...card.ballots,ballot]),
  releaseEnabled:false as const,canPersist:false as const,canAssignContract:false as const,
  canChangeRewards:false as const,canResolveVote:false as const});
}
