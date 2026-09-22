import { clamp, defenseMitigation, damageAfterMitigation, hitChance } from './calculations';
import { CombatRng } from './deterministic-rng';
import type { AbilityDefinition, AbilityEffect, CombatEvent, CombatGemStateSnapshot, CombatInput, CombatResult, CombatantDefinition, CombatantState, PersistentActorState, TargetRule } from './types';
import {gemConsumeSupportChargeV1,gemEffectiveDefenseV1,gemEffectiveHasteV1,gemHealingMultiplierV1,gemIncomingDamageMultiplierV1,gemOnAbilityUsedV1,gemOnBossPhaseV1,gemOnBuffAppliedV1,gemOnDamageTakenV1,gemOnDebuffAppliedV1,gemOnDirectHealV1,gemOnDirectHitV1,gemOnKillV1,gemOnShieldAppliedV1,gemOutgoingDamageMultiplierV1,gemShieldMultiplierV1} from './gem-effects-v1';

function init(def: CombatantDefinition, carried?:PersistentActorState): CombatantState {
  const hp=Math.max(0,Math.min(def.stats.maxHp,carried?.hp??def.stats.maxHp));
  const downed=carried?.downed??false;
  return { definition:def, hp, shield:0, alive:!downed&&hp>0, downed, threat:{}, cooldownReadyAt:{...(carried?.cooldownRemainingMs??{})}, nextBasicAt:carried?.basicAttackRemainingMs??0, periodic:[], modifiers:[], damageDone:0, healingDone:0, damageTaken:0, interrupts:0, triggeredPhases:[] };
}

function living(xs: CombatantState[]) { return xs.filter(x=>x.alive); }
function hpPct(x: CombatantState) { return x.hp / Math.max(1, x.definition.stats.maxHp); }

function modifier(state: CombatantState, tag: string, now: number): number {
  return state.modifiers.filter(m=>m.tag===tag && m.expiresAt>now).reduce((s,m)=>s+m.value,0);
}

const VISIBLE_GEM_STATE_TAGS=new Set([
  'gem:momentum','gem:critical_surge','gem:flow','gem:unyielding','gem:predator_boost','gem:opening_phase',
  'gem:retaliation_ready','gem:battle_offense_ready','gem:battle_support_ready','gem:damage_reduction',
  'gem:shared_resolve','gem:benediction_charge','gem:haste_bonus','gem:opportunist_ready',
]);

function chooseEnemy(actor: CombatantState, enemies: CombatantState[], rng: CombatRng, label: string): CombatantState | undefined {
  const live=living(enemies); if (!live.length) return undefined;
  if (actor.definition.team === 'enemies') {
    const tank = live.find(x=>x.definition.role==='tank');
    if (tank) return tank;
    return live.reduce((a,b)=>((actor.threat[b.definition.id]||0)>(actor.threat[a.definition.id]||0)?b:a), live[0]);
  }
  return rng.pick(live,label);
}

function threatenedAlly(allies:CombatantState[],enemies:CombatantState[]):CombatantState|undefined{
  const liveAllies=new Map(living(allies).map(ally=>[ally.definition.id,ally]));
  const candidates=living(enemies).flatMap(enemy=>{
    if(!enemy.casting)return[];
    const ability=enemy.definition.abilities.find(item=>item.id===enemy.casting!.abilityId);
    if(!ability||ability.target==='all_enemies'||ability.target==='all_allies'||ability.target==='self')return[];
    const target=liveAllies.get(enemy.casting.targetId);if(!target)return[];
    if(!ability.effects.some(effect=>effect.kind==='damage'||effect.kind==='dot'))return[];
    return[{enemy,target,completesAt:enemy.casting.completesAt}];
  });
  candidates.sort((a,b)=>a.completesAt-b.completesAt||Number(Boolean(b.enemy.definition.boss))-Number(Boolean(a.enemy.definition.boss))||a.enemy.definition.id.localeCompare(b.enemy.definition.id));
  return candidates[0]?.target;
}

