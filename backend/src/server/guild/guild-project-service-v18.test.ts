import { strict as assert } from 'node:assert';
import type { SocialContributionEvent } from '../liveops/contribution';
import { createWeeklyGuildProjectInstanceReference, recordGuildProjectContribution, type GuildProjectContributionState, type GuildProjectRepository } from './guild-project-service';
import { GUILD_WEEKLY_PROJECT_POOL, type GuildProjectMemberProgress } from './guild-projects';

class Repo implements GuildProjectRepository {
  states=new Map<string,GuildProjectContributionState>(); receipts=new Set<string>(); bindings=new Map<string,string>(); claims=new Set<string>();
  async loadContributionStateForUpdate(id:string,accountId:string,_dateKey:string){const s=this.states.get(id);if(!s)return undefined;const row=s.memberProgress.find(x=>x.accountId===accountId);return {...s,accountProgress:row};}
  async getCycleBinding(cycleKey:string,accountId:string){const guildId=this.bindings.get(`${cycleKey}:${accountId}`);return guildId?{guildId}:undefined;}
  async bindCycle(cycleKey:string,accountId:string,guildId:string,_pointsAtBind:number){const k=`${cycleKey}:${accountId}`;const existing=this.bindings.get(k);if(existing)return {guildId:existing};this.bindings.set(k,guildId);return {guildId};}
  async hasContributionReceipt(projectInstanceId:string,accountId:string,sourceEventId:string){return this.receipts.has(`${projectInstanceId}:${accountId}:${sourceEventId}`);}
  async applyContribution(input:any){const s=this.states.get(input.projectInstanceId)!;this.receipts.add(`${input.projectInstanceId}:${input.accountId}:${input.sourceEventId}`);let row=s.memberProgress.find(x=>x.accountId===input.accountId);if(!row){row={accountId:input.accountId,rawPoints:0,completionPoints:0,combatPoints:0,skillingPoints:0};s.memberProgress.push(row);}row.rawPoints+=input.creditedPoints;row.completionPoints+=input.completionCreditedPoints;if(input.category==='combat')row.combatPoints+=input.completionCreditedPoints;else row.skillingPoints+=input.completionCreditedPoints;s.instance.completionPoints+=input.completionCreditedPoints;}
  async markCompleted(id:string,completedAtMs:number,_snapshot:unknown){const s=this.states.get(id)!;s.instance.status='completed';s.instance.completedAtMs=completedAtMs;}
  async loadMembershipSnapshot(){return {currentMember:true,wasMemberAtStart:true,projectStartedAtMs:0,projectCompletedAtMs:1};}
  async hasRewardClaim(id:string,accountId:string,rewardKey:string){return this.claims.has(`${id}:${accountId}:${rewardKey}`);}
  async recordRewardClaim(id:string,accountId:string,rewardKey:string){this.claims.add(`${id}:${accountId}:${rewardKey}`);}
}
function event(sourceEventId:string,accountId='account'):SocialContributionEvent{return {sourceEventId,accountId,occurredAtMs:Date.now(),dateKey:'2026-09-14',profile:{id:'combat',category:'combat',expectedSecondsPerUnit:1200,challenge:'routine'},units:1,activityKind:'combat',contentId:'mob'};}
async function run(){
 const repo=new Repo(); const def=GUILD_WEEKLY_PROJECT_POOL.find(x=>x.focus==='combat')!;
 const p1=createWeeklyGuildProjectInstanceReference({id:'p1',guildId:'g1',definition:def,activeMemberSnapshot:4,startsAtMs:0,endsAtMs:9999999999999});p1.cycleKey='2026-09-14';
 const p2=createWeeklyGuildProjectInstanceReference({id:'p2',guildId:'g2',definition:def,activeMemberSnapshot:4,startsAtMs:0,endsAtMs:9999999999999});p2.cycleKey='2026-09-14';
 repo.states.set('p1',{instance:p1,memberProgress:[],pointsCreditedToday:0});repo.states.set('p2',{instance:p2,memberProgress:[],pointsCreditedToday:0});
 const first=await recordGuildProjectContribution(repo,'p1',event('e1'),{guildIdAtSettlement:'g1',guildProjectInstanceIds:['p1']});assert.ok(first.creditedPoints>0);assert.equal(repo.bindings.get('2026-09-14:account'),'g1');
 const hopped=await recordGuildProjectContribution(repo,'p2',event('e2'),{guildIdAtSettlement:'g2',guildProjectInstanceIds:['p2']});assert.equal(hopped.creditedPoints,0,'cycle binding must stop guild hopping from feeding a second weekly project');
 const duplicate=await recordGuildProjectContribution(repo,'p1',event('e1'),{guildIdAtSettlement:'g1',guildProjectInstanceIds:['p1']});assert.equal(duplicate.creditedPoints,0,'retry must be idempotent');
 console.log('v18 guild project service/binding tests passed');
}
run();
