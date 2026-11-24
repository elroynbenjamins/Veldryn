import {defenseMitigation,damageAfterMitigation} from '../calculations';
import type {CombatRng} from '../deterministic-rng';
import type {AbilityDefinition,AbilityEffect,CombatantState,TargetRule} from '../types';
import {living,hpPct,modifier,threatenedAlly,targetsFor,conditionOk,memoizeCombatQuery} from '../combat-state-query';

// Emergency triage changes only selected support-class V2 abilities. Preserve
// ordinary threatened-target shielding, cleanse targeting and legacy order.
export const CRITICAL_SUPPORT_HP_V2=.30;
export const supportV2=(actor:CombatantState)=>Boolean(actor.combatV2&&
  actor.definition.team==='players'&&actor.definition.role==='support');
const supportAbilityV2=(actor:CombatantState,a:AbilityDefinition)=>supportV2(actor)&&a.id.includes(':v2:');
const allyRuleV2=(rule:TargetRule)=>rule==='self'||rule==='lowest_hp_ally'||
  rule==='lowest_hp_ally_with_dot'||rule==='two_lowest_hp_allies'||rule==='all_allies'||rule==='threatened_ally';
function criticalSupportTargetsV2(rule:TargetRule,actor:CombatantState,
  allies:CombatantState[],foes:CombatantState[],kind:'heal'|'shield'):CombatantState[]{
  if(!allyRuleV2(rule))return [];
  let candidates=living(allies);
  if(rule==='self')candidates=candidates.filter(a=>a===actor);
  if(rule==='lowest_hp_ally_with_dot'){
    const affected=candidates.filter(a=>a.periodic.some(p=>p.kind==='dot')||
      a.modifiers.some(m=>m.kind==='debuff'));
    if(affected.length)candidates=affected;
  }
  // Do not divert a shield to a target already protected by a shield.
  // A heal remains valuable regardless of the recipient's existing shield.
  const sorted=candidates.sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id));
  // Only threatened-ally shielding can skip a shielded low-HP target.
  // Other single-target rules must actually reach the eligible recipient.
  if(rule==='lowest_hp_ally'||rule==='lowest_hp_ally_with_dot')candidates=sorted.slice(0,1);
  else if(rule==='two_lowest_hp_allies')candidates=sorted.slice(0,2);
  else candidates=sorted;
  const critical=candidates.filter(a=>hpPct(a)<CRITICAL_SUPPORT_HP_V2&&(kind==='heal'||a.shield<=0));
  if(rule==='threatened_ally'){
    const threatened=threatenedAlly(allies,foes);
    return threatened&&critical.includes(threatened)?[threatened]:critical.slice(0,1);
  }
  return critical;
}
export function emergencySupportRankV2(a:AbilityDefinition,actor:CombatantState,
  allies:CombatantState[],foes:CombatantState[]):number{
  if(!supportAbilityV2(actor,a)||!allyRuleV2(a.target))return 0;
  let rank=0;
  for(const fx of a.effects){
    if(fx.kind!=='heal'&&fx.kind!=='shield')continue;
    if((fx.coeff??0)<=0&&(fx.flat??0)<=0)continue;
    if(criticalSupportTargetsV2(fx.target??a.target,actor,allies,foes,fx.kind).length)
      rank=Math.max(rank,fx.kind==='heal'?2:1);
  }
  return rank;
}
export function supportTargetsV2(rule:TargetRule,actor:CombatantState,allies:CombatantState[],
  foes:CombatantState[],rng:CombatRng,label:string,a:AbilityDefinition,fx?:AbilityEffect):CombatantState[]{
  if(supportAbilityV2(actor,a)&&(rule==='threatened_ally'||rule==='lowest_hp_ally'||
    rule==='lowest_hp_ally_with_dot')){
    const effects=fx?[fx]:a.effects.filter(e=>(e.target??a.target)===rule);
    // Prefer heal targeting if this shared target has both kinds.
    const kind=effects.some(e=>e.kind==='heal')?'heal':effects.some(e=>e.kind==='shield')?'shield':undefined;
    if(kind){
      const urgent=criticalSupportTargetsV2(rule,actor,allies,foes,kind);
      if(urgent.length)return urgent;
    }
  }
  return targetsFor(rule,actor,allies,foes,rng,label);
}

