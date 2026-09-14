import { processSocialContributionOutboxBatch, type ContributionOutboxRecord, type ContributionOutboxRepository } from '../contribution-outbox';
import type { SocialContributionRoutingResult } from '../social-contribution-router';

function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
class Repo implements ContributionOutboxRepository{
  records:ContributionOutboxRecord[]=[]; processed=0; retried=0; dead=0;
  async enqueue(){return 'inserted' as const;}
  async claimBatch(){return this.records;}
  async markProcessed(_id:string,_r:SocialContributionRoutingResult){this.processed++;}
  async markRetry(){this.retried++;}
  async markDeadLetter(){this.dead++;}
}
const baseEvent={sourceEventId:'s',accountId:'a',occurredAtMs:1,dateKey:'2026-09-13',profile:{id:'x',category:'combat' as const,expectedSecondsPerUnit:60,challenge:'routine' as const},units:1,activityKind:'combat' as const,contentId:'x',partyIdAtSettlement:'p'};
(async()=>{
  const repo=new Repo();
  repo.records=[{id:'1',sourceEventId:'s',envelope:{event:baseEvent,targets:{partyEventInstanceIds:['e']}},attempts:0,status:'pending'}];
  const ok=await processSocialContributionOutboxBatch(repo,{recordPartyEvent:async()=>({ok:true,duplicate:false,rawPoints:1,creditedPoints:1,partyCreditedPoints:1,partyEvaluation:{partyScore:1,combatPoints:1,skillingPoints:0,meaningfulContributors:[],rankedEligible:false,rankedEligibilityMissing:['party_points'],reachedPartyMilestones:[]}})});
  assert(ok.processed===1&&repo.processed===1,'successful outbox row should process');
  const retryRepo=new Repo();
  retryRepo.records=[{id:'2',sourceEventId:'s2',envelope:{event:{...baseEvent,sourceEventId:'s2'},targets:{partyEventInstanceIds:['e']}},attempts:0,status:'pending'}];
  const retried=await processSocialContributionOutboxBatch(retryRepo,{recordPartyEvent:async()=>{throw new Error('transient');}});
  assert(retried.retried===1&&retryRepo.retried===1,'transient failure should retry');
  console.log('outbox-v17 ok');
})().catch(e=>{throw e;});
