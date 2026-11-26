import type {CombatRng} from './deterministic-rng';
import type {AbilityDefinition,CombatantState,TargetRule} from './types';

// Shared read-only combat state queries. Preserve legacy targeting and RNG labels.
export function living(xs: CombatantState[]) { return xs.filter(x=>x.alive); }
export function hpPct(x: CombatantState) { return x.hp / Math.max(1, x.definition.stats.maxHp); }

export function modifier(state: CombatantState, tag: string, now: number): number {
  let total=0;
  for(const m of state.modifiers)if(m.tag===tag&&m.expiresAt>now)total+=m.value;
  return total;
}

export function chooseEnemy(actor: CombatantState, enemies: CombatantState[], rng: CombatRng, label: string): CombatantState | undefined {
  const live=living(enemies); if (!live.length) return undefined;
  if (actor.definition.team === 'enemies') {
    const tank = live.find(x=>x.definition.role==='tank');
    if (tank) return tank;
    return live.reduce((a,b)=>((actor.threat[b.definition.id]||0)>(actor.threat[a.definition.id]||0)?b:a), live[0]);
  }
  return rng.pick(live,label);
}

export function threatenedAlly(allies:CombatantState[],enemies:CombatantState[]):CombatantState|undefined{
  const liveAllies=new Map(living(allies).map(ally=>[ally.definition.id,ally]));
  let best:{enemy:CombatantState;target:CombatantState;completesAt:number}|undefined;
  for(const enemy of enemies){
    if(!enemy.alive||!enemy.casting)continue;
    const ability=enemy.definition.abilities.find(item=>item.id===enemy.casting!.abilityId);
    if(!ability||ability.target==='all_enemies'||ability.target==='all_allies'||ability.target==='self')continue;
    const target=liveAllies.get(enemy.casting.targetId);if(!target)continue;
    if(!ability.effects.some(effect=>effect.kind==='damage'||effect.kind==='dot'))continue;
    const completesAt=enemy.casting.completesAt;
    // Same stable ordering as the original sort; keep the first exact tie.
    if(!best||(completesAt-best.completesAt||
      Number(Boolean(best.enemy.definition.boss))-Number(Boolean(enemy.definition.boss))||
      enemy.definition.id.localeCompare(best.enemy.definition.id))<0)
      best={enemy,target,completesAt};
  }
  return best?.target;
}

export function targetsFor(rule: TargetRule, actor: CombatantState, allies: CombatantState[], enemies: CombatantState[], rng: CombatRng, label: string): CombatantState[] {
  switch(rule) {
    case 'self': return [actor];
    case 'lowest_hp_ally': { const live=living(allies); return live.length ? [live.reduce((a,b)=>hpPct(b)<hpPct(a)?b:a)] : []; }
    case 'lowest_hp_ally_with_dot': { // Preserve Forge cleanse targeting until V2 debuff resolution is reconciled.
      const live=living(allies),affected=live.filter(x=>x.periodic.some(p=>p.kind==='dot')),candidates=affected.length?affected:live;
      return candidates.length?[candidates.reduce((a,b)=>hpPct(b)<hpPct(a)?b:a)]:[]; }
    case 'two_lowest_hp_allies':return [...living(allies)].sort((a,b)=>hpPct(a)-hpPct(b)||a.definition.id.localeCompare(b.definition.id)).slice(0,2);
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

export function conditionOk(a: AbilityDefinition, actor: CombatantState, allies: CombatantState[], enemies: CombatantState[]) {
  switch(a.aiCondition || 'always') {
    case 'self_below_50': return hpPct(actor)<0.5;
    case 'ally_below_50': return living(allies).some(x=>hpPct(x)<0.5);
    case 'ally_below_50_or_dot': return living(allies).some(x=>hpPct(x)<0.5||x.periodic.some(p=>p.kind==='dot'));
    case 'ally_below_80': return living(allies).some(x=>hpPct(x)<0.8);
    case 'ally_below_80_or_targeted': return Boolean(threatenedAlly(allies,enemies))||living(allies).some(x=>hpPct(x)<0.8);
    case 'target_casting': return living(enemies).some(x=>!!x.casting && (x.definition.abilities.find(z=>z.id===x.casting!.abilityId)?.interruptible ?? false));
    case 'multiple_enemies': return living(enemies).length>=2;
    default: return true;
  }
}

// Use only within a read-only decision, never across effect execution or actors.
// Map.has is necessary because undefined is a valid cached answer.
export function memoizeCombatQuery<K,V>(query:(key:K)=>V):(key:K)=>V{
  const cache=new Map<K,V>();
  return key=>{
    if(cache.has(key))return cache.get(key) as V;
    const value=query(key);cache.set(key,value);return value;
  };
}