// Predict only visible, currently winding-up boss attacks. This is a
// nominal noncritical estimate, not an RNG peek or a promised damage result.
const SUPPORT_FORECAST_WINDOW_MS_V2=1500;
export function incomingBossPressureV2(now:number,allies:CombatantState[],foes:CombatantState[],
  mitigationConstant:number):CombatantState[]{
  const live=living(allies);
  const totals=new Map<CombatantState,number>();
  for(const boss of foes){
    const cast=boss.casting;
    // Players act before enemies in the existing actor loop. A due cast
    // still exists and may resolve later in this very tick.
    if(!boss.alive||!boss.definition.boss||!cast||cast.completesAt<now||
      cast.completesAt-now>SUPPORT_FORECAST_WINDOW_MS_V2)continue;
    const ability=boss.definition.abilities.find(a=>a.id===cast.abilityId);
    const anchor=live.find(a=>a.definition.id===cast.targetId);
    if(!ability||!anchor)continue;
    for(const fx of ability.effects){
      if(fx.kind!=='damage')continue;
      const rule=fx.target??ability.target;
      // Current-target enemy casts resolve by tank/threat; if the target
      // has already changed, do not guess where the attack will land.
      const current=live.find(a=>a.definition.role==='tank')??live.reduce((a,b)=>
        (boss.threat[b.definition.id]??0)>(boss.threat[a.definition.id]??0)?b:a,live[0]);
      const targets=rule==='all_enemies'?live:rule==='current_target'&&current===anchor?[anchor]:[];
      for(const target of targets){
        const mitigation=fx.damageType==='true'?0:defenseMitigation(
          Math.max(0,target.definition.stats.defense)*Math.max(.7,Math.min(1.3,1+modifier(target,'defense_pct',now))),
          mitigationConstant);
        const raw=(damageAfterMitigation(Math.max(0,boss.definition.stats.attackPower),
          fx.coeff??0,mitigation,1)+(fx.flat??0))*
          Math.max(.1,1+modifier(boss,'damage_done',now))*
          Math.max(.1,1+modifier(target,'damage_taken',now))*
          (boss.definition.alchemyModifiers?.outgoing??1)*(target.definition.alchemyModifiers?.incoming??1);
        if(Number.isFinite(raw)&&raw>0)totals.set(target,(totals.get(target)??0)+raw);
      }
    }
  }
  const net=(target:CombatantState)=>Math.max(0,(totals.get(target)??0)-target.shield);
  return [...totals.keys()].filter(target=>net(target)>0&&
    (net(target)>=target.definition.stats.maxHp*.20||
     (target.hp>=target.definition.stats.maxHp*CRITICAL_SUPPORT_HP_V2&&
      target.hp-net(target)<target.definition.stats.maxHp*CRITICAL_SUPPORT_HP_V2)))
    .sort((a,b)=>(a.hp-net(a))/Math.max(1,a.definition.stats.maxHp)-
      (b.hp-net(b))/Math.max(1,b.definition.stats.maxHp)||a.definition.id.localeCompare(b.definition.id));
}
export function predictiveShieldTargetsV2(a:AbilityDefinition,actor:CombatantState,
  pressure:CombatantState[],allies:CombatantState[]):CombatantState[]{
  // Instant class shields only: no late casts, random targets, off-target
  // effect promotion, or fabricated protection from HoTs or damage wards.
  if(!supportAbilityV2(actor,a)||a.castTimeMs!==0||
    !a.effects.some(e=>e.kind==='shield'&&!e.target&&((e.coeff??0)>0||(e.flat??0)>0)))return [];
  if(a.target==='all_allies')return pressure.length?living(allies):[];
  if(a.target==='threatened_ally')return pressure.slice(0,1);
  if(a.target==='self')return pressure.includes(actor)?[actor]:[];
  return [];
}
export function ordinaryHealSufficientV2(a:AbilityDefinition,actor:CombatantState,
  target:CombatantState,allies:CombatantState[],foes:CombatantState[],now:number):boolean{
  // Retain group recovery if multiple allies need it; this narrow rule
  // merely saves group-heal cooldowns for a single critical patient.
  if(!supportAbilityV2(actor,a)||a.target!=='lowest_hp_ally')return false;
  const direct=a.effects.filter(e=>e.kind==='heal'&&(!e.target||e.target===a.target));
  if(!direct.length||!criticalSupportTargetsV2(a.target,actor,allies,foes,'heal').includes(target))return false;
  const nominal=direct.reduce((n,e)=>n+Math.max(0,actor.definition.stats.healingPower*(e.coeff??0)+(e.flat??0)),0)*
    Math.max(0,1+modifier(target,'healing_received',now))*(actor.definition.alchemyModifiers?.healing??1);
  return Number.isFinite(nominal)&&target.hp+nominal>=target.definition.stats.maxHp*.45;
}

