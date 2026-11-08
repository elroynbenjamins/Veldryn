import type {CombatantDefinition} from '../combat/types';
import {pveBarrier,pveDotWave,pveHealingPressure,pveInterruptibleWave} from '../combat/pve-encounter-identity';

/**
 * Server-owned room modifiers. The route generator selects an ID; it never
 * accepts these values from a client. All effects enter the deterministic
 * combat simulation and therefore affect real health, damage and replays.
 *
 * Normal rooms change their combat stats, while optional elite rooms also
 * gain one distinct ability. This prevents repeated mandatory normal fights
 * from compounding into excessive damage across a full dungeon run.
 * Q-Mode and Live use the same rules, and reward budgets stay unchanged.
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

export function applyCoopRoomModifier(enemy:CombatantDefinition,id:string|undefined,index:number,eliteAbilities=false):CombatantDefinition{
 if(!id||!isCoopRoomModifier(id)||id==='steady')return enemy;
 const stats={...enemy.stats};
 let basicAttackMs=enemy.basicAttackMs;
 const abilities=[...enemy.abilities];
 // Only one extra encounter ability per room. The first enemy carries
 // the modifier mechanic so mixed groups remain readable and balanced.
 switch(id){
  case 'thorned':
   stats.maxHp*=1.006;
   if(index===0&&eliteAbilities){
    const thorns=pveDotWave(`${enemy.id}_ROOM_THORNS`,'Thorn Barrage','nature',.08,19500);
    abilities.push({...thorns,effects:thorns.effects.map(effect=>effect.kind==='dot'?{...effect,coeff:.008}:effect)});
   }
   break;
  case 'volatile':
   stats.maxHp*=.985;
   stats.attackPower*=1.012;
   if(index===0&&eliteAbilities)abilities.push(pveInterruptibleWave(`${enemy.id}_ROOM_BLAST`,'Unstable Surge','arcane',.08,19000,1300));
   break;
  case 'warded':
   stats.defense*=1.018;
   if(index===0&&eliteAbilities)abilities.push(pveBarrier(`${enemy.id}_ROOM_WARD`,'Defensive Ward',Math.round(stats.maxHp*.013),21000));
   break;
  case 'swift':
   stats.maxHp*=.996;
   stats.haste=Math.min(.5,stats.haste+.012);
   basicAttackMs=Math.max(1400,Math.round(basicAttackMs*.98));
   break;
  case 'attrition':
   stats.maxHp*=1.009;
   if(index===0&&eliteAbilities){
    const wither=pveHealingPressure(`${enemy.id}_ROOM_WITHER`,'Withering Pressure','shadow',.065,21000);
    abilities.push({...wither,effects:wither.effects.map(effect=>effect.kind==='debuff'?{...effect,value:-.06}:effect)});
   }
   break;
 }
 // Normal rooms are lateral tradeoffs, not six straight difficulty buffs.
 // Elites keep the full mechanics because the player opts into higher risk.
 if(!eliteAbilities){
  switch(id){
   case 'thorned': stats.attackPower*=.94; break;
   case 'volatile': stats.maxHp*=.90; break;
   case 'warded': stats.attackPower*=.94; break;
   case 'swift': stats.maxHp*=.91; break;
   case 'attrition': stats.attackPower*=.94; break;
  }
 }
 return {...enemy,stats,basicAttackMs,abilities};
}
