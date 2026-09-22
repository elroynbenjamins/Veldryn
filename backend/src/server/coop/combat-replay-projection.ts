export type PublicCombatReplayCueType='action'|'phase'|'cast'|'interrupt'|'down'|'assist'|'victory'|'wipe'|'timeout';

export interface PublicCombatReplayState{ id:string; hp:number; shield:number; }
export interface PublicCombatReplayCombatant{ id:string; name:string; team:'players'|'enemies'; maxHp:number; startHp:number; startShield:number; boss:boolean; }
export interface PublicCombatReplayStatus{ targetId:string; sourceId?:string; kind:'buff'|'debuff'|'dot'|'hot'; tag:string; label:string; abilityId?:string; startsAtMs:number; expiresAtMs:number; }
export interface PublicCombatReplayGemState{ targetId:string; tag:string; expiriesAtMs:number[]; }
export interface PublicCombatReplayGemSnapshot{ atMs:number; states:PublicCombatReplayGemState[]; }
export interface PublicCombatReplayContribution{ id:string; damage:number; healing:number; damageTaken:number; interrupts:number; }

export interface PublicCombatReplayCue{
  atMs:number;
  type:PublicCombatReplayCueType;
  actorId?:string;
  actorName?:string;
  targetId?:string;
  targetName?:string;
  abilityId?:string;
  abilityName?:string;
  durationMs?:number;
  actionKind?:'damage'|'heal'|'shield';
  outcome?:'critical'|'miss';
  absorbed?:number;
  gemProc?:boolean;
  amount?:number;
  states?:PublicCombatReplayState[];
}

export interface PublicCombatReplay{
  nodeId:string;
  reason:'victory'|'wipe'|'timeout';
  durationMs:number;
  combatants:PublicCombatReplayCombatant[];
  statuses:PublicCombatReplayStatus[];
  gemStates:PublicCombatReplayGemSnapshot[];
  contributions:PublicCombatReplayContribution[];
  cues:PublicCombatReplayCue[];
}

const TYPES=new Set<PublicCombatReplayCueType>(['action','phase','cast','interrupt','down','assist','victory','wipe','timeout']);
const REASONS=new Set<PublicCombatReplay['reason']>(['victory','wipe','timeout']);
const VISIBLE_GEM_TAGS=new Set([
  'gem:momentum','gem:critical_surge','gem:flow','gem:unyielding','gem:predator_boost','gem:opening_phase',
  'gem:retaliation_ready','gem:battle_offense_ready','gem:battle_support_ready','gem:damage_reduction',
  'gem:shared_resolve','gem:benediction_charge','gem:haste_bonus','gem:opportunist_ready',
]);
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():undefined;
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;

function cue(value:unknown,durationMs:number):PublicCombatReplayCue|undefined{
  if(!value||typeof value!=='object')return undefined;
  const row=value as Record<string,unknown>,at=finite(row.atMs),type=text(row.type) as PublicCombatReplayCueType|undefined;
  if(at===undefined||at<0||at>durationMs||!type||!TYPES.has(type))return undefined;
  const castDuration=finite(row.durationMs),amount=finite(row.amount),absorbed=finite(row.absorbed),actionKind=row.actionKind==='damage'||row.actionKind==='heal'||row.actionKind==='shield'?row.actionKind:undefined,outcome=row.outcome==='critical'||row.outcome==='miss'?row.outcome:undefined,gemProc=row.gemProc===true;
  const states=(Array.isArray(row.states)?row.states:[]).map(item=>{if(!item||typeof item!=='object')return undefined;const s=item as Record<string,unknown>,id=text(s.id),hp=finite(s.hp),shield=finite(s.shield);if(!id||hp===undefined||hp<0||shield===undefined||shield<0)return undefined;return{id,hp:Number(hp.toFixed(2)),shield:Number(shield.toFixed(2))};}).filter((item):item is PublicCombatReplayState=>Boolean(item)).slice(0,12);
  return {
    atMs:Math.round(at),
    type,
    actorId:text(row.actorId),
    actorName:text(row.actorName),
    targetId:text(row.targetId),
    targetName:text(row.targetName),
    abilityId:text(row.abilityId),
    abilityName:text(row.abilityName),
    ...(castDuration!==undefined&&castDuration>=0?{durationMs:Math.round(castDuration)}:{}),
    ...(actionKind?{actionKind}:{}),
    ...(outcome?{outcome}:{}),
    ...(absorbed!==undefined&&absorbed>=0?{absorbed:Number(absorbed.toFixed(2))}:{}),
    ...(gemProc?{gemProc:true}:{}),
    ...(amount!==undefined&&amount>=0?{amount:Number(amount.toFixed(2))}:{}),
    ...(states.length?{states}:{}),
  };
}

/** Projects only presentation-safe combat moments from an authoritative node result.
 * Full combat traces, RNG state and hidden enemy internals never leave the server.
 */