// Tank AI consumes only existing authored actions. Interception means
// cancelling a visible interruptible cast, not transferring damage or
// changing boss targeting rules. No RNG reads and no additional effects.
export const tankV2=(actor:CombatantState)=>Boolean(actor.combatV2&&
  actor.definition.team==='players'&&actor.definition.role==='tank');
type TankDecisionV2={ability:AbilityDefinition;targets:CombatantState[];rank:number;coverage:number};
export function tankProtectionDecisionV2(actor:CombatantState,ordered:AbilityDefinition[],
  allies:CombatantState[],foes:CombatantState[],now:number,mitigationConstant:number,
  pressureFor=()=>incomingBossPressureV2(now,allies,foes,mitigationConstant)):TankDecisionV2|undefined{
  if(!tankV2(actor))return;
  const pressure=pressureFor();
  const critical=living(allies).filter(a=>hpPct(a)<CRITICAL_SUPPORT_HP_V2);
  if(!pressure.length&&!critical.length)return;
  const dangerous=foes.filter(b=>b.alive&&b.definition.boss&&b.casting&&
    b.casting.completesAt>=now&&b.definition.abilities.some(a=>a.id===b.casting!.abilityId&&a.interruptible)&&
    incomingBossPressureV2(now,allies,[b],mitigationConstant).length>0)
    .sort((a,b)=>a.casting!.completesAt-b.casting!.completesAt||a.definition.id.localeCompare(b.definition.id));
  let best:TankDecisionV2|undefined;
  const consider=(ability:AbilityDefinition,targets:CombatantState[],rank:number,coverage:number)=>{
    if(!targets.length||coverage<=0)return;
    if(!best||rank>best.rank||(rank===best.rank&&coverage>best.coverage))
      best={ability,targets,rank,coverage};
  };
  for(const a of ordered){
    if(!a.id.includes(':v2:')||a.castTimeMs!==0||(actor.cooldownReadyAt[a.id]??0)>now)continue;
    const eligible=conditionOk(a,actor,allies,foes);
    if(eligible&&a.target==='interruptible_casting_enemy'&&
      a.effects.some(e=>e.kind==='interrupt'&&(!e.target||e.target===a.target))&&dangerous.length)
      consider(a,[dangerous[0]],4,1);
    // Conservative scope: only direct protection whose primary target
    // actually receives the effect. Explicit self/other overrides keep
    // their authored meaning and cannot masquerade as party protection.
    if(!eligible&&a.aiCondition!=='self_below_50'&&a.aiCondition!=='ally_below_80_or_targeted')continue;
    const effects=a.effects.filter(e=>!e.target||e.target===a.target);
    const heal=effects.some(e=>e.kind==='heal'&&((e.coeff??0)>0||(e.flat??0)>0));
    const shield=effects.some(e=>e.kind==='shield'&&((e.coeff??0)>0||(e.flat??0)>0));
    const ward=effects.some(e=>e.kind==='buff'&&e.tag==='damage_taken'&&(e.value??0)<0&&
      (e.durationMs??5000)>=SUPPORT_FORECAST_WINDOW_MS_V2);
    if(!heal&&!shield&&!ward)continue;
    // Do not refresh an already active damage-taken ward; shields reduce
    // forecast pressure through the same nominal estimator used by support.
    const canProtect=(t:CombatantState)=>shield||ward&&modifier(t,'damage_taken',now)>=0;
    const emergency=(t:CombatantState)=>critical.includes(t)&&
      (heal&&eligible||shield&&t.shield<=0||ward&&modifier(t,'damage_taken',now)>=0);
    const predicted=(t:CombatantState)=>pressure.includes(t)&&canProtect(t);
    const orderedCritical=[...critical].sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id));
    const pool=a.target==='self'?[actor]:a.target==='all_allies'?living(allies):
      a.target==='threatened_ally'?[...new Set([...orderedCritical,...pressure])]:[];
    const urgent=pool.filter(emergency),forecast=pool.filter(predicted);
    const targets=a.target==='threatened_ally'?(urgent.length?urgent:forecast).slice(0,1):pool;
    if(urgent.length)consider(a,targets,heal&&eligible?3:2,a.target==='threatened_ally'?1:urgent.length);
    else if(forecast.length)consider(a,targets,1,a.target==='threatened_ally'?1:forecast.length);
  }
  return best;
}

