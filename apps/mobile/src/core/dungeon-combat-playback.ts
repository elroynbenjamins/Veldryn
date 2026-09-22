import type {CoopCombatReplayCombatantView,CoopCombatReplayCueView,CoopCombatReplayStateView,CoopCombatReplayStatusView,CoopCombatReplayView} from './coop-presentation';

export const DUNGEON_COMBAT_PLAYBACK=Object.freeze({
  timeScale:.12,
  minCueDelayMs:260,
  maxCueDelayMs:950,
  recentCueCount:3,
  maximumCues:48,
  minCastDisplayMs:420,
  maxCastDisplayMs:1400,
});

export type DungeonPlaybackTone='neutral'|'selected'|'success'|'warning'|'danger';

export function playbackCueTone(cue:CoopCombatReplayCueView):DungeonPlaybackTone{
  switch(cue.type){
    case 'victory': return 'success';
    case 'wipe': case 'down': return 'danger';
    case 'cast': return 'warning';
    case 'action': return cue.outcome==='miss'?'neutral':cue.outcome==='critical'?'warning':cue.actionKind==='heal'||cue.actionKind==='shield'?'success':'selected';
    case 'phase': case 'interrupt': case 'assist': return 'selected';
    case 'timeout': return 'warning';
    default: return 'neutral';
  }
}

export function playbackCueLabel(cue:CoopCombatReplayCueView):string{
  const actor=cue.actorName?.trim(),target=cue.targetName?.trim(),ability=cue.abilityName?.trim(),amount=cue.amount===undefined?'':` · ${Math.round(cue.amount)}`;
  switch(cue.type){
    case 'action': {
      const suffix=`${cue.outcome==='critical'?' · CRIT':''}${cue.outcome==='miss'?' · MISS':''}${cue.absorbed&&cue.absorbed>0?` · ${Math.round(cue.absorbed)} absorbed`:''}${cue.gemProc?' · GEM PROC':''}`;
      if(cue.actionKind==='heal')return `${actor??'Support'} heals ${target??'ally'}${amount}${suffix}`;
      if(cue.actionKind==='shield')return `${actor??'Support'} shields ${target??'ally'}${amount}${suffix}`;
      if(cue.outcome==='miss')return `${actor??'Combatant'} misses ${target??'target'}${suffix}`;
      if(ability==='Basic Attack')return `${actor??'Combatant'} attacks ${target??'target'}${amount}${suffix}`;
      return `${actor??'Combatant'} uses ${ability??'an ability'}${target?` on ${target}`:''}${amount}${suffix}`;
    }
    case 'phase': return ability?`${actor??'Boss'} enters ${ability}`:`${actor??'Boss'} changes phase`;
    case 'cast': return ability?`${actor??'Boss'} begins ${ability}`:`${actor??'Boss'} begins a cast`;
    case 'interrupt': return ability?`${actor??'Party'} interrupts with ${ability}`:`${actor??'Party'} interrupts the cast`;
    case 'assist': return ability?`${ability}`:`${actor??'Companion'} assist`;
    case 'down': return `${target??actor??'Party member'} is downed`;
    case 'victory': return 'Encounter cleared';
    case 'wipe': return 'Party defeated';
    case 'timeout': return 'Encounter timed out';
  }
}

export function playbackCueDelayMs(current:CoopCombatReplayCueView,next:CoopCombatReplayCueView):number{
  const gap=Math.max(0,next.atMs-current.atMs),scaled=Math.round(gap*DUNGEON_COMBAT_PLAYBACK.timeScale);
  return Math.max(DUNGEON_COMBAT_PLAYBACK.minCueDelayMs,Math.min(DUNGEON_COMBAT_PLAYBACK.maxCueDelayMs,scaled));
}

export function playbackCastDisplayMs(cue:CoopCombatReplayCueView|undefined):number{
  if(!cue||cue.type!=='cast'||cue.durationMs===undefined||cue.durationMs<=0)return 0;
  const scaled=Math.round(cue.durationMs*DUNGEON_COMBAT_PLAYBACK.timeScale);
  return Math.max(DUNGEON_COMBAT_PLAYBACK.minCastDisplayMs,Math.min(DUNGEON_COMBAT_PLAYBACK.maxCastDisplayMs,scaled));
}

