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
   stats.maxHp*=1.03;
   if(index===0)abilities.push(pveDotWave(`${enemy.id}_ROOM_THORNS`,'Thorn Barrage','nature',.17,15500));
   break;
  case 'volatile':
   stats.maxHp*=.93;
   stats.attackPower*=1.06;
   if(index===0)abilities.push(pveInterruptibleWave(`${enemy.id}_ROOM_BLAST`,'Unstable Surge','arcane',.27,15000,1300));
   break;
  case 'warded':
   stats.defense*=1.09;
   if(index===0)abilities.push(pveBarrier(`${enemy.id}_ROOM_WARD`,'Defensive Ward',Math.round(stats.maxHp*.055),17000));
   break;
  case 'swift':
   stats.maxHp*=.97;
   stats.haste=Math.min(.5,stats.haste+.045);
   basicAttackMs=Math.max(1400,Math.round(basicAttackMs*.92));
   break;
  case 'attrition':
   stats.maxHp*=1.035;
   if(index===0)abilities.push(pveHealingPressure(`${enemy.id}_ROOM_WITHER`,'Withering Pressure','shadow',.20,17000));
   break;
 }
 return {...enemy,stats,basicAttackMs,abilities};
}
