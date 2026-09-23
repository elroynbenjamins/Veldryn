import type {CoopCombatReplayCombatantView,CoopCombatReplayCueView,CoopCombatReplayGemSnapshotView,CoopCombatReplayStateView,CoopCombatReplayStatusView,CoopCombatReplayView} from './coop-presentation';

export const DUNGEON_COMBAT_PLAYBACK=Object.freeze({
  timeScale:.12,
  minCueDelayMs:260,
  maxCueDelayMs:950,
  recentCueCount:3,
  maximumCues:48,
  minCastDisplayMs:420,
  maxCastDisplayMs:1400,
  minFastCueDelayMs:90,
  minFastCastDisplayMs:260,
});

export type DungeonPlaybackTone='neutral'|'selected'|'success'|'warning'|'danger';
export type DungeonPlaybackSpeed=1|2|4;
export const DUNGEON_PLAYBACK_SPEEDS:readonly DungeonPlaybackSpeed[]=Object.freeze([1,2,4]);

function playbackSpeedValue(speed:DungeonPlaybackSpeed|undefined){return speed===2||speed===4?speed:1;}

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

export function playbackCueDelayMs(current:CoopCombatReplayCueView,next:CoopCombatReplayCueView,speed:DungeonPlaybackSpeed=1):number{
  const factor=playbackSpeedValue(speed),gap=Math.max(0,next.atMs-current.atMs),scaled=Math.round(gap*DUNGEON_COMBAT_PLAYBACK.timeScale/factor),floor=Math.max(DUNGEON_COMBAT_PLAYBACK.minFastCueDelayMs,Math.round(DUNGEON_COMBAT_PLAYBACK.minCueDelayMs/factor)),cap=Math.max(floor,Math.round(DUNGEON_COMBAT_PLAYBACK.maxCueDelayMs/factor));
  return Math.max(floor,Math.min(cap,scaled));
}

export function playbackCastDisplayMs(cue:CoopCombatReplayCueView|undefined,speed:DungeonPlaybackSpeed=1):number{
  if(!cue||cue.type!=='cast'||cue.durationMs===undefined||cue.durationMs<=0)return 0;
  const factor=playbackSpeedValue(speed),base=Math.max(DUNGEON_COMBAT_PLAYBACK.minCastDisplayMs,Math.min(DUNGEON_COMBAT_PLAYBACK.maxCastDisplayMs,Math.round(cue.durationMs*DUNGEON_COMBAT_PLAYBACK.timeScale))),floor=Math.max(DUNGEON_COMBAT_PLAYBACK.minFastCastDisplayMs,Math.round(DUNGEON_COMBAT_PLAYBACK.minCastDisplayMs/factor));
  return Math.max(floor,Math.round(base/factor));
}

export function playbackAdvanceDelayMs(current:CoopCombatReplayCueView,next:CoopCombatReplayCueView,speed:DungeonPlaybackSpeed=1):number{
  return Math.max(playbackCueDelayMs(current,next,speed),playbackCastDisplayMs(current,speed));
}

export function playbackVisualDurationMs(baseMs:number,speed:DungeonPlaybackSpeed=1,minMs=110):number{
  return Math.max(minMs,Math.round(Math.max(0,baseMs)/playbackSpeedValue(speed)));
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

export function playbackEnemyCombatants(replay:CoopCombatReplayView|undefined):CoopCombatReplayCombatantView[]{
  if(!replay)return [];
  return (replay.combatants??[]).filter(item=>item.team==='enemies').sort((a,b)=>Number(b.boss)-Number(a.boss)||a.id.localeCompare(b.id));
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
  source?:'ability'|'gem';
}

const STATUS_PRIORITY:Record<CoopCombatReplayStatusView['kind'],number>={dot:0,debuff:1,hot:2,buff:3};

const GEM_STATUS_PRESENTATION:Readonly<Record<string,{label:string;kind:'buff'|'debuff'}>>=Object.freeze({
  'gem:momentum':{label:'Momentum',kind:'buff'},
  'gem:critical_surge':{label:'Critical Surge',kind:'buff'},
  'gem:flow':{label:'Flow',kind:'buff'},
  'gem:unyielding':{label:'Unyielding',kind:'buff'},
  'gem:predator_boost':{label:'Predator',kind:'buff'},
  'gem:opening_phase':{label:'Opening Strike',kind:'buff'},
  'gem:retaliation_ready':{label:'Retaliation Ready',kind:'buff'},
  'gem:battle_offense_ready':{label:'Offense Ready',kind:'buff'},
  'gem:battle_support_ready':{label:'Support Ready',kind:'buff'},
  'gem:damage_reduction':{label:'Guard',kind:'buff'},
  'gem:shared_resolve':{label:'Shared Resolve',kind:'buff'},
  'gem:benediction_charge':{label:'Benediction',kind:'buff'},
  'gem:haste_bonus':{label:'Haste',kind:'buff'},
  'gem:opportunist_ready':{label:'Opportunist Mark',kind:'debuff'},
});

function playbackGemStatuses(replay:CoopCombatReplayView,now:number,id:string):PlaybackCombatStatus[]{
  let latest:CoopCombatReplayGemSnapshotView|undefined;
  for(const snapshot of replay.gemStates??[]){if(snapshot.atMs<=now)latest=snapshot;else break;}
  if(!latest)return [];
  const result:PlaybackCombatStatus[]=[];
  for(const state of latest.states){
    if(state.targetId!==id)continue;
    const presentation=GEM_STATUS_PRESENTATION[state.tag];if(!presentation)continue;
    const activeExpiries=state.expiriesAtMs.filter(expiry=>expiry>now);if(!activeExpiries.length)continue;
    result.push({kind:presentation.kind,tag:state.tag,label:presentation.label,stacks:activeExpiries.length,remainingMs:Math.max(...activeExpiries)-now,source:'gem'});
  }
  return result;
}

export function playbackCombatantStatuses(replay:CoopCombatReplayView|undefined,index:number,id:string|undefined):PlaybackCombatStatus[]{
  if(!replay||!id)return [];
  const safe=Math.max(0,Math.min(index,replay.cues.length-1)),now=replay.cues[safe]?.atMs??0;
  const active=(replay.statuses??[]).filter(status=>status.targetId===id&&status.startsAtMs<=now&&status.expiresAtMs>now);
  const grouped=new Map<string,PlaybackCombatStatus>();
  for(const status of active){
    const key=`${status.kind}:${status.tag}:${status.abilityId??status.label}`,remainingMs=Math.max(0,status.expiresAtMs-now),existing=grouped.get(key);
    if(existing){existing.stacks+=1;existing.remainingMs=Math.max(existing.remainingMs,remainingMs);continue;}
    grouped.set(key,{kind:status.kind,tag:status.tag,label:status.label,abilityId:status.abilityId,stacks:1,remainingMs,source:'ability'});
  }
  const merged=[...grouped.values(),...playbackGemStatuses(replay,now,id)];
  return merged.sort((a,b)=>STATUS_PRIORITY[a.kind]-STATUS_PRIORITY[b.kind]||(a.source==='gem'?-1:0)-(b.source==='gem'?-1:0)||a.remainingMs-b.remainingMs||a.label.localeCompare(b.label));
}

export function playbackRecentCues(replay:CoopCombatReplayView,index:number):CoopCombatReplayCueView[]{
  if(!replay.cues.length)return [];
  const safe=Math.max(0,Math.min(index,replay.cues.length-1));
  return replay.cues.slice(Math.max(0,safe-DUNGEON_COMBAT_PLAYBACK.recentCueCount+1),safe+1);
}
