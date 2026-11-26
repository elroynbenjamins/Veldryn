import { clamp, defenseMitigation, damageAfterMitigation, hitChance, roleAdjustedAttackPower } from './calculations';
import { CombatRng } from './deterministic-rng';
import {applyEnemyV2Periodic,applyEnemyV2Modifier,enemyV2AllowedShieldAmount} from './enemy-v2-status-rules';
import {authorizeEnemyV2EngineExecution,type EnemyV2EngineAuthority} from './v2/enemy-engine-authority';
import {authorizeEquipmentV2TraitEngine,type EquipmentV2TraitEngineAuthority} from './v2/equipment-trait-engine-authority';
import {EquipmentTraitRuntimeV2} from './v2/equipment-trait-engine-runtime';
import {authorizeEq2PrivateHitQaV22,type Eq2PrivateHitAuthorityV22} from './v2/equipment-private-hit-qa-v22';
import {authorizeDungeonRewardEngineV2,type DungeonRewardEngineAuthorityV2,
 type DungeonRewardProcActionV2} from './v2/dungeon-reward-engine-v2';
import {initCombatResourceV2,awardCombatResourceV2,spendCombatResourceV2,consumeQueuedCombatBonusV2} from './v2/resource-runtime';
import {triggerCapstoneV2,type CapstoneContextV2,type CapstoneTriggerV2} from './v2/capstone-runtime';
import {
 triggerReactivePassiveV2,defensiveReactiveTriggerV2,outgoingReactiveMultiplierV2,
 incomingReactiveMultiplierV2,reactiveDamageFlatReductionV2,reactiveHasteV2,
 reactiveHealingMultiplierV2,reactiveShieldMultiplierV2,
 type ReactiveContextV2,type ReactiveTriggerV2,
} from './v2/reactive-passive-runtime';
import type { AbilityDefinition, AbilityEffect, CombatEvent, CombatGemStateSnapshot, CombatInput, CombatResult, CombatantDefinition, CombatantState, PersistentActorState } from './types';
import {living,hpPct,modifier,chooseEnemy,targetsFor,conditionOk} from './combat-state-query';
import {gemConsumeSupportChargeV1,gemEffectiveDefenseV1,gemEffectiveHasteV1,gemHealingMultiplierV1,gemIncomingDamageMultiplierV1,gemOnAbilityUsedV1,gemOnBossPhaseV1,gemOnBuffAppliedV1,gemOnDamageTakenV1,gemOnDebuffAppliedV1,gemOnDirectHealV1,gemOnDirectHitV1,gemOnKillV1,gemOnShieldAppliedV1,gemOutgoingDamageMultiplierV1,gemShieldMultiplierV1} from './gem-effects-v1';

function init(def: CombatantDefinition, carried?:PersistentActorState): CombatantState {
  const hp=Math.max(0,Math.min(def.stats.maxHp,carried?.hp??def.stats.maxHp));
  const downed=carried?.downed??false;
  return { definition:def, combatV2:initCombatResourceV2(def), hp, shield:0, alive:!downed&&hp>0, downed, threat:{}, cooldownReadyAt:{...(carried?.cooldownRemainingMs??{})}, nextBasicAt:carried?.basicAttackRemainingMs??0, periodic:[], modifiers:[], damageDone:0, healingDone:0, damageTaken:0, interrupts:0, triggeredPhases:[] };
}

const VISIBLE_GEM_STATE_TAGS=new Set([
  'gem:momentum','gem:critical_surge','gem:flow','gem:unyielding','gem:predator_boost','gem:opening_phase',
  'gem:retaliation_ready','gem:battle_offense_ready','gem:battle_support_ready','gem:damage_reduction',
  'gem:shared_resolve','gem:benediction_charge','gem:haste_bonus','gem:opportunist_ready',
]);

/** Named, server-only handoff for new V2 assembly callers. The old
 * positional API stays intact until all existing call sites are reconciled.
 * Future party Synchronization authorities require their own named field. */
export interface ServerCombatAuthoritiesV2 {
 readonly enemy?:EnemyV2EngineAuthority;
 readonly equipmentTrait?:EquipmentV2TraitEngineAuthority;
 readonly dungeonReward?:DungeonRewardEngineAuthorityV2;
 readonly privateHit?:Eq2PrivateHitAuthorityV22;
}
export function simulateCombatWithServerAuthoritiesV2(
 input:CombatInput,authorities:ServerCombatAuthoritiesV2,
):CombatResult{
 if(!authorities||typeof authorities!=='object'||Array.isArray(authorities)||
   Object.keys(authorities).some(key=>!['enemy','equipmentTrait','dungeonReward','privateHit'].includes(key)))
  throw Error('combat_v2_unknown_authority_channel');
 return simulateCombat(input,authorities.enemy,authorities.equipmentTrait,
  authorities.dungeonReward,authorities.privateHit);
}

