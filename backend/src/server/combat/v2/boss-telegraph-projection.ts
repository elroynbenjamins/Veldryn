/**
 * HIDDEN Combat 2.0 replay projection for boss telegraph UI review.
 *
 * Consumes the already produced, authoritative deterministic engine result.
 * Never generates damage, changes cooldowns, creates a battle or trusts raw
 * client claims. The mobile UI is NOT wired to this module.
 *
 * Only real authored Boss 2.0 casts that emitted cast_start become telegraphs.
 * An authored ability name, its interruptible flag and its cast deadline come
 * from the resolved boss definition, not from event text or player-supplied UI.
 */
import type {CombatResult,CombatantDefinition} from '../types';

export interface VerifiedBossCastSignalV2{
 readonly bossId:string;
 readonly abilityId:string;
 readonly abilityName:string;
 readonly targetId:string|null;
 readonly startedAtMs:number;
 readonly expectedCompleteAtMs:number;
 readonly castDurationMs:number;
 readonly interruptible:boolean;
 readonly state:'completed'|'interrupted'|'unresolved';
 readonly endedAtMs:number|null;
 readonly interruptedByActorId:string|null;
}
export interface VerifiedBossStatusClearSignalV2{
 readonly actorId:string;
 readonly targetId:string;
 readonly abilityId:string;
 readonly statusKind:'debuff'|'dot';
 readonly statusTag:string;
 readonly atMs:number;
}
export interface BossCombatReplaySignalsV2{
 readonly scope:'HIDDEN_COMPILED_BOSS_V2_REPLAY_ONLY';
 readonly casts:readonly VerifiedBossCastSignalV2[];
 readonly statusClears:readonly VerifiedBossStatusClearSignalV2[];
}
type OpenCast={boss:CombatantDefinition;signal:VerifiedBossCastSignalV2;index:number};
const fail=(kind:string):never=>{throw Error('combat_v2_boss_signal_'+kind)};
const isTime=(t:number)=>Number.isSafeInteger(t)&&t>=0;
function confirmedV2Bosses(result:CombatResult):Map<string,CombatantDefinition>{
 const bosses=new Map<string,CombatantDefinition>();
 for(const state of result.enemies){
  const boss=state.definition;
  if(!boss.boss)continue;
  if(boss.team!=='enemies'||!boss.tags?.some(x=>x.startsWith('enemy-v2:')))
   fail('boss_unverified_v2_kit');
  if(bosses.has(boss.id)||!boss.id)fail('duplicate_boss');
  bosses.set(boss.id,boss);
 }
 return bosses;
}
/** Only use inside authenticated, previously validated private combat code. */
export function projectBossCombatReplaySignalsV2(
 result:CombatResult,
):BossCombatReplaySignalsV2{
 if(!result||!isTime(result.durationMs)||!Array.isArray(result.events))
  fail('result_invalid');
 if(!result.players.some(p=>p.definition.combatV2?.version===2))
  fail('skills_v2_required');
 const bosses=confirmedV2Bosses(result);
 if(!bosses.size)fail('no_authored_boss');
 const playerIds=new Set(result.players.map(p=>p.definition.id));
 const v2PlayerIds=new Set(result.players.filter(p=>p.definition.combatV2?.version===2)
  .map(p=>p.definition.id));
 const participantIds=new Set([...playerIds,...result.enemies.map(e=>e.definition.id)]);
 const casts:VerifiedBossCastSignalV2[]=[];
 const statusClears:VerifiedBossStatusClearSignalV2[]=[];
 const open=new Map<string,OpenCast>();
 const id=(x:unknown)=>typeof x==='string'&&x.length>0;
 let last=-1;
 for(const event of result.events){
  if(!isTime(event.atMs)||event.atMs<last||
     event.atMs>result.durationMs)fail('event_time_invalid');
  last=event.atMs;
  const boss=event.actorId?bosses.get(event.actorId):undefined;
  if(event.type==='cast_start'&&boss){
   const ability=boss.abilities.find(a=>a.id===event.abilityId);
   if(!ability)throw Error('combat_v2_boss_signal_cast_start_unverifiable');
   if(!Number.isSafeInteger(ability.castTimeMs)||
      ability.castTimeMs<=0||!participantIds.has(event.targetId??'')||
      open.has(boss.id))fail('cast_start_unverifiable');
   const signal:VerifiedBossCastSignalV2={
    bossId:boss.id,abilityId:ability.id,abilityName:ability.name,
    targetId:event.targetId!,startedAtMs:event.atMs,
    expectedCompleteAtMs:event.atMs+ability.castTimeMs,
    castDurationMs:ability.castTimeMs,interruptible:ability.interruptible===true,
    state:'unresolved',endedAtMs:null,interruptedByActorId:null,
   };
   casts.push(signal);
   open.set(boss.id,{boss,signal,index:casts.length-1});
  }
  if(event.type==='cast_complete'&&boss){
   const active=open.get(boss.id);
   if(!active)throw Error('combat_v2_boss_signal_cast_complete_without_start');
   if(active.signal.abilityId!==event.abilityId||
      active.signal.targetId!==event.targetId||
      event.atMs<active.signal.expectedCompleteAtMs)
    fail('cast_complete_without_start');
   casts[active.index]={...active.signal,state:'completed',endedAtMs:event.atMs};
   open.delete(boss.id);
  }
  if(event.type==='interrupt'&&event.targetId&&bosses.has(event.targetId)){
   const active=open.get(event.targetId);
   if(!active)throw Error('combat_v2_boss_signal_interruption_without_live_cast');
   if(!active.signal.interruptible||
      active.signal.abilityId!==event.interruptedAbilityId||
      !playerIds.has(event.actorId??'')||
      event.atMs>active.signal.expectedCompleteAtMs)
    fail('interruption_without_live_cast');
   casts[active.index]={...active.signal,state:'interrupted',
    endedAtMs:event.atMs,interruptedByActorId:event.actorId!};
   open.delete(event.targetId);
  }
  if(event.type==='death'&&event.targetId&&open.has(event.targetId)){
   open.delete(event.targetId); // Death ends the cast; do not invent an interrupt.
  }
  if(event.type==='status_remove'&&(event.statusKind==='dot'||
     event.statusKind==='debuff')&&v2PlayerIds.has(event.actorId??'')&&
     playerIds.has(event.targetId??'')&&
     id(event.abilityId)&&id(event.statusTag)){
   statusClears.push({
    actorId:event.actorId!,targetId:event.targetId!,
    abilityId:event.abilityId!,statusKind:event.statusKind,
    statusTag:event.statusTag!,atMs:event.atMs,
   });
  }
 }
 return {scope:'HIDDEN_COMPILED_BOSS_V2_REPLAY_ONLY',casts,statusClears};
}