// Tactical damage decisions are restricted to instant, selected V2 damage
// techniques. Inspect current statuses/casts, never future RNG or HP phases.
export const damageV2=(actor:CombatantState)=>Boolean(actor.combatV2&&
  actor.definition.team==='players'&&actor.definition.role==='damage');
export function damageTacticsV2(actor:CombatantState,ordered:AbilityDefinition[],
  allies:CombatantState[],foes:CombatantState[],now:number,mitigationConstant:number):TankDecisionV2|undefined{
  if(!damageV2(actor))return;
  const ready=ordered.filter(a=>a.id.includes(':v2:')&&a.castTimeMs===0&&
    (actor.cooldownReadyAt[a.id]??0)<=now&&conditionOk(a,actor,allies,foes));
  const live=living(foes);
  if(!ready.length||!live.length)return;
  let best:TankDecisionV2|undefined;
  const offer=(ability:AbilityDefinition,target:CombatantState,rank:number,score:number)=>{
    if(!best||rank>best.rank||(rank===best.rank&&score>best.coverage))
      best={ability,targets:[target],rank,coverage:score};
  };
  const direct=memoizeCombatQuery((a:AbilityDefinition)=>a.effects.filter(e=>e.kind==='damage'&&
    (!e.target||e.target===a.target)&&((e.coeff??0)>0||(e.flat??0)>0)));
  const current=ready.filter(a=>a.target==='current_target'&&direct(a).length);
  const strength=memoizeCombatQuery((a:AbilityDefinition)=>direct(a).reduce((n,e)=>
    n+Math.max(0,actor.definition.stats.attackPower*(e.coeff??0)+(e.flat??0)),0));
  const burst=(a:AbilityDefinition)=>a.combatV2?.spend==='all'||
    Number(a.combatV2?.spend??0)>=3;
  const activeVulnerability=(target:CombatantState)=>modifier(target,'damage_taken',now)>0;
  const activeOffense=modifier(actor,'damage_done',now)>0||modifier(actor,'crit',now)>0;
  const opensVulnerability=(a:AbilityDefinition)=>a.effects.some(e=>e.kind==='debuff'&&
    (!e.target||e.target===a.target)&&e.tag==='damage_taken'&&(e.value??0)>0&&
    (e.durationMs??5000)>=1000);
  const dangerous=live.filter(e=>e.definition.boss&&e.casting&&e.casting.completesAt>=now&&
    e.definition.abilities.some(a=>a.id===e.casting!.abilityId&&a.interruptible)&&
    incomingBossPressureV2(now,allies,[e],mitigationConstant).length>0)
    .sort((a,b)=>a.casting!.completesAt-b.casting!.completesAt||a.definition.id.localeCompare(b.definition.id));
  if(dangerous.length){
    const interrupt=ready.find(a=>a.target==='interruptible_casting_enemy'&&
      a.effects.some(e=>e.kind==='interrupt'&&(!e.target||e.target===a.target)));
    if(interrupt)return {ability:interrupt,targets:[dangerous[0]],rank:5,coverage:1};
  }
  // Nominal estimates only, used to prefer an inexpensive finish over a
  // spender when a nonboss target is already almost defeated. Never assume
  // a kill or bypass actual damage, crit, shields, mitigation or cooldowns.
  for(const target of [...live].sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id))){
    if(!target.definition.boss&&hpPct(target)<.15){
      for(const a of current){
        if(burst(a))continue;
        const nominal=direct(a).reduce((n,e)=>n+damageAfterMitigation(
          actor.definition.stats.attackPower,e.coeff??0,e.damageType==='true'?0:
            defenseMitigation(target.definition.stats.defense,mitigationConstant),1)+(e.flat??0),0);
        if(nominal>=target.hp+target.shield)offer(a,target,4,-strength(a));
      }
    }
    for(const a of current){
      const execute=direct(a).some(e=>
        ((e.executeBonus??0)>0&&hpPct(target)<(e.executeBelowHpPct??0))||
        ((e.additionalExecuteBonus??0)>0&&hpPct(target)<(e.additionalExecuteBelowHpPct??0)));
      if(execute)offer(a,target,3,strength(a));
      // Set up only if a distinct ready burst can use the opening.
      if(target.definition.boss&&!activeVulnerability(target)&&opensVulnerability(a)&&
        current.some(other=>other!==a&&burst(other)&&strength(other)>0))
        offer(a,target,2,strength(a));
      if(burst(a)&&(activeVulnerability(target)||activeOffense)&&target.definition.boss)
        offer(a,target,1,strength(a));
    }
  }
  return best;
}

