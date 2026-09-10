import { deterministicInt } from '../expeditions/rng';
import { COOP_ROGUELITE_CONFIG } from './config';

export interface LiveDecisionRecord {
 id:string;revision:number;optionIds:string[];eligibleAccountIds:string[];openedAtMs:number;closesAtMs:number;
 balancedFallbackOptionId:string;tieKey:string;status:'open'|'resolved';votes:Record<string,string>;
 selectedOptionId?:string;resolutionReason?:'unanimous'|'plurality'|'tie'|'no_votes';resolutionCount?:number;
 receipts:Record<string,{payload:string;optionId:string}>;
}
export class MemoryDecisionRepository{private rows=new Map<string,LiveDecisionRecord>();save(row:LiveDecisionRecord){this.rows.set(row.id,structuredClone(row));}get(id:string){const row=this.rows.get(id);return row?structuredClone(row):undefined;}}
export class LiveDecisionService{
 constructor(private repository:MemoryDecisionRepository,private serverSecret:string){}
 open(input:{id:string;revision:number;optionIds:string[];eligibleAccountIds:string[];openedAtMs:number;balancedFallbackOptionId:string;tieKey:string}):LiveDecisionRecord{
  if(new Set(input.optionIds).size<3||input.optionIds.length<3)throw new Error('insufficient_decision_options');if(new Set(input.eligibleAccountIds).size!==4)throw new Error('invalid_decision_roster');if(!input.optionIds.includes(input.balancedFallbackOptionId))throw new Error('invalid_fallback');
  const row:LiveDecisionRecord={...structuredClone(input),closesAtMs:input.openedAtMs+COOP_ROGUELITE_CONFIG.liveVoteMs,status:'open',votes:{},receipts:{}};this.repository.save(row);return row;
 }
 vote(input:{decisionId:string;revision:number;accountId:string;optionId:string;requestId:string;nowMs:number}):LiveDecisionRecord{
  const row=this.required(input.decisionId);const receipt=row.receipts[`${input.accountId}:${input.requestId}`];const payload=`${input.revision}:${input.optionId}`;
  if(receipt){if(receipt.payload!==payload)throw new Error('idempotency_conflict');return row;}
  if(row.status!=='open'||input.nowMs>=row.closesAtMs)throw new Error('vote_closed');if(input.revision!==row.revision)throw new Error('stale_decision');if(!row.eligibleAccountIds.includes(input.accountId))throw new Error('not_participant');if(!row.optionIds.includes(input.optionId))throw new Error('invalid_option');
  row.votes[input.accountId]=input.optionId;row.receipts[`${input.accountId}:${input.requestId}`]={payload,optionId:input.optionId};
  const votes=Object.values(row.votes);if(votes.length===4&&new Set(votes).size===1)this.commit(row,votes[0],'unanimous',4);else this.repository.save(row);return structuredClone(row);
 }
 resolveDeadline(decisionId:string,nowMs:number):LiveDecisionRecord{
  const row=this.required(decisionId);if(row.status==='resolved')return row;if(nowMs<row.closesAtMs)throw new Error('decision_deadline_not_reached');
  const counts=Object.fromEntries(row.optionIds.map(option=>[option,Object.values(row.votes).filter(vote=>vote===option).length]));const highest=Math.max(...Object.values(counts));
  if(highest===0){this.commit(row,row.balancedFallbackOptionId,'no_votes',0);return this.required(decisionId);}
  const tied=row.optionIds.filter(option=>counts[option]===highest).sort();
  const selected=tied.length===1?tied[0]:tied[deterministicInt(this.serverSecret,0,tied.length-1,'live-vote-v1',row.tieKey,row.id,row.revision)];this.commit(row,selected,tied.length===1?'plurality':'tie',highest);return this.required(decisionId);
 }
 private commit(row:LiveDecisionRecord,selected:string,reason:LiveDecisionRecord['resolutionReason'],count:number){if(row.status==='resolved')return;row.status='resolved';row.selectedOptionId=selected;row.resolutionReason=reason;row.resolutionCount=count;this.repository.save(row);}
 private required(id:string){const row=this.repository.get(id);if(!row)throw new Error('decision_not_found');return row;}
}
export function progressionAfterDecision(previousZeroInputDecisions:number,decision:LiveDecisionRecord):{zeroInputDecisions:number;pause:boolean}{const zero=decision.resolutionReason==='no_votes'?previousZeroInputDecisions+1:0;return{zeroInputDecisions:zero,pause:zero>=2};}
