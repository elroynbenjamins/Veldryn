import type {CombatantDefinition} from '../combat/types';
import {pveBarrier,pveDotWave,pveHealingPressure,pveInterruptibleWave} from '../combat/pve-encounter-identity';

/**
 * Server-owned room modifiers. The route generator selects an ID; it never
 * accepts these values from a client. All effects enter the deterministic
 * combat simulation and therefore affect real health, damage and replays.
 *
 * Keep modest per-room pressure: Q-Mode and Live have the same mechanics,
 * and no existing route reward or tier multiplier is changed.
 */
export const COOP_ROOM_MODIFIERS={
 steady:{name:'Steady',description:'Standard encounter. No extra effects.'},
 thorned:{name:'Thorned',description:'Enemies spread damaging thorns over time.'},
 volatile:{name:'Volatile',description:'More aggressive enemies with lower health and an interruptible blast.'},
 warded:{name:'Warded',description:'Enemies have stronger defenses and can raise a barrier.'},
 swift:{name:'Swift',description:'Enemies attack more quickly but have slightly less health.'},
 attrition:{name:'Attrition',description:'Enemies endure longer and can reduce incoming healing.'},
} as const;
export type CoopRoomModifierId=keyof typeof COOP_ROOM_MODIFIERS;
export const isCoopRoomModifier=(value:string):value is CoopRoomModifierId=>Object.prototype.hasOwnProperty.call(COOP_ROOM_MODIFIERS,value);

export function applyCoopRoomModifier(enemy:CombatantDefinition,id:string|undefined,index:number):CombatantDefinition{
 if(!id||!isCoopRoomModifier(id)||id==='steady')return enemy;
 const stats={...enemy.stats};
 let basicAttackMs=enemy.basicAttackMs;
 const abilities=[...enemy.abilities];
 // Only one extra encounter ability per room. The first enemy carries
 // the modifier mechanic so mixed groups remain readable and balanced.
 switch(id){
  case 'thorned':
   stats.maxHp*=1.01;
   if(index===0){
    const thorns=pveDotWave(`${enemy.id}_ROOM_THORNS`,'Thorn Barrage','nature',.10,17000);
    abilities.push({...thorns,effects:thorns.effects.map(effect=>effect.kind==='dot'?{...effect,coeff:.018}:effect)});
   }
   break;
  case 'volatile':
   stats.maxHp*=.97;
   stats.attackPower*=1.02;
   if(index===0)abilities.push(pveInterruptibleWave(`${enemy.id}_ROOM_BLAST`,'Unstable Surge','arcane',.13,17000,1300));
   break;
  case 'warded':
   stats.defense*=1.035;
   if(index===0)abilities.push(pveBarrier(`${enemy.id}_ROOM_WARD`,'Defensive Ward',Math.round(stats.maxHp*.025),18500));
   break;
  case 'swift':
   stats.maxHp*=.99;
   stats.haste=Math.min(.5,stats.haste+.02);
   basicAttackMs=Math.max(1400,Math.round(basicAttackMs*.96));
   break;
  case 'attrition':
   stats.maxHp*=1.015;
   if(index===0){
    const wither=pveHealingPressure(`${enemy.id}_ROOM_WITHER`,'Withering Pressure','shadow',.10,19000);
    abilities.push({...wither,effects:wither.effects.map(effect=>effect.kind==='debuff'?{...effect,value:-.10}:effect)});
   }
   break;
 }
 return {...enemy,stats,basicAttackMs,abilities};
}