export function projectCombatReplay(lastResolution:undefined|{nodeId:string;result:{summary:Record<string,unknown>}}):PublicCombatReplay|undefined{
  if(!lastResolution)return undefined;
  const summary=lastResolution.result.summary;
  if(summary.kind!=='combat')return undefined;
  const reason=text(summary.reason) as PublicCombatReplay['reason']|undefined,duration=finite(summary.durationMs);
  if(!reason||!REASONS.has(reason)||duration===undefined||duration<0)return undefined;
  const combatants=(Array.isArray(summary.replayCombatants)?summary.replayCombatants:[]).map(item=>{if(!item||typeof item!=='object')return undefined;const row=item as Record<string,unknown>,id=text(row.id),name=text(row.name),team=row.team==='players'||row.team==='enemies'?row.team:undefined,maxHp=finite(row.maxHp),startHp=finite(row.startHp),startShield=finite(row.startShield),boss=row.boss===true;if(!id||!name||!team||maxHp===undefined||maxHp<=0||startHp===undefined||startHp<0||startHp>maxHp||startShield===undefined||startShield<0)return undefined;return{id,name,team,maxHp:Number(maxHp.toFixed(2)),startHp:Number(startHp.toFixed(2)),startShield:Number(startShield.toFixed(2)),boss};}).filter((item):item is PublicCombatReplayCombatant=>Boolean(item)).slice(0,12);
  const combatantIds=new Set(combatants.map(item=>item.id));
  const statuses=(Array.isArray(summary.replayStatuses)?summary.replayStatuses:[]).map(item=>{if(!item||typeof item!=='object')return undefined;const row=item as Record<string,unknown>,targetId=text(row.targetId),sourceId=text(row.sourceId),kind=row.kind==='buff'||row.kind==='debuff'||row.kind==='dot'||row.kind==='hot'?row.kind:undefined,tag=text(row.tag),label=text(row.label),abilityId=text(row.abilityId),starts=finite(row.startsAtMs),expires=finite(row.expiresAtMs);if(!targetId||!combatantIds.has(targetId)||!kind||!tag||!label||starts===undefined||starts<0||starts>=duration||expires===undefined||expires<=starts)return undefined;return{targetId,...(sourceId?{sourceId}:{}),kind,tag,label,...(abilityId?{abilityId}:{}),startsAtMs:Math.round(starts),expiresAtMs:Math.round(Math.min(expires,duration))};}).filter((item):item is PublicCombatReplayStatus=>Boolean(item)).slice(0,96);
  const gemStates=(Array.isArray(summary.replayGemStates)?summary.replayGemStates:[]).map(item=>{
    if(!item||typeof item!=='object')return undefined;
    const row=item as Record<string,unknown>,at=finite(row.atMs);if(at===undefined||at<0||at>duration)return undefined;
    const states=(Array.isArray(row.states)?row.states:[]).map(state=>{
      if(!state||typeof state!=='object')return undefined;
      const value=state as Record<string,unknown>,targetId=text(value.targetId),tag=text(value.tag);
      if(!targetId||!combatantIds.has(targetId)||!tag||!VISIBLE_GEM_TAGS.has(tag))return undefined;
      const expiries=(Array.isArray(value.expiriesAtMs)?value.expiriesAtMs:[]).map(finite).filter((expiry):expiry is number=>expiry!==undefined&&expiry>at).map(expiry=>Math.round(Math.min(expiry,duration))).filter(expiry=>expiry>at).slice(0,8).sort((a,b)=>a-b);
      if(!expiries.length)return undefined;
      return{targetId,tag,expiriesAtMs:expiries};
    }).filter((state):state is PublicCombatReplayGemState=>Boolean(state)).slice(0,24);
    return{atMs:Math.round(at),states};
  }).filter((item):item is PublicCombatReplayGemSnapshot=>Boolean(item)).slice(0,128).sort((a,b)=>a.atMs-b.atMs);
  const metric=(value:unknown,id:string)=>{if(!value||typeof value!=='object')return 0;const raw=finite((value as Record<string,unknown>)[id]);return raw!==undefined&&raw>=0?Number(raw.toFixed(2)):0;};
  const contributions:PublicCombatReplayContribution[]=combatants.filter(item=>item.team==='players').slice(0,4).map(item=>({id:item.id,damage:metric(summary.damage,item.id),healing:metric(summary.healing,item.id),damageTaken:metric(summary.damageTaken,item.id),interrupts:Math.round(metric(summary.interrupts,item.id))}));
  const cues=(Array.isArray(summary.replayCues)?summary.replayCues:[])
    .map(item=>cue(item,duration))
    .filter((item):item is PublicCombatReplayCue=>Boolean(item))
    .slice(0,48)
    .sort((a,b)=>a.atMs-b.atMs);
  return {nodeId:lastResolution.nodeId,reason,durationMs:Math.round(duration),combatants,statuses,gemStates,contributions,cues};
}
