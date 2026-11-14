import {random01} from './rng';
import type {RegionalHuntPlan} from './ordinary-hunt';
import type {HuntActiveAbility} from './hunt-active-abilities';

/** Discrete, deterministic attacks for an ordinary idle hunt.
 * Timing is derived from the existing kill cycle so XP, drops and AFK pacing
 * do not change. Both settlement and the foreground battle read these events.
 */
export interface HuntHit {
  fraction:number;
  actor:'player'|'enemy'|'fatigue';
  damage:number;
  healing:number;
  critical:boolean;
  index:number;
  /** Budgeted skill that landed on this real player hit. */
  activeAbility?:HuntActiveAbility;
  /** Portion of this landed hit contributed by an equipped companion. */
  companionAssist?:HuntActiveAbility;
  /** Genuine damage blocked by a cooldown-scheduled tank companion guard. */
  guardAbility?:HuntActiveAbility;
  /** Healing assist tagged at the first eligible real heal tick after cooldown. */
  supportAbility?:HuntActiveAbility;
}
export interface HuntHitInput {
  monsterHp:number;
  basePlayerHit:number;
  incomingDamage:number;
  healingPerEncounter:number;
  cycleSeconds:number;
  critChance:number;
  seed:string;
}
const clamp=(value:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,value));
const finite=(value:number,fallback:number)=>Number.isFinite(value)?value:fallback;

/** Same offensive stat model used for the old combat preview, before cadence normalization. */
export function huntBasePlayerHit(attack:number,defense:number,outputMultiplier=1){
  return Math.max(1,Math.round((Math.max(1,attack)*1.35-Math.max(0,defense)*.45)*Math.max(.1,outputMultiplier)));
}
export function huntHitEvents(input:HuntHitInput):HuntHit[]{
  const monsterHp=Math.max(1,Math.round(finite(input.monsterHp,1)));
  const base=Math.max(1,finite(input.basePlayerHit,1));
  // A stronger attack gives fewer, larger blows. Keep a bounded animation/event
  // count to avoid making offline simulation expensive or altering kill cadence.
  // Low-HP enemies cannot receive more positive-damage attacks than their HP.
  const playerCount=Math.min(monsterHp,clamp(Math.ceil(monsterHp/base),3,8));
  const enemyCount=clamp(Math.round(Math.max(1,finite(input.cycleSeconds,1))/2.5),2,5);
  const critChance=clamp(finite(input.critChance,0),0,.65);
  const weights:Array<{raw:number;critical:boolean}>=[];
  for(let i=0;i<playerCount;i++){
    const critical=random01(input.seed+':critical',i)<critChance;
    const variance=.9+random01(input.seed+':variance',i)*.2;
    weights.push({raw:base*variance*(critical?1.5:1),critical});
  }
  const total=weights.reduce((sum,hit)=>sum+hit.raw,0);
  let remaining=monsterHp;
  const hits:HuntHit[]=[];
  for(let i=0;i<playerCount;i++){
    // Exact HP damage: the final blow removes the remaining HP. No fake
    // continuously shrinking HP bar or a separate visual-only damage roll.
    const damage=i===playerCount-1?remaining:Math.max(1,Math.min(remaining-(playerCount-i-1),Math.round(monsterHp*weights[i].raw/total)));
    remaining-=damage;
    hits.push({fraction:(i+1)/playerCount,actor:'player',damage,healing:0,critical:weights[i].critical,index:i});
  }
  const incoming=Math.max(0,finite(input.incomingDamage,0));
  const healing=Math.max(0,finite(input.healingPerEncounter,0));
  for(let i=0;i<enemyCount;i++){
    hits.push({fraction:(i+.55)/enemyCount,actor:'enemy',damage:incoming/enemyCount,healing:healing/enemyCount,critical:false,index:i});
  }
  return hits.sort((a,b)=>a.fraction-b.fraction||(a.actor==='enemy'?-1:1));
}
/** Real per-strike settlement for ordinary launch-region hunts. Searching
 * has no monster attacks; fatigue is charged once when the encounter ends,
 * without fabricating a visible enemy hit. */
export function regionalHuntHits(plan:RegionalHuntPlan,input:{monsterDamage:number;fatigueDamage:number;healingPerEncounter:number}):HuntHit[]{
  const attacks=Math.max(1,plan.enemyAttackCount);
  const hits:HuntHit[]=plan.strikes.map((strike,index)=>({
    fraction:Math.min(1,strike.atSeconds/plan.cycleSeconds),
    actor:strike.actor,
    damage:strike.actor==='enemy'?Math.max(0,input.monsterDamage)/attacks:strike.damage,
    healing:0,
    critical:strike.critical,
    index,
  }));
  // Fatigue lands just before the finishing blow and cannot retroactively
  // prevent a lethal monster strike. It is not a monster attack animation.
  const fatigueFraction=Math.max(0,1-0.00001);
  hits.push({fraction:fatigueFraction,actor:'fatigue',damage:Math.max(0,input.fatigueDamage),healing:Math.max(0,input.healingPerEncounter),critical:false,index:hits.length});
  return hits.sort((a,b)=>a.fraction-b.fraction||(a.actor==='fatigue'?-1:a.actor==='enemy'?-1:1));
}
export function huntHitsBetween(events:readonly HuntHit[],fromFraction:number,toFraction:number):HuntHit[]{
  const from=clamp(finite(fromFraction,0),0,1),to=clamp(finite(toFraction,0),0,1);
  return events.filter(hit=>hit.fraction>from+1e-9&&hit.fraction<=to+1e-9);
}
export function huntEnemyHpAt(monsterHp:number,events:readonly HuntHit[],progressFraction:number){
  const hp=Math.max(1,Math.round(monsterHp));
  return Math.max(0,hp-events.reduce((sum,hit)=>sum+(hit.actor==='player'&&hit.fraction<=progressFraction+1e-9?hit.damage:0),0));
}