function targetsFor(rule: TargetRule, actor: CombatantState, allies: CombatantState[], enemies: CombatantState[], rng: CombatRng, label: string): CombatantState[] {
  switch(rule) {
    case 'self': return [actor];
    case 'lowest_hp_ally': { const live=living(allies); return live.length ? [live.reduce((a,b)=>hpPct(b)<hpPct(a)?b:a)] : []; }
    case 'all_allies': return living(allies);
    case 'all_enemies': return living(enemies);
    case 'random_enemy': { const live=living(enemies); return live.length ? [rng.pick(live,label)] : []; }
    case 'interruptible_casting_enemy': {
      const live=living(enemies).filter(enemy=>enemy.casting&&(enemy.definition.abilities.find(ability=>ability.id===enemy.casting!.abilityId)?.interruptible??false));
      if(!live.length)return [];
      live.sort((a,b)=>(a.casting!.completesAt-b.casting!.completesAt)||Number(Boolean(b.definition.boss))-Number(Boolean(a.definition.boss))||a.definition.id.localeCompare(b.definition.id));
      return [live[0]];
    }
    case 'threatened_ally': {const threatened=threatenedAlly(allies,enemies);if(threatened)return[threatened];const live=living(allies);return live.length?[live.reduce((a,b)=>hpPct(b)<hpPct(a)?b:a)]:[];}
    case 'current_target': default: { const t=chooseEnemy(actor,enemies,rng,label); return t?[t]:[]; }
  }
}

function conditionOk(a: AbilityDefinition, actor: CombatantState, allies: CombatantState[], enemies: CombatantState[]) {
  switch(a.aiCondition || 'always') {
    case 'self_below_50': return hpPct(actor)<0.5;
    case 'ally_below_50': return living(allies).some(x=>hpPct(x)<0.5);
    case 'ally_below_80': return living(allies).some(x=>hpPct(x)<0.8);
    case 'ally_below_80_or_targeted': return Boolean(threatenedAlly(allies,enemies))||living(allies).some(x=>hpPct(x)<0.8);
    case 'target_casting': return living(enemies).some(x=>!!x.casting && (x.definition.abilities.find(z=>z.id===x.casting!.abilityId)?.interruptible ?? false));
    case 'multiple_enemies': return living(enemies).length>=2;
    default: return true;
  }
}