export function playbackAdvanceDelayMs(current:CoopCombatReplayCueView,next:CoopCombatReplayCueView):number{
  return Math.max(playbackCueDelayMs(current,next),playbackCastDisplayMs(current));
}

export function playbackProgress(replay:CoopCombatReplayView,index:number):number{
  if(!replay.cues.length)return replay.reason==='victory'?1:0;
  const safe=Math.max(0,Math.min(index,replay.cues.length-1)),at=replay.cues[safe].atMs;
  return replay.durationMs<=0?1:Math.max(0,Math.min(1,at/replay.durationMs));
}

export function playbackCombatant(replay:CoopCombatReplayView|undefined,idOrName:string|undefined):CoopCombatReplayCombatantView|undefined{
  if(!replay||!idOrName?.trim())return undefined;
  const key=idOrName.trim().toLocaleLowerCase();
  return (replay.combatants??[]).find(item=>item.id===idOrName||item.name.trim().toLocaleLowerCase()===key);
}

export function playbackBossCombatant(replay:CoopCombatReplayView|undefined,name?:string):CoopCombatReplayCombatantView|undefined{
  if(!replay)return undefined;
  const list=replay.combatants??[],key=name?.trim().toLocaleLowerCase();
  return list.find(item=>item.boss)||(key?list.find(item=>item.team==='enemies'&&item.name.trim().toLocaleLowerCase()===key):undefined)||list.find(item=>item.team==='enemies');
}

export function playbackCombatantState(replay:CoopCombatReplayView|undefined,index:number,id:string|undefined):({maxHp:number}&CoopCombatReplayStateView)|undefined{
  if(!replay||!id)return undefined;
  const combatant=(replay.combatants??[]).find(item=>item.id===id);
  const safe=Math.max(0,Math.min(index,replay.cues.length-1));
  for(let i=safe;i>=0;i--){const state=replay.cues[i]?.states?.find(item=>item.id===id);if(state)return{...state,maxHp:combatant?.maxHp??Math.max(1,state.hp)};}
  return combatant?{id:combatant.id,hp:combatant.startHp,shield:combatant.startShield,maxHp:combatant.maxHp}:undefined;
}

export interface PlaybackCombatStatus{
  kind:CoopCombatReplayStatusView['kind'];
  tag:string;
  label:string;
  abilityId?:string;
  stacks:number;
  remainingMs:number;
}

const STATUS_PRIORITY:Record<CoopCombatReplayStatusView['kind'],number>={dot:0,debuff:1,hot:2,buff:3};

export function playbackCombatantStatuses(replay:CoopCombatReplayView|undefined,index:number,id:string|undefined):PlaybackCombatStatus[]{
  if(!replay||!id)return [];
  const safe=Math.max(0,Math.min(index,replay.cues.length-1)),now=replay.cues[safe]?.atMs??0;
  const active=(replay.statuses??[]).filter(status=>status.targetId===id&&status.startsAtMs<=now&&status.expiresAtMs>now);
  const grouped=new Map<string,PlaybackCombatStatus>();
  for(const status of active){
    const key=`${status.kind}:${status.tag}:${status.abilityId??status.label}`,remainingMs=Math.max(0,status.expiresAtMs-now),existing=grouped.get(key);
    if(existing){existing.stacks+=1;existing.remainingMs=Math.max(existing.remainingMs,remainingMs);continue;}
    grouped.set(key,{kind:status.kind,tag:status.tag,label:status.label,abilityId:status.abilityId,stacks:1,remainingMs});
  }
  return [...grouped.values()].sort((a,b)=>STATUS_PRIORITY[a.kind]-STATUS_PRIORITY[b.kind]||a.remainingMs-b.remainingMs||a.label.localeCompare(b.label));
}

export function playbackRecentCues(replay:CoopCombatReplayView,index:number):CoopCombatReplayCueView[]{
  if(!replay.cues.length)return [];
  const safe=Math.max(0,Math.min(index,replay.cues.length-1));
  return replay.cues.slice(Math.max(0,safe-DUNGEON_COMBAT_PLAYBACK.recentCueCount+1),safe+1);
}
