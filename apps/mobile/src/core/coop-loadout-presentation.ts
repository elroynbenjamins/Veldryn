import type {CoopMode} from './coop-presentation';
import type {CoopRole} from './coop-ui-contract';

export type CoopLoadoutVerificationStatus='verified'|'ineligible'|'stale'|'failed'|'pending';
export interface CoopEffectiveStats {maxHp:number;attackPower:number;healingPower:number;defense:number;}
export interface CoopLoadoutProjection {
  id:string;characterId:string;revision:number;verifiedRevision?:number;
  name:string;characterName:string;className:string;role:CoopRole;
  status:CoopLoadoutVerificationStatus;ready:boolean;failures:string[];
  level:number;effectiveLevel?:number;beforeStats?:CoopEffectiveStats;effectiveStats?:CoopEffectiveStats;
  skills:string[];equipment:string[];normalizationVersion?:string;verifiedAt?:string;
}
export interface CoopLoadoutIntent {mode:CoopMode;dungeonId:string;tier:1|2|3|4|5;characterId:string;loadoutId:string;loadoutRevision:number;}
export interface CoopLoadoutView extends CoopLoadoutProjection {selectable:boolean;blockingReasons:string[];changed:boolean;}

/** Presents only server-projected values. It deliberately does not derive roles,
 * calculate stats, or turn a client-side unit test into queue authorization. */
export function presentCoopLoadout(source:CoopLoadoutProjection,currentCharacterId:string):CoopLoadoutView{
  const blockingReasons=[...source.failures];
  if(source.characterId!==currentCharacterId)blockingReasons.push('different_character');
  if(source.status==='stale'||source.verifiedRevision!==source.revision)blockingReasons.push('stale_revision');
  if(source.status==='pending')blockingReasons.push('verification_pending');
  if(source.status==='failed')blockingReasons.push('verification_failed');
  if(source.status==='ineligible'&&!blockingReasons.length)blockingReasons.push('not_eligible');
  const hasVerifiedValues=source.effectiveLevel!==undefined&&source.effectiveStats!==undefined;
  if(!hasVerifiedValues)blockingReasons.push('missing_server_snapshot');
  return {...source,blockingReasons:[...new Set(blockingReasons)],selectable:source.status==='verified'&&source.ready&&blockingReasons.length===0,changed:Boolean(source.beforeStats&&source.effectiveStats&&(
    source.level!==source.effectiveLevel||Object.keys(source.beforeStats).some(key=>source.beforeStats![key as keyof CoopEffectiveStats]!==source.effectiveStats![key as keyof CoopEffectiveStats])
  ))};
}

export function buildCoopLoadoutIntent(input:{mode:CoopMode;dungeonId:string;tier:1|2|3|4|5;loadout:CoopLoadoutView}):CoopLoadoutIntent{
  if(!input.loadout.selectable)throw new Error('loadout_not_server_verified');
  return {mode:input.mode,dungeonId:input.dungeonId,tier:input.tier,characterId:input.loadout.characterId,loadoutId:input.loadout.id,loadoutRevision:input.loadout.revision};
}
