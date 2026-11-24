/**
 * HIDDEN review: compare real authored regional Enemy V2 boss opportunities
 * with the 15 ORIGINAL source-backed Forge set mechanic proposals.
 *
 * This only INSPECTS actual authored boss abilities/phases and observed
 * combat-engine events. It never alters a player, set, item, boss, RNG,
 * CombatResult or reward. A matched opportunity does NOT mean an effect
 * exists, works, has correct magnitude or is approved. No release authority.
 */
import type {CombatantDefinition,CombatResult,AbilityEffect,CombatEvent}
 from '../types';
import {verifyPersistedEnemyKitsV2,type PersistedEnemyKitV2}
 from './enemy-kit-composer';
import {reviewOriginalForgeSetBalanceDraftV2,
 type OriginalForgeSetReviewChannelV2}
 from './equipment-forge-set-balance-proposal';

export type OriginalSetBossOpportunityStatusV2=
 'mechanic_not_authored'|'authored_not_observed'|
 'opportunity_observed_effect_unimplemented';
export interface OriginalSetBossOpportunityRowV2{
 readonly bossId:string;
 readonly originalForgeSetId:string;
 readonly proposedCounterplay:OriginalForgeSetReviewChannelV2;
 readonly authoredOpportunity:boolean;
 readonly observedOpportunity:boolean;
 readonly relevantObservedEvents:number;
 readonly status:OriginalSetBossOpportunityStatusV2;
 readonly proposedTwoPiecePercent:number;
 readonly appliesInCombat:false;
 readonly effectImplementationVerified:false;
 readonly approvedForBalance:false;
}
export interface OriginalSetBossOpportunityReviewV2{
 readonly scope:'ORIGINAL_FORGE_SET_VS_AUTHORED_BOSS_OPPORTUNITY_ONLY';
 readonly bossId:string;
 readonly authoredBossAbilities:number;
 readonly authoredBossPhases:number;
 readonly recordedBossEvents:number;
 readonly rows:readonly OriginalSetBossOpportunityRowV2[];
 readonly mechanicNotAuthoredCount:number;
 readonly authoredNotObservedCount:number;
 readonly opportunityObservedCount:number;
 readonly actualSetEffectsApplied:0;
 readonly canAuthorizeCombat:false;
 readonly canGrantRewards:false;
 readonly releaseApproved:false;
}
const reject=(reason:string):never=>{throw Error('eq2_forge_set_boss_review_'+reason);};
const has=(items:readonly AbilityEffect[],kind:AbilityEffect['kind'])=>
 items.some(x=>x.kind===kind);
const positive=(items:readonly AbilityEffect[],tag:string)=>
 items.some(x=>x.kind==='debuff'&&x.tag===tag&&
  typeof x.value==='number'&&x.value>0);
/**
 * Counterplay taxonomy is deliberately conservative. A boss's ordinary
 * armor/defense stat is NOT evidence that a set's Armor Break effect exists.
 * A generic debuff is NOT proof that an unimplemented Cleanse can remove it.
 * A proposed set effect is NEVER considered present merely from its label.
 */
function isAuthoredOpportunity(
 channel:OriginalForgeSetReviewChannelV2,boss:CombatantDefinition,
 effects:readonly AbilityEffect[],
):boolean{
 const damage=has(effects,'damage')||boss.basicAttackCoeff>0;
 const dot=has(effects,'dot');
 const shield=has(effects,'shield');
 const debuff=has(effects,'debuff');
 const opening=positive(effects,'damage_taken');
 const magic=effects.some(e=>(e.kind==='damage'||e.kind==='dot')&&
  Boolean(e.damageType)&&e.damageType!=='physical');
 const execute=effects.some(e=>e.kind==='damage'&&
  ((e.executeBelowHpPct??0)>0||(e.executeBonus??0)>0));
 switch(channel){
  case 'guard_recovery':case 'healing_stability':
  case 'damage_taken_window':case 'retaliation_sustain':
  case 'shield_preservation':case 'healing_continuity':
  case 'reflect_timing':return damage||dot;
  case 'precision_window':return opening;
  case 'cleanse_timing':
   // Authored debuff is a possible window, not proof of removability.
   return debuff;
  case 'marked_enemy_pressure':
   return effects.some(e=>e.kind==='debuff'&&
    (e.tag==='marked'||e.tag==='mark'));
  case 'armored_enemy_pressure':
   return effects.some(e=>e.kind==='buff'&&e.tag==='armor');
  case 'dot_damage_tolerance':return dot;

  case 'evasive_opening':
   return boss.abilities.some(a=>a.castTimeMs>0&&
    a.effects.some(e=>e.kind==='damage'));
  case 'ward_spell_counter':return magic;
  case 'anti_burst_window':return execute||
   boss.phases?.some(p=>p.target==='all_enemies'&&has(p.effects,'damage'))===true;
  default:return shield&&opening;
 }
}
function evidenceEvents(channel:OriginalForgeSetReviewChannelV2,
 boss:CombatantDefinition,events:readonly CombatEvent[]){
 const own=events.filter(e=>e.actorId===boss.id);
 const by=(...kinds:CombatEvent['type'][])=>own.filter(e=>kinds.includes(e.type));
 switch(channel){
  case 'precision_window':return by('phase','status_apply').length;
  case 'marked_enemy_pressure':return own.filter(e=>
   e.type==='status_apply'&&(e.statusTag==='mark'||e.statusTag==='marked')).length;
  case 'armored_enemy_pressure':return own.filter(e=>
   e.type==='status_apply'&&e.statusTag==='armor').length;
  case 'dot_damage_tolerance':return by('dot_tick').length;
  case 'cleanse_timing':return own.filter(e=>
   e.type==='status_apply'&&e.statusKind==='debuff').length;
  case 'ward_spell_counter':return by('cast_start','damage','dot_tick').length;
  case 'anti_burst_window':return by('cast_start','damage','phase').length;
  case 'evasive_opening':return by('cast_start').length;
  default:return by('cast_start','damage','shield','status_apply','phase').length;
 }
}
/** Structural kit validation, not a signed DB proof. The caller must use the
 * actual persisted kit it already authenticated and the real engine trace. */
