/**
 * Private Enemies / Bosses 2.0 QA only.
 * Pure read-only combat replay diagnostics: no tuning, damage modifications,
 * release flags, loot, persistence, live routes, or presentation contracts.
 *
 * Detects impossible authored boss timelines but reports ordinary balance
 * concerns (short fights, missing phase exposure, timeout walls) as warnings.
 * An early kill or a cast cut short by combat ending is NOT a forged replay.
 */
import type {CombatResult} from '../types';

export interface AuthoredBossPacingContractV2 {
 readonly bossId:string;
 readonly classId:string;
 readonly specId:string;
 readonly casts:readonly {abilityId:string;castMs:number;interruptible:boolean}[];
 readonly phases:readonly {phaseId:string;hpPercent:number}[];
}
export interface BossPacingObservationV2 {
 readonly bossId:string;readonly classId:string;readonly specId:string;
 readonly durationMs:number;readonly reason:'victory'|'wipe'|'timeout';
 readonly playerHpPercent:number;readonly bossHpPercent:number;
 readonly firstCastAtMs:number|null;
 readonly castsStarted:number;readonly castsCompleted:number;
 readonly castsInterrupted:number;readonly castsUnresolvedAtEnd:number;
 readonly completedCastWindupMs:readonly number[];
 readonly phase70AtMs:number|null;readonly phase35AtMs:number|null;
 readonly warnings:readonly ('no_authored_cast'|'no_authored_phase'|
  'no_completed_threat'|'early_end_before_counterplay')[];
}
export interface BossPacingAggregateV2 {
 readonly provenance:'synthetic_unapproved_boss_pacing_v2';
 readonly bossId:string;readonly cases:number;readonly wins:number;
 readonly wipes:number;readonly timeouts:number;
 readonly durationP10Ms:number;readonly durationP50Ms:number;
 readonly durationP90Ms:number;readonly firstCastP50Ms:number|null;
 readonly bossHpP50Percent:number;readonly playerHpP50Percent:number;
 /** Descriptive synthetic categories, NOT difficulty pass/fail thresholds. */
 readonly winsBeforeFirstTell:number;readonly wipesBeforeFirstTell:number;
 readonly timeoutsWithBossHpAbove70:number;
 readonly castStarts:number;readonly castCompletes:number;
 readonly castInterrupts:number;readonly unresolvedAtEnd:number;
 readonly phase70Cases:number;readonly phase35Cases:number;
 readonly noCastCases:number;readonly noPhaseCases:number;
 readonly classSpecCount:number;
 readonly warnings:readonly string[];
}
const fail=(why:string):never=>{throw Error('combat_v2_boss_pacing_'+why);};
const ownId=(x:unknown):x is string=>typeof x==='string'&&
 x.length>0&&x.length<=128&&/^[A-Za-z0-9:_-]+$/.test(x);
