export type PublicCombatReplayCueType='action'|'phase'|'cast'|'interrupt'|'down'|'assist'|'victory'|'wipe'|'timeout';

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
}

export interface PublicCombatReplay{
  nodeId:string;
  reason:'victory'|'wipe'|'timeout';
  durationMs:number;
  cues:PublicCombatReplayCue[];
}

const TYPES=new Set<PublicCombatReplayCueType>(['action','phase','cast','interrupt','down','assist','victory','wipe','timeout']);
const REASONS=new Set<PublicCombatReplay['reason']>(['victory','wipe','timeout']);
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():undefined;
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;

function cue(value:unknown,durationMs:number):PublicCombatReplayCue|undefined{
  if(!value||typeof value!=='object')return undefined;
  const row=value as Record<string,unknown>,at=finite(row.atMs),type=text(row.type) as PublicCombatReplayCueType|undefined;
  if(at===undefined||at<0||at>durationMs||!type||!TYPES.has(type))return undefined;
  const castDuration=finite(row.durationMs),amount=finite(row.amount),absorbed=finite(row.absorbed),actionKind=row.actionKind==='damage'||row.actionKind==='heal'||row.actionKind==='shield'?row.actionKind:undefined,outcome=row.outcome==='critical'||row.outcome==='miss'?row.outcome:undefined,gemProc=row.gemProc===true;
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
  const cues=(Array.isArray(summary.replayCues)?summary.replayCues:[])
    .map(item=>cue(item,duration))
    .filter((item):item is PublicCombatReplayCue=>Boolean(item))
    .slice(0,48)
    .sort((a,b)=>a.atMs-b.atMs);
  return {nodeId:lastResolution.nodeId,reason,durationMs:Math.round(duration),cues};
}