export function reviewOriginalForgeSetBossOpportunitiesV2(
 bossBase:CombatantDefinition,kit:PersistedEnemyKitV2,
 combat:CombatResult,
):OriginalSetBossOpportunityReviewV2{
 if(!bossBase||bossBase.team!=='enemies'||!bossBase.boss||
  !kit||kit.bossIds.length!==1||kit.bossIds[0]!==bossBase.id||
  !combat||!Array.isArray(combat.events)||!Array.isArray(combat.enemies)||
  !combat.enemies.some(e=>e.definition.id===bossBase.id))
  reject('must_be_single_verified_authored_boss');
 const proof=verifyPersistedEnemyKitsV2([bossBase],kit);
 const boss=proof.enemies[0];
 if(!boss||!boss.boss||
  !boss.tags?.some(t=>t.startsWith('enemy-v2:boss-profile:')))
  reject('original_authored_boss_missing');
 const originalSetDraft=reviewOriginalForgeSetBalanceDraftV2();
 const effects:AbilityEffect[]=[
  ...boss.abilities.flatMap(a=>a.effects),
  ...(boss.phases??[]).flatMap(p=>p.effects),
 ];
 const rows=originalSetDraft.families.map(set=>{
  const two=set.milestones.find(m=>m.requiredPieces===2);
  if(!two||two.status!=='PROPOSAL_NOT_COMBAT_APPLIED')
   throw Error('eq2_forge_set_boss_review_missing_unapproved_original_set_review');
  const channel=two.channel;
  const authored=isAuthoredOpportunity(channel,boss,effects);
  const relevantObservedEvents=authored?
   evidenceEvents(channel,boss,combat.events):0;
  const observed=authored&&relevantObservedEvents>0;
  const status:OriginalSetBossOpportunityStatusV2=!authored?
   'mechanic_not_authored':observed?
   'opportunity_observed_effect_unimplemented':'authored_not_observed';
  return {bossId:boss.id,originalForgeSetId:set.setId,
   proposedCounterplay:channel,authoredOpportunity:authored,
   observedOpportunity:observed,relevantObservedEvents,status,
   proposedTwoPiecePercent:two.proposedPercent,
   appliesInCombat:false as const,effectImplementationVerified:false as const,
   approvedForBalance:false as const,
  };
 });
 if(rows.length!==15||new Set(rows.map(row=>row.originalForgeSetId)).size!==15)
  reject('source_set_family_drift');
 return {
  scope:'ORIGINAL_FORGE_SET_VS_AUTHORED_BOSS_OPPORTUNITY_ONLY',
  bossId:boss.id,authoredBossAbilities:boss.abilities.length,
  authoredBossPhases:boss.phases?.length??0,
  recordedBossEvents:combat.events.filter(e=>e.actorId===boss.id).length,
  rows,
  mechanicNotAuthoredCount:rows.filter(r=>r.status==='mechanic_not_authored').length,
  authoredNotObservedCount:rows.filter(r=>r.status==='authored_not_observed').length,
  opportunityObservedCount:rows.filter(r=>r.status==='opportunity_observed_effect_unimplemented').length,
  actualSetEffectsApplied:0,canAuthorizeCombat:false,
  canGrantRewards:false,releaseApproved:false,
 };
}