// Coordinate only selected pure, single-target V2 heals. A pending cast is
// soft information, not a lock: it can be interrupted, miss its nominal
// output or lose its patient. Never suppress recovery for a sole critical ally.
export function pureSingleHealV2(actor:CombatantState,a:AbilityDefinition):boolean{
  return supportAbilityV2(actor,a)&&a.target==='lowest_hp_ally'&&a.effects.length>0&&
    a.effects.every(e=>e.kind==='heal'&&(!e.target||e.target===a.target))&&
    a.effects.some(e=>(e.coeff??0)>0||(e.flat??0)>0);
}
function pendingNominalHealV2(actor:CombatantState,target:CombatantState,allies:CombatantState[],now:number):number{
  let total=0;
  for(const other of allies){
    const cast=other.casting;
    if(other===actor||!other.alive||!cast||cast.targetId!==target.definition.id||
      cast.completesAt<now||cast.completesAt-now>500)continue;
    const ability=other.definition.abilities.find(a=>a.id===cast.abilityId);
    if(!ability||!pureSingleHealV2(other,ability))continue;
    const nominal=ability.effects.reduce((n,e)=>n+Math.max(0,other.definition.stats.healingPower*(e.coeff??0)+(e.flat??0)),0)*
      Math.max(0,1+modifier(target,'healing_received',now))*(other.definition.alchemyModifiers?.healing??1);
    if(Number.isFinite(nominal)&&nominal>0)total+=nominal;
  }
  return total;
}
export function coordinatedHealV2(actor:CombatantState,a:AbilityDefinition,allies:CombatantState[],
  foes:CombatantState[],now:number,mitigationConstant:number,
  pressureFor=()=>incomingBossPressureV2(now,allies,foes,mitigationConstant)):{target?:CombatantState}|undefined{
  if(!pureSingleHealV2(actor,a))return;
  const sorted=living(allies).sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id));
  const target=sorted[0];
  if(!target)return {};
  const pending=pendingNominalHealV2(actor,target,allies,now);
  if(pending<=0)return {target};
  const projected=(target.hp+pending)/Math.max(1,target.definition.stats.maxHp);
  const pressure=pressureFor();
  if(pressure.includes(target)||projected<.50)return {target};
  const alternate=sorted.find(t=>t!==target&&hpPct(t)<(hpPct(target)<CRITICAL_SUPPORT_HP_V2?CRITICAL_SUPPORT_HP_V2:.50)&&
    !pressure.includes(target)&&
    (t.hp+pendingNominalHealV2(actor,t,allies,now))/Math.max(1,t.definition.stats.maxHp)<.50);
  if(alternate)return {target:alternate};
  // Critical, threatened or uncertain patients keep ordinary healing.
  if(hpPct(target)>=CRITICAL_SUPPORT_HP_V2&&projected>=.80)return {};
  return {target};
}
export function redundantPureShieldV2(actor:CombatantState,a:AbilityDefinition,allies:CombatantState[],
  foes:CombatantState[],now:number,mitigationConstant:number,
  pressureFor=()=>incomingBossPressureV2(now,allies,foes,mitigationConstant)):boolean{
  if(!(supportV2(actor)||tankV2(actor))||!a.id.includes(':v2:')||a.castTimeMs!==0||
    !a.effects.length||!a.effects.every(e=>e.kind==='shield'&&!e.shieldReflectPct&&
      (!e.target||e.target===a.target)))return false;
  const live=living(allies);
  const targets=a.target==='self'?[actor]:a.target==='all_allies'?live:
    a.target==='threatened_ally'?[threatenedAlly(allies,foes)??[...live].sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id))[0]].filter((t):t is CombatantState=>Boolean(t)):[];
  if(!targets.length||!targets.every(t=>hpPct(t)>=CRITICAL_SUPPORT_HP_V2&&t.shield>=t.definition.stats.maxHp*.20))return false;
  const pressure=pressureFor();
  return !targets.some(t=>pressure.includes(t));
}