const percent=(n:number)=>Math.round(n*10000)/100;
const pct=(x:number,max:number)=>percent(Math.max(0,Math.min(1,x/max)));
const quantile=(xs:readonly number[],p:number):number=>{
 if(!xs.length)fail('empty_quantile');
 const sorted=[...xs].sort((a,b)=>a-b);
 return sorted[Math.ceil(p*sorted.length)-1];
};
const unique=(xs:readonly string[])=>new Set(xs).size===xs.length;
function validContract(c:AuthoredBossPacingContractV2){
 if(!c||![c.bossId,c.classId,c.specId].every(ownId)||
  !Array.isArray(c.casts)||!Array.isArray(c.phases)||
  c.casts.length<1||c.casts.length>4||c.phases.length!==2||
  !c.casts.every(a=>a&&ownId(a.abilityId)&&Number.isSafeInteger(a.castMs)&&
   a.castMs>=1100&&a.castMs<=5000&&typeof a.interruptible==='boolean')||
  !c.phases.every(p=>p&&ownId(p.phaseId))||
  !unique(c.casts.map(a=>a.abilityId))||
  !unique(c.phases.map(p=>p.phaseId))||
  c.phases[0].hpPercent!==70||c.phases[1].hpPercent!==35)
  fail('invalid_authored_contract');
}
export function observeBossPacingV2(
 c:AuthoredBossPacingContractV2,result:CombatResult,
):BossPacingObservationV2{
 validContract(c);
 if(!result||!['victory','wipe','timeout'].includes(result.reason)||
  result.victory!==(result.reason==='victory')||
  !Number.isSafeInteger(result.durationMs)||result.durationMs<0||
  !Array.isArray(result.events)||result.events.length<1||
  result.events.length>10000||!Array.isArray(result.players)||
  !Array.isArray(result.enemies)||result.players.length!==1||
  result.enemies.length!==1||result.enemies[0].definition.id!==c.bossId||
  !result.enemies[0].definition.boss)
  fail('invalid_combat_result');
 const player=result.players[0],boss=result.enemies[0];
 if(![player.hp,player.definition.stats.maxHp,boss.hp,
       boss.definition.stats.maxHp].every(Number.isFinite)||
  player.definition.stats.maxHp<=0||boss.definition.stats.maxHp<=0||
  player.hp<0||boss.hp<0||player.hp>player.definition.stats.maxHp||
  boss.hp>boss.definition.stats.maxHp)
  fail('invalid_combatant_health');
 const last=result.events[result.events.length-1];
 if(last.type!=='combat_end'||last.atMs!==result.durationMs||
  last.detail!==result.reason||
  result.events.filter(e=>e.type==='combat_end').length!==1)
  fail('invalid_combat_terminal');
 const casts=new Map(c.casts.map(a=>[a.abilityId,a]));
 const phases=new Set(c.phases.map(p=>p.phaseId));
 const active=new Map<string,number>();
 const windups:number[]=[];
 let prev=-1,started=0,completed=0,interrupted=0;
 let firstCast:number|null=null,p70:number|null=null,p35:number|null=null;
 for(const e of result.events){
  if(!e||!Number.isSafeInteger(e.atMs)||e.atMs<prev||
   e.atMs>result.durationMs)
   fail('invalid_event_order');
  prev=e.atMs;
  if(e.type==='phase'&&e.actorId===c.bossId){
   const phaseId=e.abilityId;
   if(!phaseId)throw Error('combat_v2_boss_pacing_missing_phase_id');
   if(!phases.has(phaseId)){
    if(phaseId.includes('_V2_'))fail('unknown_v2_phase');
    continue; // Preexisting authored legacy phase is allowed.
   }
   if(e.abilityId===c.phases[0].phaseId){
    if(p70!==null||p35!==null)fail('duplicate_or_out_of_order_phase');
    p70=e.atMs;
   }else{
    if(p70===null||p35!==null)fail('duplicate_or_out_of_order_phase');
    p35=e.atMs;
   }
  }
  if(e.type==='cast_start'&&e.actorId===c.bossId){
   const castId=e.abilityId;
   if(!castId)throw Error('combat_v2_boss_pacing_missing_cast_id');
   const spec=casts.get(castId);
   if(!spec){
    if(castId.includes('_V2_'))fail('unknown_v2_cast');
    continue;
   }
   if(active.has(castId))fail('overlapping_authored_cast');
   active.set(castId,e.atMs);
   started++;
   if(firstCast===null)firstCast=e.atMs;
  }
  if(e.type==='cast_complete'&&e.actorId===c.bossId&&
   e.abilityId&&casts.has(e.abilityId)){
   const start=active.get(e.abilityId);
   if(start===undefined)throw Error('combat_v2_boss_pacing_completion_without_start');
   const required=casts.get(e.abilityId)!.castMs;
   if(e.atMs-start<required)fail('cast_completed_too_soon');
   windups.push(e.atMs-start);
   active.delete(e.abilityId);
   completed++;
  }
  if(e.type==='interrupt'&&e.targetId===c.bossId&&
   e.interruptedAbilityId&&casts.has(e.interruptedAbilityId)){
   const start=active.get(e.interruptedAbilityId);
   if(start===undefined)throw Error('combat_v2_boss_pacing_interrupt_without_start');
   if(!casts.get(e.interruptedAbilityId)!.interruptible)
    fail('uninterruptible_cast_interrupted');
   active.delete(e.interruptedAbilityId);
   interrupted++;
  }
 }
 const warnings:BossPacingObservationV2['warnings'][number][]=[];
 if(started===0)warnings.push('no_authored_cast');
 if(p70===null)warnings.push('no_authored_phase');
 if(started>0&&completed===0)warnings.push('no_completed_threat');
 if(result.reason==='victory'&&started===0)warnings.push('early_end_before_counterplay');
 return {
  bossId:c.bossId,classId:c.classId,specId:c.specId,
  durationMs:result.durationMs,reason:result.reason,
  playerHpPercent:pct(player.hp,player.definition.stats.maxHp),
  bossHpPercent:pct(boss.hp,boss.definition.stats.maxHp),
  firstCastAtMs:firstCast,castsStarted:started,castsCompleted:completed,
  castsInterrupted:interrupted,castsUnresolvedAtEnd:active.size,
  completedCastWindupMs:windups,
  phase70AtMs:p70,phase35AtMs:p35,warnings,
 };
}
export function aggregateBossPacingV2(
 samples:readonly BossPacingObservationV2[],
):readonly BossPacingAggregateV2[]{
 if(!Array.isArray(samples)||samples.length===0)fail('empty_samples');
 const grouped=new Map<string,BossPacingObservationV2[]>();
 const seen=new Set<string>();
 for(const s of samples){
  if(!s||![s.bossId,s.classId,s.specId].every(ownId)||
   !Number.isSafeInteger(s.durationMs)||s.durationMs<0||
   !Number.isSafeInteger(s.castsStarted)||s.castsStarted<0||
   !Number.isSafeInteger(s.castsCompleted)||s.castsCompleted<0||
   !Number.isSafeInteger(s.castsInterrupted)||s.castsInterrupted<0||
   !Number.isSafeInteger(s.castsUnresolvedAtEnd)||s.castsUnresolvedAtEnd<0||
   s.castsStarted!==s.castsCompleted+s.castsInterrupted+s.castsUnresolvedAtEnd||
   !['victory','wipe','timeout'].includes(s.reason)||
   ![s.playerHpPercent,s.bossHpPercent].every(x=>Number.isFinite(x)&&x>=0&&x<=100)||
   ![s.firstCastAtMs,s.phase70AtMs,s.phase35AtMs].every(x=>
    x===null||(Number.isSafeInteger(x)&&x>=0&&x<=s.durationMs))||
   (s.phase35AtMs!==null&&(s.phase70AtMs===null||s.phase35AtMs<s.phase70AtMs)))
   fail('invalid_sample');
  const identity=s.bossId+':'+s.classId+':'+s.specId;
  if(seen.has(identity))fail('duplicate_class_spec');
  seen.add(identity);
  grouped.set(s.bossId,[...(grouped.get(s.bossId)??[]),s]);
 }
 return [...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([bossId,rows])=>{
  const starts=rows.flatMap(r=>r.firstCastAtMs===null?[]:[r.firstCastAtMs]);
  const wins=rows.filter(r=>r.reason==='victory').length;
  const wipes=rows.filter(r=>r.reason==='wipe').length;
  const timeouts=rows.filter(r=>r.reason==='timeout').length;
  const noCast=rows.filter(r=>r.firstCastAtMs===null).length;
  const noPhase=rows.filter(r=>r.phase70AtMs===null).length;
  const winsBeforeFirstTell=rows.filter(r=>r.reason==='victory'&&
   r.firstCastAtMs===null).length;
  const wipesBeforeFirstTell=rows.filter(r=>r.reason==='wipe'&&
   r.firstCastAtMs===null).length;
  // 70% is an inspection threshold, not a proposed or approved tuning goal.
  const timeoutsWithBossHpAbove70=rows.filter(r=>
   r.reason==='timeout'&&r.bossHpPercent>70).length;
  const warnings:string[]=[];
  if(timeoutsWithBossHpAbove70>0)
   warnings.push('timeout_low_boss_hp_progress:'+
    timeoutsWithBossHpAbove70+'/'+rows.length);
  if(winsBeforeFirstTell>0)
   warnings.push('wins_before_first_tell:'+
    winsBeforeFirstTell+'/'+rows.length);
  if(wipesBeforeFirstTell>0)
   warnings.push('wipes_before_first_tell:'+
    wipesBeforeFirstTell+'/'+rows.length);
  if(noCast>0)warnings.push('unseen_boss_tells:'+noCast+'/'+rows.length);
  if(noPhase>0)warnings.push('unseen_phase_70:'+noPhase+'/'+rows.length);
  if(rows.every(r=>r.phase35AtMs===null))warnings.push('no_phase_35_observed');
  if(timeouts===rows.length)warnings.push('all_encounters_timed_out');
  if(wins===rows.length)warnings.push('all_encounters_won');
  return {
   provenance:'synthetic_unapproved_boss_pacing_v2' as const,
   bossId,cases:rows.length,wins,wipes,timeouts,
   durationP10Ms:quantile(rows.map(r=>r.durationMs),.1),
   durationP50Ms:quantile(rows.map(r=>r.durationMs),.5),
   durationP90Ms:quantile(rows.map(r=>r.durationMs),.9),
   firstCastP50Ms:starts.length?quantile(starts,.5):null,
   bossHpP50Percent:quantile(rows.map(r=>r.bossHpPercent),.5),
   playerHpP50Percent:quantile(rows.map(r=>r.playerHpPercent),.5),
   winsBeforeFirstTell,wipesBeforeFirstTell,timeoutsWithBossHpAbove70,
   castStarts:rows.reduce((n,r)=>n+r.castsStarted,0),
   castCompletes:rows.reduce((n,r)=>n+r.castsCompleted,0),
   castInterrupts:rows.reduce((n,r)=>n+r.castsInterrupted,0),
   unresolvedAtEnd:rows.reduce((n,r)=>n+r.castsUnresolvedAtEnd,0),
   phase70Cases:rows.length-noPhase,
   phase35Cases:rows.filter(r=>r.phase35AtMs!==null).length,
   noCastCases:noCast,noPhaseCases:noPhase,
   classSpecCount:rows.length,warnings,
  };
 });
}