/** Optional server-issued second parameter is never parsed from CombatInput JSON. */
export function simulateCombat(input: CombatInput, enemyV2Authority?:EnemyV2EngineAuthority, equipmentTraitAuthority?:EquipmentV2TraitEngineAuthority, dungeonRewardAuthority?:DungeonRewardEngineAuthorityV2, eq2PrivateHitAuthority?:Eq2PrivateHitAuthorityV22): CombatResult {
  if (!input.players.length || !input.enemies.length) throw new Error('combat_requires_both_teams');
  const enemyV2Effects=authorizeEnemyV2EngineExecution(input,enemyV2Authority);
  // No token -> no equipment trait runtime actions, preserving every legacy
  // and previously compiled V2 run. Exact-token validation is server-owned.
  const equipmentSources=authorizeEquipmentV2TraitEngine(input,equipmentTraitAuthority);
  const equipmentTraitRuntime=equipmentTraitAuthority
    ?new EquipmentTraitRuntimeV2(equipmentSources):undefined;
  const dungeonRewards=authorizeDungeonRewardEngineV2(input,dungeonRewardAuthority);
  if(eq2PrivateHitAuthority!==undefined&&(equipmentTraitAuthority!==undefined||dungeonRewardAuthority!==undefined))throw Error('eq2_private_hit_v22_mixed_authority');
  const eq2PrivateHit=authorizeEq2PrivateHitQaV22(input,eq2PrivateHitAuthority);
  const maxMs=input.maxDurationMs ?? 180_000; const tick=input.tickMs ?? 100; const mitigationConstant=input.mitigationConstant ?? 1200; const accuracyScale=input.accuracyScale ?? 1400;
  const players=input.players.map(def=>init(def,input.initialPlayerState?.[def.id])), enemies=input.enemies.map(def=>init(def)), all=[...players,...enemies];
  const v2Encounter=players.some(player=>Boolean(player.definition.combatV2));
  const rng=new CombatRng(input.seed); const events:CombatEvent[]=[{atMs:0,type:'combat_start'}];
  let runCapstone:(actor:CombatantState,kind:CapstoneTriggerV2,now:number,target?:CombatantState,ctx?:CapstoneContextV2)=>void=()=>{};
  let runReactive:(actor:CombatantState,kind:ReactiveTriggerV2,now:number,target?:CombatantState,ctx?:ReactiveContextV2)=>void=()=>{};
  const resource=(actor:CombatantState,kind:Parameters<typeof awardCombatResourceV2>[1],now:number,id:string)=>{
    const event=awardCombatResourceV2(actor,kind,now,id);
    if(event){events.push(event);runCapstone(actor,'gain',now);runReactive(actor,'gain',now);}
  };
  const spend=(actor:CombatantState,ability:AbilityDefinition,now:number)=>{
    const queued=consumeQueuedCombatBonusV2(actor,ability);
    const resolved=spendCombatResourceV2(actor,queued,now);
    if(resolved.event){events.push(resolved.event);
      const spent=Math.max(0,(resolved.event.resourceBefore??0)-(resolved.event.resourceAfter??0));
      runCapstone(actor,'spend',now,undefined,{spent});runReactive(actor,'spend',now,undefined,{spent});}
    if(actor.definition.combatV2?.capstoneId?.endsWith(':ritual_surge')&&ability.name==='Thunder Totem')
      actor.combatV2?.scheduledTotemAt.push(now+4000);
    return resolved.ability;
  };
  // Stable priority and phase ordering are immutable within one fight.
  // Build them once rather than sorting at every 100ms simulation tick.
  const abilitiesByActor=new Map(all.map(actor=>[actor,[...actor.definition.abilities].sort((a,b)=>b.priority-a.priority)] as const));
  const bosses=enemies.filter(actor=>actor.definition.boss);
  const phasesByBoss=new Map(bosses.map(boss=>[boss,[...(boss.definition.phases??[])].sort((a,b)=>b.hpPct-a.hpPct)] as const));

  let lastGemStateKey='[]';
  const visibleGemStates=(now:number):CombatGemStateSnapshot[]=>{
    const rows:CombatGemStateSnapshot[]=[];
    for(const state of all){
      const grouped=new Map<string,number[]>();
      for(const modifier of state.modifiers){
        if(modifier.kind!=='gem'||modifier.expiresAt<=now||!VISIBLE_GEM_STATE_TAGS.has(modifier.tag))continue;
        const expiries=grouped.get(modifier.tag)??[];expiries.push(modifier.expiresAt);grouped.set(modifier.tag,expiries);
      }
      for(const [tag,expiries] of grouped)rows.push({targetId:state.definition.id,tag,expiriesAtMs:expiries.sort((a,b)=>a-b)});
    }
    return rows.sort((a,b)=>a.targetId.localeCompare(b.targetId)||a.tag.localeCompare(b.tag));
  };
  const emitGemState=(now:number)=>{
    const gemStates=visibleGemStates(now),key=JSON.stringify(gemStates);
    if(key===lastGemStateKey)return;
    lastGemStateKey=key;events.push({atMs:now,type:'gem_state',gemStates});
  };

  const addThreat=(target:CombatantState, source:CombatantState, amount:number)=>{ if(target.definition.team==='enemies') target.threat[source.definition.id]=(target.threat[source.definition.id]||0)+amount; };
  // Hidden reward actions never re-enter direct damage, gem, passive or
  // equipment pipelines; they cannot generate another reward trigger.
  const applyDungeonRewardAction=(now:number,source:CombatantState,
    enemy:CombatantState,action:DungeonRewardProcActionV2)=>{
    const target=action.target==='self'?source:enemy;
    if(!target.alive)return;
    const id='V2_DUNGEON_REWARD:'+action.rewardId;
    if(action.kind==='secondary_damage'){
      if(target.definition.team!=='enemies'||source.definition.team!=='players')return;
      const bonus=Math.min(target.hp,Math.max(0,action.amount));
      if(bonus<=0)return;
      target.hp-=bonus;target.damageTaken+=bonus;source.damageDone+=bonus;
      events.push({atMs:now,type:'dungeon_reward_trigger',actorId:source.definition.id,
        targetId:target.definition.id,abilityId:id,amount:Number(bonus.toFixed(2)),
        detail:'secondary_damage_no_recursive_trigger'});
      return;
    }
    if(action.kind==='bleed'){
      if(target.definition.team!=='enemies'||source.definition.team!=='players'||action.amount<=0)return;
      target.periodic=target.periodic.filter(p=>!(
        p.effectId===id&&p.sourceId===source.definition.id));
      target.periodic.push({sourceId:source.definition.id,effectId:id,kind:'dot',
        coeff:0,flat:action.amount,damageType:'physical',tag:'bleed',
        nextTickAt:now+(action.tickMs??1000),expiresAt:now+(action.durationMs??3000),
        tickMs:action.tickMs??1000});
      events.push({atMs:now,type:'status_apply',actorId:source.definition.id,
        targetId:target.definition.id,abilityId:id,statusKind:'dot',statusTag:'bleed',
        expiresAtMs:now+(action.durationMs??3000)});
    }else{
      if(!action.tag||!action.durationMs)return;
      target.modifiers=target.modifiers.filter(m=>m.v2CapstoneId!==id||m.tag!==action.tag);
      target.modifiers.push({sourceId:source.definition.id,tag:action.tag,
        value:action.amount,kind:action.kind==='buff'?'buff':'debuff',
        createdAt:now,expiresAt:now+action.durationMs,v2CapstoneId:id});
      events.push({atMs:now,type:'status_apply',actorId:source.definition.id,
        targetId:target.definition.id,abilityId:id,
        statusKind:action.kind==='buff'?'buff':'debuff',statusTag:action.tag,
        expiresAtMs:now+action.durationMs});
    }
    events.push({atMs:now,type:'dungeon_reward_trigger',actorId:source.definition.id,
      targetId:target.definition.id,abilityId:id,detail:'original_event_only'});
  };
  const applyDamage=(now:number, source:CombatantState, target:CombatantState, effect:AbilityEffect, abilityId:string, eventType:'damage'|'dot_tick'='damage')=>{
    if(!target.alive)return;
    // Tactical mark is a percentage-point accuracy window, not a raw accuracy-rating increase.
    const v2Evasion=target.definition.tags?.includes('combat-v2')?modifier(target,'evasion',now):0;
    const sourceGear=v2Encounter?source.definition.combatV2?.equipmentEffects:undefined;
    const targetGear=v2Encounter?target.definition.combatV2?.equipmentEffects:undefined;
    const hc=clamp(hitChance(source.definition.stats.accuracy,
      target.definition.stats.evasion+v2Evasion,accuracyScale)+
      (sourceGear?.accuracyPp??0)-(targetGear?.evasionPp??0),0,1);
    if(rng.next(`${now}:${source.definition.id}:${abilityId}:hit`)>hc){if(eventType==='damage'){if(source.definition.team==='players'){equipmentTraitRuntime?.miss(source.definition.id,abilityId);eq2PrivateHit?.miss(source.definition.id,abilityId);}events.push({atMs:now,type:'miss',actorId:source.definition.id,targetId:target.definition.id,abilityId});if(source.definition.team==='enemies'){resource(target,'evade',now,abilityId);
      if(!abilityId.startsWith('V2_')){
        runCapstone(target,'evade',now,source);runReactive(target,'evade',now,source);
      }}}return;}
    // Authored Enemy/Boss 2.0 kits need not advertise the player-only
    // combat-v2 tag. A signed dungeon reward may still weaken their defense.
    const v2Defense=v2Encounter&&(
      target.definition.tags?.includes('combat-v2')||
      (Boolean(dungeonRewards)&&target.definition.team==='enemies'))
      ?Math.max(.7,Math.min(1.30,1+modifier(target,'defense_pct',now))):1;
    const authoredPenetration=v2Encounter&&source.definition.combatV2?
      clamp((effect.penetrationPct??0)+(sourceGear?.penetrationPp??0),0,1):0;
    const eq2TimedDefense=eq2PrivateHit&&effect.damageType!==undefined&&effect.damageType!=='true'
      ?eq2PrivateHit.timedStat(target.definition.id,now,'defense'):undefined;
    const effectiveDefense=effect.damageType==='true'?0:gemEffectiveDefenseV1(target,now)*v2Defense*(1-authoredPenetration);
    const mit=effect.damageType==='true'?0:defenseMitigation(effectiveDefense*(1+(eq2TimedDefense?.pct??0)/100),mitigationConstant);
    if(eq2TimedDefense?.pct&&mit>defenseMitigation(effectiveDefense,mitigationConstant))
      events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:source.definition.id,
        abilityId:'V2_QA_TIMED:'+eq2TimedDefense.ids.join('+'),amount:eq2TimedDefense.pct,detail:'private_qa_timed_defense_used'});
    const crit=rng.next(`${now}:${source.definition.id}:${abilityId}:crit`)<clamp(source.definition.stats.critChance+modifier(source,'crit',now)+modifier(target,'crit_taken',now),0,.75);
    const qmodeStrike=input.enemyDamageProfile==='qmode-v1'&&source.definition.team==='enemies'&&target.definition.team==='players'&&eventType==='damage';
    // Preserve all legacy RNG draws for Live, ordinary hunts and in-flight runs.
    // New Q-Mode has a wider hit spread around the legacy average and a rare heavy blow
    // noncritical hits becomes a heavier blow. DoTs never roll the burst.
    // The legacy CombatRng returns [0, .5) with its existing portable
    // denominator. Scale Q-Mode-only draws by two to reach the intended
    // probabilities; changing that RNG globally would invalidate old replays.
    const varianceRoll=rng.next(`${now}:${abilityId}:var`);
    const variance=qmodeStrike?.925+varianceRoll*.20:.95+varianceRoll*.10;
    const heavyHit=qmodeStrike&&!crit&&rng.next(`${now}:${source.definition.id}:${target.definition.id}:${abilityId}:heavy`)*2<.04;
    const roleAttack=roleAdjustedAttackPower({team:source.definition.team,role:source.definition.role,attackPower:source.definition.stats.attackPower,defense:source.definition.stats.defense,maxHp:source.definition.stats.maxHp,healingPower:source.definition.stats.healingPower});
    const isMarked=v2Encounter&&Boolean(source.definition.combatV2)&&target.modifiers.some(m=>
      m.kind==='debuff'&&m.sourceId===source.definition.id&&m.tag==='damage_taken'&&m.expiresAt>now);
    const critBoost=v2Encounter&&Boolean(source.definition.combatV2)?clamp(effect.critMultiplierBonus??0,0,.50)+
      (crit&&isMarked?clamp(effect.criticalDamageBonusVsMarked??0,0,.20):0):0;
    let raw=damageAfterMitigation(roleAttack,effect.coeff??0,mit,variance,crit,source.definition.stats.critMultiplier+critBoost)+(effect.flat??0);
    if(heavyHit)raw*=1.10;
    raw*=source.definition.alchemyModifiers?.outgoing??1; raw*=target.definition.alchemyModifiers?.incoming??1;
    raw*=gemOutgoingDamageMultiplierV1(source,target,now,abilityId,eventType==='dot_tick'); raw*=Math.max(.1,1+modifier(source,'damage_done',now)); raw*=Math.max(.1,1+modifier(target,'damage_taken',now)); raw*=gemIncomingDamageMultiplierV1(target,now);
    if(hpPct(target)<clamp(effect.executeBelowHpPct??0,0,1))raw*=1+clamp(effect.executeBonus??0,0,1);
    if(effect.bonusVsDebuffed&&target.modifiers.some(m=>m.kind==='debuff'&&m.expiresAt>now))raw*=1+clamp(effect.bonusVsDebuffed,0,.20);
    if(isMarked&&crit)raw*=1+clamp(effect.criticalHitBonusVsMarked??0,0,.15);
    if(v2Encounter&&source.definition.combatV2&&hpPct(target)<clamp(effect.additionalExecuteBelowHpPct??0,0,.5))
      raw*=1+clamp(effect.additionalExecuteBonus??0,0,target.definition.boss?.08:.15);
    if(v2Encounter&&eventType==='damage'&&!abilityId.startsWith('V2_CAPSTONE')&&
       source.definition.combatV2?.capstoneId?.endsWith(':final_verdict')&&hpPct(target)<.30)
      raw*=target.definition.boss?1.08:1.18;
    // Exact Forge Ability Damage applies only to direct original player class abilities.
    // BASIC attacks, DoTs, trait/gem echoes and capstones cannot borrow this roll.
    if(v2Encounter&&eventType==='damage'&&source.definition.combatV2&&
       source.definition.team==='players'&&abilityId!=='BASIC'&&
       !abilityId.startsWith('V2_')&&
       source.definition.abilities.some(a=>a.id===abilityId))
      raw*=1+clamp(sourceGear?.abilityDamagePct??0,0,1);
    const hpBeforeReactive=hpPct(target);
    if(v2Encounter&&eventType==='damage'&&!abilityId.startsWith('V2_')){
      if(source.combatV2)raw*=outgoingReactiveMultiplierV2(source,target,now);
      if(target.combatV2){
        raw*=incomingReactiveMultiplierV2(target,source,now);
        raw=Math.max(0,raw-reactiveDamageFlatReductionV2(target,raw));
      }
    }
    // V2 Rupture consumes one own applied DoT and converts a bounded portion of
    // its remaining strength to this direct hit. The consumed effect cannot
    // tick again, and a boss has an additional cap.
    if(eventType==='damage'&&source.combatV2&&
       !abilityId.startsWith('V2_')&&(effect.consumeOwnedDotFraction??0)>0){
      const i=target.periodic.findIndex(p=>p.kind==='dot'&&p.sourceId===source.definition.id&&
        p.expiresAt>now&&p.nextTickAt<=p.expiresAt);
      if(i>=0){
        const [dot]=target.periodic.splice(i,1);
        const ticks=Math.max(0,Math.floor((dot.expiresAt-dot.nextTickAt)/Math.max(1,dot.tickMs))+1);
        const fraction=clamp(effect.consumeOwnedDotFraction??0,0,.5);
        const rupture=Math.min(source.definition.stats.attackPower*(target.definition.boss?.35:.65),
          source.definition.stats.attackPower*Math.max(0,dot.coeff)*ticks*fraction);
        raw+=rupture;
        events.push({atMs:now,type:'status_remove',actorId:source.definition.id,
          targetId:target.definition.id,abilityId,statusKind:'dot',
          statusTag:dot.tag??'dot',detail:'combat_v2_rupture'});
      }
    }
    // A server-authored magical Ward applies to all non-physical,
    // non-true damage, including DoT ticks. Physical and true bypass it.
    if(v2Encounter&&targetGear&&effect.damageType&&
       effect.damageType!=='physical'&&effect.damageType!=='true'){
      raw*=1-clamp(targetGear.wardPp,0,1);
    }
    // Server-verified Equipment 2.0 action bonuses apply only to original
    // direct player hits. No periodic, gem, capstone, companion or trait
    // secondary damage can enter these hooks.
    if(eventType==='damage'&&source.definition.team==='players'&&
       source.combatV2&&equipmentTraitRuntime){
      const adjusted=equipmentTraitRuntime.directHit(now,source.definition.id,
        target.definition.id,abilityId,raw);
      raw=adjusted.damage;
      if(adjusted.trigger)events.push({atMs:now,type:'equipment_trait_trigger',
        actorId:source.definition.id,targetId:target.definition.id,
        abilityId:'V2_EQUIPMENT_TRAIT:'+adjusted.trigger.traitId,
        amount:Math.round(adjusted.trigger.amount*100)/100,detail:'original_direct_hit_only'});
    }
    // Private QA only. Receipt object is shared across pre-hit and post-HP
    // phases, never exposed in CombatInput or reused by secondary effects.
    const eq2Event=eq2PrivateHit&&source.definition.team==='players'&&target.definition.team==='enemies'?{
      now,actorId:source.definition.id,targetId:target.definition.id,abilityId,
      originalClassAbility:source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='damage')),
      direct:eventType==='damage',physical:effect.damageType==='physical',nontrue:effect.damageType!==undefined&&effect.damageType!=='true',
      sourceAlive:source.alive,targetAlive:target.alive,targetHp:target.hp,targetMaxHp:target.definition.stats.maxHp,shield:target.shield,raw
    }:undefined;
    if(eq2PrivateHit&&eq2Event){
      const adjusted=eq2PrivateHit.beforeDirectHit(eq2Event);
      if(adjusted.activated.length){
        const extra=Math.max(0,Math.min(target.hp,adjusted.raw-target.shield)-Math.min(target.hp,raw-target.shield));
        raw=adjusted.raw;
        events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
          abilityId:'V2_QA_HIT:'+adjusted.activated.join('+'),amount:Number(extra.toFixed(2)),detail:'private_qa_current_hit_only'});
      }
    }
    const eq2Incoming=eq2PrivateHit&&source.definition.team==='enemies'&&target.definition.team==='players'?{
      now,actorId:source.definition.id,targetId:target.definition.id,abilityId,
      mitigated:mit>0,
      originalEnemyAbility:abilityId==='BASIC'||(source.definition.abilities.some(a=>a.id===abilityId)&&
        !(source.definition.phases??[]).some(p=>p.id===abilityId)),
      direct:eventType==='damage',physical:effect.damageType==='physical',nontrue:effect.damageType!==undefined&&effect.damageType!=='true',
      sourceAlive:source.alive,targetAlive:target.alive,targetHp:target.hp,targetMaxHp:target.definition.stats.maxHp,shield:target.shield+eq2PrivateHit.shieldAvailable(target.definition.id,now),raw
    }:undefined;
    if(eq2PrivateHit&&eq2Incoming){
      const adjusted=eq2PrivateHit.beforeIncomingHit(eq2Incoming);
      if(adjusted.activated.length){
        const prevented=Math.max(0,Math.min(target.hp,Math.max(0,raw-eq2Incoming.shield))-Math.min(target.hp,Math.max(0,adjusted.raw-eq2Incoming.shield)));
        raw=adjusted.raw;
        events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:source.definition.id,
          abilityId:'V2_QA_DEFENSE:'+adjusted.activated.join('+'),amount:Number(prevented.toFixed(2)),detail:'private_qa_incoming_reduction'});
      }
    }
    // Poison applied as a true-damage DoT attacks HP directly, regardless of shields.
    // Direct true damage retains its legacy shield interaction.
    const bypassShield=eventType==='dot_tick'&&effect.damageType==='true';
    const absorbed=bypassShield?0:Math.min(target.shield,raw); target.shield-=absorbed;
    // The ordinary shield pool/reflect ledger is untouched by equipment
    // shield consumption. Only residual nontrue original enemy damage qualifies.
    const eq2Absorption=eq2PrivateHit&&eq2Incoming?eq2PrivateHit.absorbShield(eq2Incoming,Math.max(0,raw-absorbed)):undefined;
    if(eq2Absorption){
      events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:source.definition.id,
        abilityId:'V2_QA_SHIELD:'+eq2Absorption.id,amount:eq2Absorption.amount,detail:'private_qa_shield_absorbed'});
      if(eq2Absorption.broken)events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:source.definition.id,
        abilityId:'V2_QA_SHIELD:'+eq2Absorption.id,detail:'private_qa_shield_depleted'});
    }
    const residual=raw-absorbed-(eq2Absorption?.amount??0);
    const dealt=Math.max(0,source.combatV2&&eventType==='damage'
      ?Math.min(target.hp,residual):residual);
    target.hp=Math.max(0,target.hp-dealt); source.damageDone+=dealt; target.damageTaken+=dealt;
    if(eq2PrivateHit&&eq2Incoming){
      for(const id of eq2PrivateHit.afterIncomingHit(eq2Incoming,Math.max(0,eq2Incoming.targetHp-target.hp)))
        events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:source.definition.id,
          abilityId:'V2_QA_DEFENSE_EARN:'+id,detail:'private_qa_defense_earned'});
      const grant=eq2PrivateHit.afterShieldHit(eq2Incoming,Math.max(0,eq2Incoming.targetHp-target.hp));
      if(grant){
        if(grant.replaced)events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,
          abilityId:'V2_QA_SHIELD:'+grant.replaced.id,amount:grant.replaced.remaining,detail:'private_qa_shield_replaced'});
        events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,targetId:target.definition.id,
          abilityId:'V2_QA_SHIELD:'+grant.id,amount:grant.amount,expiresAtMs:grant.expiresAt,detail:'private_qa_shield_granted'});
      }
    }
    if(eq2PrivateHit&&eq2Event){
      for(const id of eq2PrivateHit.afterDirectHit(eq2Event,dealt))
        events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
          abilityId:'V2_QA_CHARGE:'+id,detail:'private_qa_charge_earned'});
    }
    // Echoing Strike is the only extra direct-skill damage hook in this pass.
    // It is applied ONCE as tagged secondary HP loss, not via applyDamage,
    // so no crit, lifesteal, Ward or gem/trait reentry is possible.
    if(equipmentTraitRuntime&&eventType==='damage'&&source.definition.team==='players'&&
      target.definition.team==='enemies'&&dealt>0&&target.alive&&target.hp>0){
      const echo=equipmentTraitRuntime.afterDirectSkillHit(now,source.definition.id,
        target.definition.id,abilityId,dealt,source.definition.stats.attackPower);
      if(echo){
        const bonus=Math.min(target.hp,echo.amount);
        if(bonus>0){target.hp-=bonus;source.damageDone+=bonus;target.damageTaken+=bonus;
          events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,
            targetId:target.definition.id,abilityId:'V2_EQUIPMENT_TRAIT:echoing_strike',
            amount:Math.round(bonus*100)/100,detail:'secondary_damage_no_recursive_trigger'});
        }
      }
    }
    // Lifesteal is based on real HP damage only: shielding, overkill and
    // reflected/self-generated procs can never inflate the heal.
    if(eventType==='damage'&&source.combatV2&&!abilityId.startsWith('V2_')&&
      (effect.lifestealPct??0)>0&&dealt>0&&source.alive){
      const healed=Math.min(source.definition.stats.maxHp-source.hp,
        dealt*clamp(effect.lifestealPct??0,0,.20));
      if(healed>0){source.hp+=healed;source.healingDone+=healed;
        events.push({atMs:now,type:'heal',actorId:source.definition.id,targetId:source.definition.id,
          abilityId:'V2_LIFESTEAL:'+abilityId,amount:Number(healed.toFixed(2))});}
    }
    gemOnDamageTakenV1(now,target,dealt);emitGemState(now);
    if(eventType==='damage'){const proc=gemOnDirectHitV1(now,source,target,abilityId,crit);emitGemState(now);if(proc.selfHeal>0&&source.alive){const amount=Math.min(source.definition.stats.maxHp-source.hp,source.definition.stats.maxHp*proc.selfHeal);source.hp+=amount;if(amount>0)events.push({atMs:now,type:'heal',actorId:source.definition.id,targetId:source.definition.id,abilityId:'GEM_RETALIATION',amount:Number(amount.toFixed(2))});}}
    addThreat(target,source,dealt*(effect.threatMultiplier??1)); events.push({atMs:now,type:eventType,actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(dealt.toFixed(2)),...(eventType==='damage'?{critical:crit}:{}),...(heavyHit?{detail:'heavy_hit'}:{}),...(absorbed>0?{absorbed:Number(absorbed.toFixed(2))}:{})});
    // Hidden runtime is gated by an exact signed reward token and original
    // ability provenance. Secondary effects never call this path recursively.
    if(dungeonRewards&&eventType==='damage'&&dealt>0&&source.alive&&target.alive&&
      source.definition.team==='players'&&target.definition.team==='enemies'&&
      target.hp>0&&(abilityId==='BASIC'||source.definition.abilities.some(a=>a.id===abilityId))&&
      !abilityId.startsWith('V2_')){
      for(const action of dungeonRewards.afterOriginalDirectHit({now,
        sourceId:source.definition.id,targetId:target.definition.id,abilityId,
        critical:crit,actualHpDamage:dealt,attackPower:source.definition.stats.attackPower,
        targetMaxHp:target.definition.stats.maxHp,boss:Boolean(target.definition.boss)}))
        applyDungeonRewardAction(now,source,target,action);
    }
    if(dungeonRewards&&eventType==='damage'&&dealt>0&&target.alive&&target.hp>0&&
      source.definition.team==='enemies'&&target.definition.team==='players'&&
      (abilityId==='BASIC'||source.definition.abilities.some(a=>a.id===abilityId))&&
      !(source.definition.phases??[]).some(p=>p.id===abilityId)&&
      !abilityId.startsWith('V2_')){
      for(const action of dungeonRewards.afterOriginalEnemyHit({now,
        sourceId:source.definition.id,targetId:target.definition.id,abilityId,
        hpBeforePct:hpBeforeReactive,hpAfterPct:hpPct(target),actualHpDamage:dealt,
        boss:Boolean(source.definition.boss)}))
        applyDungeonRewardAction(now,target,source,action);
    }
    if(dealt>0){
      if(source.definition.team==='players'){
        resource(source,eventType==='dot_tick'?'periodic_hit':'direct_hit',now,abilityId);
        if(eventType==='damage'&&!abilityId.startsWith('V2_')){
          runCapstone(source,'hit',now,target);
          runReactive(source,'hit',now,target,{critical:crit,
            abilityName:source.definition.abilities.find(a=>a.id===abilityId)?.name??'BASIC'});
          const v2=source.combatV2;
          if(source.definition.combatV2?.capstoneId?.endsWith(':endless_weave')&&v2&&abilityId!=='BASIC'){
            v2.procCounters.spell_hits=(v2.procCounters.spell_hits??0)+1;
            if(v2.procCounters.spell_hits%4===0){
              const dot=target.periodic.find(p=>p.kind==='dot'&&p.sourceId===source.definition.id&&!p.extendedV2);
              if(dot){dot.expiresAt+=2000;dot.extendedV2=true;
                events.push({atMs:now,type:'capstone_trigger',actorId:source.definition.id,targetId:target.definition.id,
                  abilityId:source.definition.combatV2.capstoneId,detail:'extend_dot_2000ms'});}
            }
          }
        }
      }
      if(target.definition.team==='players'){
        resource(target,'damage_taken',now,abilityId);
        if(eventType==='damage'&&!abilityId.startsWith('V2_'))
          runReactive(target,'damage_taken',now,source,{amount:dealt,previousHpPct:hpBeforeReactive});
      }
    }
    if(absorbed>0&&target.definition.team==='players')resource(target,'shield_absorb',now,abilityId);
    // Equipment 2.0 Reflect Damage is separate from legacy reflective shields:
    // one original enemy direct hit, HP actually lost, surviving defender,
    // no unavoidable boss phase/telegraph, no proc chain or reflected hit.
    if(equipmentTraitRuntime&&eventType==='damage'&&
      source.definition.team==='enemies'&&target.definition.team==='players'&&
      source.alive&&target.alive&&target.hp>0&&dealt>0&&
      !(source.definition.phases??[]).some(phase=>phase.id===abilityId)&&
      // Until every boss cast carries a signed avoidable-hit tag, only boss
      // basic attacks may generate equipment reflection. Never cheese telegraphs.
      (!source.definition.boss||abilityId==='BASIC')&&
      !abilityId.startsWith('V2_')&&!abilityId.startsWith('COMPANION_REFLECT')){
      const outcome=equipmentTraitRuntime.retaliation(now,target.definition.id,
        source.definition.id,dealt,target.definition.stats.maxHp,
        source.definition.stats.maxHp,Boolean(source.definition.boss));
      if(outcome){
        const bonus=Math.min(source.hp,outcome.amount);
        if(bonus>0){source.hp-=bonus;source.damageTaken+=bonus;target.damageDone+=bonus;
          events.push({atMs:now,type:'equipment_trait_trigger',actorId:target.definition.id,
            targetId:source.definition.id,abilityId:'V2_EQUIPMENT_TRAIT:'+outcome.traitId,
            amount:Math.round(bonus*100)/100,detail:'retaliation_no_recursive_trigger'});
          if(source.hp<=0&&source.alive){source.alive=false;
            events.push({atMs:now,type:'death',targetId:source.definition.id,
              actorId:target.definition.id,abilityId:'V2_EQUIPMENT_REFLECT'});}
        }
      }
    }
    // Reflect only damage absorbed by the shield that granted this effect. Direct
    // reflection cannot trigger another shield reflection or recurse indefinitely.
    let reflectable=absorbed;
    for(const shield of target.reflectiveShields??[]){
      const used=Math.min(reflectable,shield.remaining);shield.remaining-=used;reflectable-=used;
      const owner=all.find(a=>a.definition.id===shield.sourceId);if(!used||!owner||!source.alive||source===target)continue;
      const reflected=Math.min(source.hp,used*shield.rate);source.hp-=reflected;source.damageTaken+=reflected;owner.damageDone+=reflected;
      events.push({atMs:now,type:'damage',actorId:owner.definition.id,targetId:source.definition.id,abilityId:'COMPANION_REFLECT',amount:Number(reflected.toFixed(2))});
      if(source.hp<=0){source.alive=false;source.downed=source.definition.team==='players';events.push({atMs:now,type:source.downed?'down':'death',targetId:source.definition.id,actorId:owner.definition.id,abilityId:'COMPANION_REFLECT'});}
    }
    if(target.reflectiveShields)target.reflectiveShields=target.reflectiveShields.filter(s=>s.remaining>0);
    if(target.hp<=0&&target.alive){gemOnKillV1(now,source,target);emitGemState(now);target.alive=false;target.downed=target.definition.team==='players';events.push({atMs:now,type:target.downed?'down':'death',targetId:target.definition.id,actorId:source.definition.id,abilityId});
      if(source.combatV2&&target.definition.team==='enemies'&&!abilityId.startsWith('V2_'))
        runReactive(source,'kill',now,target);
    }
  };
  const applyHeal=(now:number, source:CombatantState,target:CombatantState,effect:AbilityEffect,abilityId:string,eventType:'heal'|'hot_tick'='heal')=>{ if(!target.alive)return; const direct=eventType==='heal',sourceMult=direct?gemHealingMultiplierV1(source,now):1,receivedMult=Math.max(0,1+modifier(target,'healing_received',now)); const v2HealBonus=v2Encounter&&effect.healBelowHpPct!==undefined&&hpPct(target)<effect.healBelowHpPct
      ?1+clamp(effect.healBonus??0,0,.40):1;
    // Original Forge Healing Power boosts authored class heals and class HoTs
    // only, not shields, potion/leech/trait or GEM secondary effects.
    const authoredClassHeal=v2Encounter&&source.definition.team==='players'&&
      Boolean(source.definition.combatV2)&&
      source.definition.abilities.some(a=>a.id===abilityId);
    const forgeHealMultiplier=authoredClassHeal?
      1+clamp(source.definition.combatV2?.equipmentEffects?.forgeHealingPowerPct??0,0,1):1;
    const hpBeforeHeal=target.hp;
    const amount=Math.max(0,(source.definition.stats.healingPower*(effect.coeff??0)+(effect.flat??0))*sourceMult*receivedMult*(source.definition.alchemyModifiers?.healing??1)*v2HealBonus*
      (direct&&source.combatV2?reactiveHealingMultiplierV2(source,target,now):1)*
      forgeHealMultiplier); const actual=Math.min(amount,target.definition.stats.maxHp-target.hp); target.hp+=actual; source.healingDone+=actual;
    if(eq2PrivateHit&&direct&&actual>0&&source.definition.team==='players'&&target.definition.team==='players'){
      const earned=eq2PrivateHit.afterEffectiveHeal({now,actorId:source.definition.id,targetId:target.definition.id,abilityId,
        originalClassHeal:authoredClassHeal&&source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='heal')),actualHeal:actual});
      for(const id of earned)events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
        abilityId:'V2_QA_TIMED_EARN:'+id,detail:'private_qa_timed_heal_earned'});
      const supportGrants=eq2PrivateHit.afterSupportHeal({now,actorId:source.definition.id,targetId:target.definition.id,abilityId,
        originalClassHeal:authoredClassHeal&&source.definition.abilities.some(a=>a.id===abilityId&&a.effects.some(e=>e.kind==='heal')),
        direct,sourceAlive:source.alive,targetAlive:target.alive,targetHpBefore:hpBeforeHeal,targetMaxHp:target.definition.stats.maxHp,actualHeal:actual});
      for(const grant of supportGrants){
        if(grant.channel==='shield'){
          if(grant.replaced)events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
            abilityId:'V2_QA_SHIELD:'+grant.replaced.id,amount:grant.replaced.remaining,detail:'private_qa_shield_replaced'});
          events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
            abilityId:'V2_QA_SHIELD:'+grant.id,amount:grant.amount,expiresAtMs:grant.expiresAt,detail:'private_qa_shield_granted'});
        }else events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,targetId:target.definition.id,
          abilityId:'V2_QA_TIMED_EARN:'+grant.id,amount:grant.pct,expiresAtMs:grant.expiresAt,detail:'private_qa_support_defense_earned'});
      }
    }
    if(actual>0&&direct&&source.definition.team==='players'){
      resource(source,'effective_heal',now,abilityId);
      if(!abilityId.startsWith('V2_'))runCapstone(source,'heal',now,target,{amount:actual,healedAlly:source!==target});
    }
    events.push({atMs:now,type:eventType,actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(actual.toFixed(2))});
    // Only original effective direct ally class-heals can trigger these
    // secondary effects. Apply them outside applyHeal to avoid recursive
    // gem, class passive, resource, or other equipment trait hooks.
    if(equipmentTraitRuntime&&direct&&actual>0&&source!==target&&
      source.definition.team==='players'&&target.definition.team==='players'&&
      !abilityId.startsWith('V2_')&&!abilityId.startsWith('GEM_')){
      const other=players.filter(x=>x.alive&&x!==source&&x!==target&&
        x.definition.stats.maxHp>x.hp)
        .sort((a,b)=>a.hp/a.definition.stats.maxHp-b.hp/b.definition.stats.maxHp||
          a.definition.id.localeCompare(b.definition.id))[0];
      if(other){
        const actions=equipmentTraitRuntime.afterDirectAllyHeal(now,source.definition.id,
          target.definition.id,other.definition.id,actual,other.definition.stats.maxHp-other.hp);
        for(const action of actions){
          if(action.effect==='secondary_heal'){
            const healed=Math.min(action.amount,other.definition.stats.maxHp-other.hp);
            if(healed>0){other.hp+=healed;source.healingDone+=healed;
              events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,
                targetId:other.definition.id,abilityId:'V2_EQUIPMENT_TRAIT:mending_echo',
                amount:Number(healed.toFixed(2)),detail:'secondary_heal_no_recursive_trigger'});}
          }else if(action.effect==='secondary_hot'){
            const total=action.amount;
            other.periodic=other.periodic.filter(e=>!(e.kind==='hot'&&
              e.sourceId===source.definition.id&&e.effectId==='V2_EQUIPMENT_TRAIT:restorative_bloom'));
            other.periodic.push({sourceId:source.definition.id,
              effectId:'V2_EQUIPMENT_TRAIT:restorative_bloom',kind:'hot',
              coeff:0,flat:total/4,nextTickAt:now+1000,expiresAt:now+4000,tickMs:1000});
            events.push({atMs:now,type:'equipment_trait_trigger',actorId:source.definition.id,
              targetId:other.definition.id,abilityId:'V2_EQUIPMENT_TRAIT:restorative_bloom',
              amount:Number(total.toFixed(2)),detail:'nonstacking_hot_no_recursive_trigger'});
          }
        }
      }
    }
    if(direct){const post=gemOnDirectHealV1(now,source,target,amount,actual);if(post.mercyBarrier>0){target.shield+=post.mercyBarrier;events.push({atMs:now,type:'shield',actorId:source.definition.id,targetId:target.definition.id,abilityId:'GEM_MERCY',amount:Number(post.mercyBarrier.toFixed(2))});}if(post.renewalTotal>0){const existing=target.periodic.filter(p=>p.effectId==='GEM_RENEWAL'&&p.sourceId===source.definition.id).sort((a,b)=>a.expiresAt-b.expiresAt);while(existing.length>=post.renewalMax){const remove=existing.shift();if(remove)target.periodic=target.periodic.filter(p=>p!==remove);}const tickMs=2000,ticks=Math.max(1,Math.floor(post.renewalDuration/tickMs));target.periodic.push({sourceId:source.definition.id,effectId:'GEM_RENEWAL',kind:'hot',coeff:0,flat:post.renewalTotal/ticks,nextTickAt:now+tickMs,expiresAt:now+post.renewalDuration,tickMs});}gemConsumeSupportChargeV1(now,source);emitGemState(now);}
    enemies.forEach(e=>{if(e.alive)addThreat(e,source,actual*.5*(effect.threatMultiplier??1));}); };
  // Forge Tenacity modifies only ordinary hostile abilities on Combat 2.0
  // actors; boss-exclusive status locks, authored phases, buffs and HoTs
  // remain immune until a distinct approved mechanic tag exists.
  const forgeStatusDuration=(source:CombatantState,target:CombatantState,
      abilityId:string,baseDurationMs:number)=>{
    if(!v2Encounter||source.definition.team!=='enemies'||source.definition.boss||
      target.definition.team!=='players'||!target.definition.combatV2||
      !source.definition.abilities.some(a=>a.id===abilityId))
      return baseDurationMs;
    const tenacity=clamp(target.definition.combatV2.equipmentEffects?.tenacityPp??0,0,1);
    return Math.max(1,Math.round(baseDurationMs*(1-tenacity)));
  };
  const applyEffect=(now:number, source:CombatantState,target:CombatantState,effect:AbilityEffect,abilityId:string)=>{
    if(effect.kind==='damage')return applyDamage(now,source,target,effect,abilityId);
    if(effect.kind==='heal')return applyHeal(now,source,target,effect,abilityId);
    if(effect.kind==='shield'){const requested=Math.max(0,(source.definition.stats.healingPower*(effect.coeff??0)+(effect.flat??0))*gemShieldMultiplierV1(source,now)*(source.definition.alchemyModifiers?.shielding??1)*
      (source.combatV2?reactiveShieldMultiplierV2(source,target,now):1)*
      (v2Encounter?1+clamp(source.definition.combatV2?.equipmentEffects?.shieldStrengthPct??0,0,1):1));
      const amt=enemyV2Effects&&target.definition.team==='enemies'
        ?enemyV2AllowedShieldAmount(target.definition.stats.maxHp,target.shield,requested):requested;
      target.shield+=amt;if(effect.shieldReflectPct&&amt>0)(target.reflectiveShields??=[]).push({remaining:amt,rate:clamp(effect.shieldReflectPct,0,.5),sourceId:source.definition.id});gemOnShieldAppliedV1(now,source,target);gemConsumeSupportChargeV1(now,source);emitGemState(now);events.push({atMs:now,type:'shield',actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(amt.toFixed(2))});if(amt>0&&source.definition.team==='players'){
      resource(source,'shield_granted',now,abilityId);
      if(!abilityId.startsWith('V2_CAPSTONE')){
        const ability=source.definition.abilities.find(a=>a.id===abilityId);
        const isPartyShield=effect.target==='all_allies'||ability?.target==='all_allies';
        runCapstone(source,'shield',now,target,{amount:amt,isPartyShield});
      }
    }return;}
    if(effect.kind==='dot'||effect.kind==='hot'){
      const isHex=effect.kind==='dot'&&
        (effect.damageType==='shadow'||effect.damageType==='arcane'||effect.damageType==='nature');
      const hexBonus=isHex&&v2Encounter?
        clamp(source.definition.combatV2?.equipmentEffects?.hexPotencyPct??0,0,1):0;
      const expiresAt=now+(effect.kind==='dot'?
        forgeStatusDuration(source,target,abilityId,effect.durationMs??3000):
        effect.durationMs??3000);
      const periodic:CombatantState['periodic'][number]={sourceId:source.definition.id,effectId:abilityId,kind:effect.kind,
        coeff:(effect.coeff??0)*(1+hexBonus),flat:(effect.flat??0)*(1+hexBonus),
        damageType:effect.damageType,tag:effect.tag??effect.damageType??effect.kind,
        nextTickAt:now+(effect.tickMs??1000),expiresAt,tickMs:effect.tickMs??1000};
      if(enemyV2Effects&&source.definition.team==='enemies')
        target.periodic=applyEnemyV2Periodic(target.periodic,periodic).entries;
      else target.periodic.push(periodic);
      events.push({atMs:now,type:'status_apply',actorId:source.definition.id,targetId:target.definition.id,abilityId,statusKind:effect.kind,statusTag:effect.tag??effect.damageType??effect.kind,expiresAtMs:expiresAt});return;}
    if(effect.kind==='cleanse'){
      // Remove harmful periodic effects/debuffs only. Never wipe beneficial HoTs,
      // shield amounts, buffs or boss phase state. The replay identifies the cure.
      const removed=target.periodic.filter(p=>p.kind==='dot');
      target.periodic=target.periodic.filter(p=>p.kind!=='dot');
      for(const p of removed)events.push({atMs:now,type:'status_remove',actorId:source.definition.id,targetId:target.definition.id,abilityId,statusKind:'dot',statusTag:p.tag??'dot'});
      if(removed.length&&source.combatV2&&!abilityId.startsWith('V2_'))
        runReactive(source,'cleanse',now,target);
      return;
    }
    if(effect.kind==='interrupt'){ if(target.casting){ const interruptedAbilityId=target.casting.abilityId,def=target.definition.abilities.find(a=>a.id===interruptedAbilityId); if(def?.interruptible){target.casting=undefined;source.interrupts++;events.push({atMs:now,type:'interrupt',actorId:source.definition.id,targetId:target.definition.id,abilityId,interruptedAbilityId});if(source.definition.team==='players'){
        resource(source,'interrupt',now,abilityId);
        if(!abilityId.startsWith('V2_')){
          runCapstone(source,'interrupt',now,target);
          runReactive(source,'interrupt',now,target);
        }
      }}} return; }
    if(effect.kind==='taunt'){ if(target.definition.team==='enemies'){const top=Math.max(1,...Object.values(target.threat));target.threat[source.definition.id]=top+Math.max(100,effect.value??100);if(source.definition.team==='players'){
        resource(source,'taunt',now,abilityId);
        if(!abilityId.startsWith('V2_'))runReactive(source,'taunt',now,target);
      }}return;}
    if(effect.kind==='buff'||effect.kind==='debuff'){const tag=effect.tag??'generic',
      expiresAt=now+(effect.kind==='debuff'?
        forgeStatusDuration(source,target,abilityId,effect.durationMs??5000):
        effect.durationMs??5000);const capstoneId=abilityId.startsWith('V2_CAPSTONE:')||abilityId.startsWith('V2_PASSIVE:')?abilityId:undefined;
      if(capstoneId&&effect.kind==='buff')target.modifiers=target.modifiers.filter(m=>m.v2CapstoneId!==capstoneId||m.tag!==tag);
      const modifierEntry:CombatantState['modifiers'][number]={sourceId:source.definition.id,tag,value:effect.value??0,expiresAt,createdAt:now,kind:effect.kind,
        ...(capstoneId?{v2CapstoneId:capstoneId}:{})};
      if(enemyV2Effects&&source.definition.team==='enemies')
        target.modifiers=applyEnemyV2Modifier(target.modifiers,modifierEntry).entries;
      else target.modifiers.push(modifierEntry);
      events.push({atMs:now,type:'status_apply',actorId:source.definition.id,targetId:target.definition.id,abilityId,statusKind:effect.kind,statusTag:tag,expiresAtMs:expiresAt});if(effect.kind==='debuff')gemOnDebuffAppliedV1(now,source,target);else gemOnBuffAppliedV1(now,source,target);emitGemState(now);return;}
  };

  runCapstone=(actor,kind,now,target,ctx={})=>{
    if(!v2Encounter||!actor.alive||!actor.combatV2)return;
    const result=triggerCapstoneV2(actor,kind,now,ctx);
    if(!result.event&&!result.actions.length)return;
    if(result.event)events.push(result.event);
    for(const action of result.actions){
      let targets:CombatantState[]=[];
      switch(action.target){
        case 'self':targets=[actor];break;
        case 'target':targets=target?[target]:[actor];break;
        case 'enemy':targets=living(actor.definition.team==='players'?enemies:players).slice(0,1);break;
        case 'tank':targets=living(players).filter(p=>p.definition.role==='tank').slice(0,1);break;
        case 'lowest_hp_ally':{
          const allies=living(actor.definition.team==='players'?players:enemies);
          if(allies.length)targets=[allies.reduce((a,b)=>hpPct(a)<hpPct(b)?a:b)];
          break;
        }
        case 'all_allies':targets=living(actor.definition.team==='players'?players:enemies);break;
      }
      for(const destination of targets){
        if(destination.alive)applyEffect(now,actor,destination,action.effect,'V2_CAPSTONE:'+actor.definition.combatV2?.capstoneId);
      }
    }
  };

  runReactive=(actor,kind,now,target,ctx={})=>{
    if(!actor.alive||!actor.combatV2||!v2Encounter)return;
    const actions=triggerReactivePassiveV2(actor,kind,now,ctx);
    if(kind==='damage_taken')actions.push(...defensiveReactiveTriggerV2(actor,now));
    for(const action of actions){
      events.push({atMs:now,type:'passive_trigger',actorId:actor.definition.id,
        targetId:target?.definition.id,abilityId:'V2_PASSIVE:'+action.node,detail:kind});
      const affected=action.target==='all_allies'?living(players):
        action.target==='self'?[actor]:target?.alive?[target]:[];
      for(const recipient of affected){
        if(recipient.alive)applyEffect(now,actor,recipient,action.effect,'V2_PASSIVE:'+action.node);
      }
    }
  };

  const eq2Haste=(actor:CombatantState,now:number)=>{
    const active=eq2PrivateHit?.timedStat(actor.definition.id,now,'haste');
    if(!active?.pct)return 0;
    events.push({atMs:now,type:'equipment_trait_trigger',actorId:actor.definition.id,
      abilityId:'V2_QA_TIMED:'+active.ids.join('+'),amount:active.pct,detail:'private_qa_timed_haste_used'});
    return active.pct/100;
  };
  for(let now=0; now<=maxMs; now+=tick){
    for(let expired=eq2PrivateHit?.expireShield(now);expired;expired=eq2PrivateHit?.expireShield(now))
      events.push({atMs:now,type:'equipment_trait_trigger',actorId:expired.ownerId,
        abilityId:'V2_QA_SHIELD:'+expired.id,amount:expired.remaining,detail:'private_qa_shield_expired'});
    if(v2Encounter)for(const actor of players){
      const v2=actor.combatV2;if(!actor.alive||!v2)continue;
      const due=v2.scheduledTotemAt.filter(at=>at<=now);
      v2.scheduledTotemAt=v2.scheduledTotemAt.filter(at=>at>now);
      for(const at of due)runCapstone(actor,'totem_expires',now);
    }
    for(const state of all){ if(!state.alive)continue; state.modifiers=state.modifiers.filter(m=>m.expiresAt>now);
      for(const p of [...state.periodic]){
        if(!state.alive)break;
        if(p.nextTickAt<=now&&p.expiresAt>=now){
          const src=all.find(x=>x.definition.id===p.sourceId);
          if(src?.alive){
            if(dungeonRewards&&p.effectId.startsWith('V2_DUNGEON_REWARD:')&&
               p.sourceId===dungeonRewards.actorId&&p.kind==='dot'){
              // Authorized Bleed is an HP tick, not a second direct hit.
              // No new accuracy/crit RNG, ward, gem, class resource or trait proc.
              const actual=Math.min(state.hp,Math.max(0,p.flat));
              if(actual>0){
                state.hp-=actual;state.damageTaken+=actual;src.damageDone+=actual;
                events.push({atMs:now,type:'dot_tick',actorId:src.definition.id,
                  targetId:state.definition.id,abilityId:p.effectId,
                  amount:Number(actual.toFixed(2)),detail:'no_recursive_reward_trigger'});
                if(state.hp<=0){
                  state.alive=false;state.downed=state.definition.team==='players';
                  events.push({atMs:now,type:state.downed?'down':'death',
                    actorId:src.definition.id,targetId:state.definition.id,abilityId:p.effectId});
                }
              }
            }else{
              const fx:AbilityEffect={kind:p.kind,coeff:p.coeff,flat:p.flat,
                damageType:p.damageType,tag:p.tag};
              p.kind==='dot'?applyDamage(now,src,state,fx,p.effectId,'dot_tick'):
                applyHeal(now,src,state,fx,p.effectId,'hot_tick');
            }
          }
          p.nextTickAt+=p.tickMs;
        }
      }
      state.periodic=state.periodic.filter(p=>p.expiresAt>now);
    }
    if(!living(enemies).length){events.push({atMs:now,type:'combat_end',detail:'victory'});return{victory:true,durationMs:now,reason:'victory',events,players,enemies};}
    if(!living(players).length){events.push({atMs:now,type:'combat_end',detail:'wipe'});return{victory:false,durationMs:now,reason:'wipe',events,players,enemies};}

    // Generic HP-threshold boss phases. Data declares the phase; engine applies it once.
    for(const boss of bosses){
      if(!boss.alive)continue;
      for(const phase of phasesByBoss.get(boss)??[]){
        if(hpPct(boss)<=phase.hpPct && !boss.triggeredPhases.includes(phase.id)){
          boss.triggeredPhases.push(phase.id); events.push({atMs:now,type:'phase',actorId:boss.definition.id,abilityId:phase.id,detail:`hp<=${phase.hpPct}`});gemOnBossPhaseV1(now,players);emitGemState(now);
          for(const fx of phase.effects){ for(const t of targetsFor(fx.target??phase.target,boss,enemies,players,rng,`${now}:${phase.id}:phase`)) applyEffect(now,boss,t,fx,phase.id); }
        }
      }
    }

    for(const actor of all){ if(!actor.alive)continue; const allies=actor.definition.team==='players'?players:enemies, foes=actor.definition.team==='players'?enemies:players;
      if(actor.casting && actor.casting.completesAt<=now){ const ab=actor.definition.abilities.find(a=>a.id===actor.casting!.abilityId); const target=all.find(x=>x.definition.id===actor.casting!.targetId); actor.casting=undefined; if(ab&&target?.alive){events.push({atMs:now,type:'cast_complete',actorId:actor.definition.id,targetId:target.definition.id,abilityId:ab.id});gemOnAbilityUsedV1(now,actor,ab);emitGemState(now); const executed=spend(actor,ab,now);for(const fx of executed.effects){ for(const t of targetsFor(fx.target??ab.target,actor,allies,foes,rng,`${now}:${ab.id}:target`))applyEffect(now,actor,t,fx,ab.id); }} }
      if(actor.casting)continue;
      const ab=abilitiesByActor.get(actor)?.find(a=>(actor.cooldownReadyAt[a.id]??0)<=now&&conditionOk(a,actor,allies,foes));
      if(ab){ const ts=targetsFor(ab.target,actor,allies,foes,rng,`${now}:${ab.id}:select`); const t=ts[0]; if(t){ actor.cooldownReadyAt[ab.id]=now+Math.round(ab.cooldownMs/Math.max(.25,1+gemEffectiveHasteV1(actor,now)+eq2Haste(actor,now)+(v2Encounter?Math.max(-.2,Math.min(.2,modifier(actor,'haste',now)+reactiveHasteV2(actor))):0))); if(ab.castTimeMs>0){actor.casting={abilityId:ab.id,completesAt:now+ab.castTimeMs,targetId:t.definition.id};events.push({atMs:now,type:'cast_start',actorId:actor.definition.id,targetId:t.definition.id,abilityId:ab.id});}else{gemOnAbilityUsedV1(now,actor,ab);emitGemState(now);const executed=spend(actor,ab,now);for(const fx of executed.effects){for(const x of (fx.target?targetsFor(fx.target,actor,allies,foes,rng,`${now}:${ab.id}:effect`):ts)){if(x.alive)applyEffect(now,actor,x,fx,ab.id);}}} continue; } }
      if(actor.nextBasicAt<=now){ const t=chooseEnemy(actor,foes,rng,`${now}:${actor.definition.id}:basic`); if(t){applyDamage(now,actor,t,{kind:'damage',coeff:actor.definition.basicAttackCoeff,damageType:'physical',threatMultiplier:actor.definition.role==='tank'?2.5:1},'BASIC');actor.nextBasicAt=now+Math.round(actor.definition.basicAttackMs/Math.max(.25,1+gemEffectiveHasteV1(actor,now)+eq2Haste(actor,now)+(v2Encounter?Math.max(-.2,Math.min(.2,modifier(actor,'haste',now))):0)));} }
    }
  }
  events.push({atMs:maxMs,type:'combat_end',detail:'timeout'}); return {victory:false,durationMs:maxMs,reason:'timeout',events,players,enemies};
}

export function persistentPlayerState(result:CombatResult):Record<string,PersistentActorState>{
  return Object.fromEntries(result.players.map(player=>[player.definition.id,{
    hp:player.hp,
    downed:player.downed,
    cooldownRemainingMs:Object.fromEntries(Object.entries(player.cooldownReadyAt).map(([abilityId,readyAt])=>[abilityId,Math.max(0,readyAt-result.durationMs)])),
    basicAttackRemainingMs:Math.max(0,player.nextBasicAt-result.durationMs),
  }]));
}