// Sequencing is a bounded alternative to an ordinary damage action, never
// a hard resource requirement or a delay to an emergency/tactical action.
const SEQUENCE_HOLD_MS_V2=1500;
function majorSpenderV2(a:AbilityDefinition):boolean{
  return a.combatV2?.spend==='all'||Number(a.combatV2?.spend??0)>=3;
}
function redundantOwnDamageStatusV2(actor:CombatantState,a:AbilityDefinition,target:CombatantState,now:number):boolean{
  if(a.target!=='current_target'||a.effects.some(e=>e.kind==='interrupt'||
    (e.consumeOwnedDotFraction??0)>0||(e.lifestealPct??0)>0||
    (e.executeBonus??0)>0||(e.additionalExecuteBonus??0)>0||
    (e.kind!=='damage'&&e.kind!=='dot'&&e.kind!=='debuff')||
    (e.target&&e.target!==a.target)))return false;
  const status=a.effects.filter(e=>e.kind==='dot'||e.kind==='debuff');
  if(!status.length)return false;
  // An identical authored periodic source with at least one future tick
  // left, or an identical own debuff with time remaining. Different skills,
  // tags, sources and compound utility must never be treated as duplicates.
  return status.every(e=>e.kind==='dot'?
    target.periodic.some(p=>p.kind==='dot'&&p.sourceId===actor.definition.id&&
      p.effectId===a.id&&p.tag===(e.tag??e.damageType??e.kind)&&
      p.expiresAt-now>1000&&p.nextTickAt>now&&p.nextTickAt<=p.expiresAt):
    target.modifiers.some(m=>m.kind==='debuff'&&m.sourceId===actor.definition.id&&
      m.v2SourceAbilityId===a.id&&m.tag===(e.tag??'generic')&&
      m.value===(e.value??0)&&m.expiresAt-now>1000));
}
export function sequenceDamageActionV2(actor:CombatantState,selected:AbilityDefinition,
  ordered:AbilityDefinition[],foes:CombatantState[],now:number,
  available:(a:AbilityDefinition)=>boolean,holds:Map<string,number>):AbilityDefinition{
  if(!damageV2(actor)||!actor.combatV2||!selected.id.includes(':v2:')||
    selected.target!=='current_target')return selected;
  const live=living(foes);
  // Only a single, known target. Never predict or change random/multi-target
  // resolution; ordinary tactics retain their explicit target choices.
  if(live.length!==1)return selected;
  const target=live[0],v2=actor.combatV2;
  const window=modifier(target,'damage_taken',now)>0||modifier(actor,'damage_done',now)>0||
    modifier(actor,'crit',now)>0||v2.pendingDamageBonus>0||v2.pendingCritMultiplierBonus>0;
  if(window||hpPct(target)<.35)return selected;
  const lowResource=target.definition.boss&&majorSpenderV2(selected)&&
    v2.stacks<Math.ceil(v2.maxStacks/2);
  const refresh=redundantOwnDamageStatusV2(actor,selected,target,now);
  if(!lowResource&&!refresh)return selected;
  const key=actor.definition.id+':'+selected.id;
  if(now-(holds.get(key)??now)>=SEQUENCE_HOLD_MS_V2)return selected;
  const alternatives=ordered.filter(a=>a!==selected&&a.id.includes(':v2:')&&a.castTimeMs===0&&
    a.target==='current_target'&&available(a)&&!majorSpenderV2(a)&&
    !redundantOwnDamageStatusV2(actor,a,target,now)&&
    a.effects.some(e=>(e.kind==='damage'||e.kind==='dot')&&((e.coeff??0)>0||(e.flat??0)>0))&&
    (!lowResource||!a.combatV2?.spend));
  // No idle waiting or artificial resource generation. If a meaningful
  // alternate action is unavailable, use the originally selected ability.
  const alternative=alternatives[0];
  if(!alternative)return selected;
  if(!holds.has(key))holds.set(key,now);
  return alternative;
}

