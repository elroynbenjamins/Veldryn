import { PARTY_EVENT_TEMPLATE_POOL } from '../event-definitions';
import { createScheduledPartyEvent } from '../scheduler';
import { finalizePartyEvent, type FinalizedRankSnapshot, type PartyEventFinalizationRepository } from '../party-event-finalization';
import { claimLiveOpsEventReward, type LiveOpsRankSnapshotForClaim, type LiveOpsRewardRepository } from '../reward-service';
import type { PartyEventBinding } from '../party-event-service';
import type { PartyEventMemberProgress, PartyEventPartyProgress } from '../party-events';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const definition = PARTY_EVENT_TEMPLATE_POOL[0];
const start = Date.parse('2026-09-10T00:00:00Z');
const scheduled = createScheduledPartyEvent({ instanceId:'e', definition, startsAtMs:start });
const finalNow = scheduled.endsAtMs + scheduled.settlementGraceMinutes*60_000 + 1;

class FinalRepo implements PartyEventFinalizationRepository {
  finalized=false; snapshots:FinalizedRankSnapshot[]=[];
  progress:PartyEventPartyProgress[]=[
    {partyId:'p1',score:7000,combatPoints:3500,skillingPoints:3500,lastScoreAtMs:100,members:[{accountId:'a1',partyId:'p1',points:4000,combatPoints:2000,skillingPoints:2000},{accountId:'a2',partyId:'p1',points:3000,combatPoints:1500,skillingPoints:1500}]},
    {partyId:'p2',score:6500,combatPoints:3400,skillingPoints:3100,lastScoreAtMs:90,members:[{accountId:'b1',partyId:'p2',points:4000,combatPoints:2100,skillingPoints:1900},{accountId:'b2',partyId:'p2',points:2500,combatPoints:1300,skillingPoints:1200}]},
  ];
  async withFinalizationLock<T>(_id:string,work:()=>Promise<T>){return work();}
  async getScheduledEvent(id:string){return id==='e'?scheduled:null;}
  async isFinalized(){return this.finalized;}
  async listPartyProgress(){return this.progress;}
  async replaceRankSnapshots(_id:string,s:readonly FinalizedRankSnapshot[]){this.snapshots=[...s];}
  async markFinalized(){this.finalized=true;}
}

class RewardRepo implements LiveOpsRewardRepository {
  claims=new Set<string>();
  binding:PartyEventBinding={accountId:'a1',partyId:'p1',lockedAtMs:1,pointsAtLock:250};
  member:PartyEventMemberProgress={accountId:'a1',partyId:'p1',points:4000,combatPoints:2000,skillingPoints:2000};
  rank:LiveOpsRankSnapshotForClaim={partyId:'p1',rewardBand:'top10'};
  finalized=true;
  async withRewardClaimLock<T>(_k:string,work:()=>Promise<T>){return work();}
  async getScheduledEvent(id:string){return id==='e'?scheduled:null;}
  async getPersonalPoints(){return 2600;}
  async getBinding(){return this.binding;}
  async getMemberProgress(){return this.member;}
  async getPartyScore(){return 7000;}
  async getFinalRank(){return this.rank;}
  async isFinalized(){return this.finalized;}
  async claimExists(k:string){return this.claims.has(k);}
  async grantRewardBundle(_a:string,b:string,k:string){return `tx:${b}:${k}`;}
  async recordClaim(input:{claimKey:string}){this.claims.add(input.claimKey);}
}

(async()=>{
  const finalRepo=new FinalRepo();
  const result=await finalizePartyEvent(finalRepo,'e',finalNow);
  assert(result.finalized && result.snapshots.length===2,'finalization should snapshot eligible parties');
  assert(result.snapshots[0].partyId==='p1' && result.snapshots[0].rank===1,'higher score should rank first');
  const rewardRepo=new RewardRepo();
  const personal=await claimLiveOpsEventReward(rewardRepo,{kind:'personal_milestone',eventInstanceId:'e',accountId:'a1',milestonePoints:2500});
  assert(personal.claimed,'reached personal milestone should claim');
  const party=await claimLiveOpsEventReward(rewardRepo,{kind:'party_milestone',eventInstanceId:'e',accountId:'a1',milestonePoints:6000});
  assert(party.claimed,'eligible bound member should claim reached party milestone');
  const ranking=await claimLiveOpsEventReward(rewardRepo,{kind:'ranking',eventInstanceId:'e',accountId:'a1'});
  assert(ranking.claimed && ranking.rewardBundleId==='party_event_rank_top10_v1','finalized top10 reward should claim');
  const duplicate=await claimLiveOpsEventReward(rewardRepo,{kind:'ranking',eventInstanceId:'e',accountId:'a1'});
  assert(!duplicate.claimed,'same rank reward claim should be idempotent');
  console.log('finalization-rewards-v17 ok');
})().catch((e)=>{throw e;});