export function simulateCombat(input: CombatInput): CombatResult {
  if (!input.players.length || !input.enemies.length) throw new Error('combat_requires_both_teams');
  const maxMs=input.maxDurationMs ?? 180_000; const tick=input.tickMs ?? 100; const mitigationConstant=input.mitigationConstant ?? 1200; const accuracyScale=input.accuracyScale ?? 1400;
  const players=input.players.map(def=>init(def,input.initialPlayerState?.[def.id])), enemies=input.enemies.map(def=>init(def)), all=[...players,...enemies];
  const rng=new CombatRng(input.seed); const events:CombatEvent[]=[{atMs:0,type:'combat_start'}];

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
  const applyDamage=(now:number, source:CombatantState, target:CombatantState, effect:AbilityEffect, abilityId:string, eventType:'damage'|'dot_tick'='damage')=>{
    if(!target.alive)return;
    const hc=hitChance(source.definition.stats.accuracy,target.definition.stats.evasion,accuracyScale); if(rng.next(`${now}:${source.definition.id}:${abilityId}:hit`)>hc){if(eventType==='damage')events.push({atMs:now,type:'miss',actorId:source.definition.id,targetId:target.definition.id,abilityId});return;}
    const mit=effect.damageType==='true'?0:defenseMitigation(gemEffectiveDefenseV1(target,now),mitigationConstant);
    const crit=rng.next(`${now}:${source.definition.id}:${abilityId}:crit`)<clamp(source.definition.stats.critChance+modifier(source,'crit',now),0,.75);
    let raw=damageAfterMitigation(source.definition.stats.attackPower,effect.coeff??0,mit,.95+rng.next(`${now}:${abilityId}:var`)*.10,crit,source.definition.stats.critMultiplier)+(effect.flat??0);
    raw*=gemOutgoingDamageMultiplierV1(source,target,now,abilityId,eventType==='dot_tick'); raw*=Math.max(.1,1+modifier(source,'damage_done',now)); raw*=Math.max(.1,1+modifier(target,'damage_taken',now)); raw*=gemIncomingDamageMultiplierV1(target,now);
    if(hpPct(target)<clamp(effect.executeBelowHpPct??0,0,1))raw*=1+clamp(effect.executeBonus??0,0,1);
    const absorbed=Math.min(target.shield,raw); target.shield-=absorbed; const dealt=Math.max(0,raw-absorbed); target.hp=Math.max(0,target.hp-dealt); source.damageDone+=dealt; target.damageTaken+=dealt;
    gemOnDamageTakenV1(now,target,dealt);emitGemState(now);
    if(eventType==='damage'){const proc=gemOnDirectHitV1(now,source,target,abilityId,crit);emitGemState(now);if(proc.selfHeal>0&&source.alive){const amount=Math.min(source.definition.stats.maxHp-source.hp,source.definition.stats.maxHp*proc.selfHeal);source.hp+=amount;if(amount>0)events.push({atMs:now,type:'heal',actorId:source.definition.id,targetId:source.definition.id,abilityId:'GEM_RETALIATION',amount:Number(amount.toFixed(2))});}}
    addThreat(target,source,dealt*(effect.threatMultiplier??1)); events.push({atMs:now,type:eventType,actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(dealt.toFixed(2)),...(eventType==='damage'?{critical:crit}:{}),...(absorbed>0?{absorbed:Number(absorbed.toFixed(2))}:{})});
    // Reflect only damage absorbed by the shield that granted this effect. Direct
    // reflection cannot trigger another shield reflection or recurse indefinitely.
    let reflectable=absorbed;
    for(const shield of target.reflectiveShields??[]){
      const used=Math.min(reflectable,shield.remaining);shield.remaining-=used;reflectable-=used;
      const owner=all.find(a=>a.definition.id===shield.sourceId);if(!used||!owner||!source.alive||source===target)continue;
      const reflected=Math.min(source.hp,used*shield.rate);source.hp-=reflected;source.damageTaken+=reflected;owner.damageDone+=reflected;
      events.push({atMs:now,type:'damage',actorId:owner.definition.id,targetId:source.definition.id,abilityId:'COMPANION_REFLECT',amount:Number(reflected.toFixed(2))});
      if(source.hp<=0){source.alive=false;source.downed=source.definition.team==='players';events.push({atMs:now,type:source.downed?'down':'death',targetId:source.definition.id,actorId:owner.definition.id});}
    }
    if(target.reflectiveShields)target.reflectiveShields=target.reflectiveShields.filter(s=>s.remaining>0);
    if(target.hp<=0&&target.alive){gemOnKillV1(now,source,target);emitGemState(now);target.alive=false;target.downed=target.definition.team==='players';events.push({atMs:now,type:target.downed?'down':'death',targetId:target.definition.id,actorId:source.definition.id,abilityId});}
  };
  const applyHeal=(now:number, source:CombatantState,target:CombatantState,effect:AbilityEffect,abilityId:string,eventType:'heal'|'hot_tick'='heal')=>{ if(!target.alive)return; const direct=eventType==='heal',mult=direct?gemHealingMultiplierV1(source,now):1; const amount=Math.max(0,(source.definition.stats.healingPower*(effect.coeff??0)+(effect.flat??0))*mult); const actual=Math.min(amount,target.definition.stats.maxHp-target.hp); target.hp+=actual; source.healingDone+=actual; events.push({atMs:now,type:eventType,actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(actual.toFixed(2))});
    if(direct){const post=gemOnDirectHealV1(now,source,target,amount,actual);if(post.mercyBarrier>0){target.shield+=post.mercyBarrier;events.push({atMs:now,type:'shield',actorId:source.definition.id,targetId:target.definition.id,abilityId:'GEM_MERCY',amount:Number(post.mercyBarrier.toFixed(2))});}if(post.renewalTotal>0){const existing=target.periodic.filter(p=>p.effectId==='GEM_RENEWAL'&&p.sourceId===source.definition.id).sort((a,b)=>a.expiresAt-b.expiresAt);while(existing.length>=post.renewalMax){const remove=existing.shift();if(remove)target.periodic=target.periodic.filter(p=>p!==remove);}const tickMs=2000,ticks=Math.max(1,Math.floor(post.renewalDuration/tickMs));target.periodic.push({sourceId:source.definition.id,effectId:'GEM_RENEWAL',kind:'hot',coeff:0,flat:post.renewalTotal/ticks,nextTickAt:now+tickMs,expiresAt:now+post.renewalDuration,tickMs});}gemConsumeSupportChargeV1(now,source);emitGemState(now);}
    enemies.forEach(e=>{if(e.alive)addThreat(e,source,actual*.5*(effect.threatMultiplier??1));}); };
  const applyEffect=(now:number, source:CombatantState,target:CombatantState,effect:AbilityEffect,abilityId:string)=>{
    if(effect.kind==='damage')return applyDamage(now,source,target,effect,abilityId);
    if(effect.kind==='heal')return applyHeal(now,source,target,effect,abilityId);
    if(effect.kind==='shield'){const amt=Math.max(0,(source.definition.stats.healingPower*(effect.coeff??0)+(effect.flat??0))*gemShieldMultiplierV1(source,now));target.shield+=amt;if(effect.shieldReflectPct&&amt>0)(target.reflectiveShields??=[]).push({remaining:amt,rate:clamp(effect.shieldReflectPct,0,.5),sourceId:source.definition.id});gemOnShieldAppliedV1(now,source,target);gemConsumeSupportChargeV1(now,source);emitGemState(now);events.push({atMs:now,type:'shield',actorId:source.definition.id,targetId:target.definition.id,abilityId,amount:Number(amt.toFixed(2))});return;}
    if(effect.kind==='dot'||effect.kind==='hot'){const expiresAt=now+(effect.durationMs??3000);target.periodic.push({sourceId:source.definition.id,effectId:abilityId,kind:effect.kind,coeff:effect.coeff??0,flat:effect.flat??0,damageType:effect.damageType,nextTickAt:now+(effect.tickMs??1000),expiresAt,tickMs:effect.tickMs??1000});events.push({atMs:now,type:'status_apply',actorId:source.definition.id,targetId:target.definition.id,abilityId,statusKind:effect.kind,statusTag:effect.tag??effect.damageType??effect.kind,expiresAtMs:expiresAt});return;}
    if(effect.kind==='interrupt'){ if(target.casting){ const interruptedAbilityId=target.casting.abilityId,def=target.definition.abilities.find(a=>a.id===interruptedAbilityId); if(def?.interruptible){target.casting=undefined;source.interrupts++;events.push({atMs:now,type:'interrupt',actorId:source.definition.id,targetId:target.definition.id,abilityId,interruptedAbilityId});}} return; }
    if(effect.kind==='taunt'){ if(target.definition.team==='enemies'){const top=Math.max(1,...Object.values(target.threat));target.threat[source.definition.id]=top+Math.max(100,effect.value??100);}return;}
    if(effect.kind==='buff'||effect.kind==='debuff'){const tag=effect.tag??'generic',expiresAt=now+(effect.durationMs??5000);target.modifiers.push({sourceId:source.definition.id,tag,value:effect.value??0,expiresAt,createdAt:now,kind:effect.kind});events.push({atMs:now,type:'status_apply',actorId:source.definition.id,targetId:target.definition.id,abilityId,statusKind:effect.kind,statusTag:tag,expiresAtMs:expiresAt});if(effect.kind==='debuff')gemOnDebuffAppliedV1(now,source,target);else gemOnBuffAppliedV1(now,source,target);emitGemState(now);return;}
  };

  for(let now=0; now<=maxMs; now+=tick){
    for(const state of all){ if(!state.alive)continue; state.modifiers=state.modifiers.filter(m=>m.expiresAt>now);
      for(const p of [...state.periodic]){ if(p.nextTickAt<=now&&p.expiresAt>=now){ const src=all.find(x=>x.definition.id===p.sourceId); if(src?.alive){ const fx:AbilityEffect={kind:p.kind,coeff:p.coeff,flat:p.flat,damageType:p.damageType}; p.kind==='dot'?applyDamage(now,src,state,fx,p.effectId,'dot_tick'):applyHeal(now,src,state,fx,p.effectId,'hot_tick'); } p.nextTickAt+=p.tickMs; } }
      state.periodic=state.periodic.filter(p=>p.expiresAt>now);
    }
    if(!living(enemies).length){events.push({atMs:now,type:'combat_end',detail:'victory'});return{victory:true,durationMs:now,reason:'victory',events,players,enemies};}
    if(!living(players).length){events.push({atMs:now,type:'combat_end',detail:'wipe'});return{victory:false,durationMs:now,reason:'wipe',events,players,enemies};}

    // Generic HP-threshold boss phases. Data declares the phase; engine applies it once.
    for(const boss of living(enemies).filter(x=>x.definition.boss)){
      for(const phase of (boss.definition.phases||[]).sort((a,b)=>b.hpPct-a.hpPct)){
        if(hpPct(boss)<=phase.hpPct && !boss.triggeredPhases.includes(phase.id)){
          boss.triggeredPhases.push(phase.id); events.push({atMs:now,type:'phase',actorId:boss.definition.id,abilityId:phase.id,detail:`hp<=${phase.hpPct}`});gemOnBossPhaseV1(now,players);emitGemState(now);
          for(const fx of phase.effects){ for(const t of targetsFor(phase.target,boss,enemies,players,rng,`${now}:${phase.id}:phase`)) applyEffect(now,boss,t,fx,phase.id); }
        }
      }
    }

    for(const actor of all){ if(!actor.alive)continue; const allies=actor.definition.team==='players'?players:enemies, foes=actor.definition.team==='players'?enemies:players;
      if(actor.casting && actor.casting.completesAt<=now){ const ab=actor.definition.abilities.find(a=>a.id===actor.casting!.abilityId); const target=all.find(x=>x.definition.id===actor.casting!.targetId); actor.casting=undefined; if(ab&&target?.alive){events.push({atMs:now,type:'cast_complete',actorId:actor.definition.id,targetId:target.definition.id,abilityId:ab.id});gemOnAbilityUsedV1(now,actor,ab);emitGemState(now); for(const fx of ab.effects){ for(const t of targetsFor(ab.target,actor,allies,foes,rng,`${now}:${ab.id}:target`))applyEffect(now,actor,t,fx,ab.id); }} }
      if(actor.casting)continue;
      const ready=actor.definition.abilities.filter(a=>(actor.cooldownReadyAt[a.id]??0)<=now&&conditionOk(a,actor,allies,foes)).sort((a,b)=>b.priority-a.priority);
      const ab=ready[0];
      if(ab){ const ts=targetsFor(ab.target,actor,allies,foes,rng,`${now}:${ab.id}:select`); const t=ts[0]; if(t){ actor.cooldownReadyAt[ab.id]=now+Math.round(ab.cooldownMs/Math.max(.25,1+gemEffectiveHasteV1(actor,now))); if(ab.castTimeMs>0){actor.casting={abilityId:ab.id,completesAt:now+ab.castTimeMs,targetId:t.definition.id};events.push({atMs:now,type:'cast_start',actorId:actor.definition.id,targetId:t.definition.id,abilityId:ab.id});}else{gemOnAbilityUsedV1(now,actor,ab);emitGemState(now);for(const fx of ab.effects){for(const x of targetsFor(ab.target,actor,allies,foes,rng,`${now}:${ab.id}:instant`))applyEffect(now,actor,x,fx,ab.id);}} continue; } }
      if(actor.nextBasicAt<=now){ const t=chooseEnemy(actor,foes,rng,`${now}:${actor.definition.id}:basic`); if(t){applyDamage(now,actor,t,{kind:'damage',coeff:actor.definition.basicAttackCoeff,damageType:'physical',threatMultiplier:actor.definition.role==='tank'?2.5:1},'BASIC');actor.nextBasicAt=now+Math.round(actor.definition.basicAttackMs/Math.max(.25,1+gemEffectiveHasteV1(actor,now)));} }
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
