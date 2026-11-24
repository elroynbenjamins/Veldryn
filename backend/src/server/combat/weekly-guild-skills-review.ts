/** Private Guild Boss review only. Projection must originate from the
 * service-role guild_skill_effects_server_v1 read, never player JSON.
 * Candidate mapping to real combat, NOT a change to released Guild Skills.
 */
import type {CombatantDefinition} from './types';
export interface WeeklyGuildSkillProjection{
 schemaVersion:number;guildId:string|null;guildBossDamageBps?:number;guildDefenceBps?:number;guildSupportBps?:number;
}
export function freezeWeeklyGuildSkills(guildId:string,projection?:WeeklyGuildSkillProjection){
 const zero={damageBps:0,defenceBps:0,supportBps:0};
 if(!projection||projection.schemaVersion!==1||projection.guildId!==guildId)return zero;
 const bps=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(600,Math.floor(value))):0;
 return {damageBps:bps(projection.guildBossDamageBps),defenceBps:bps(projection.guildDefenceBps),supportBps:bps(projection.guildSupportBps)};
}
export function applyWeeklyGuildSkills(actor:CombatantDefinition,bonuses:ReturnType<typeof freezeWeeklyGuildSkills>):CombatantDefinition{
 if(Object.values(bonuses).some(v=>!Number.isSafeInteger(v)||v<0||v>600))throw Error('invalid_weekly_guild_skill_bonus');
 const result=structuredClone(actor);
 const marker='weekly_review_guild_skills';
 if(result.tags?.includes(marker))throw Error('weekly_guild_skills_already_applied');
 // Boss damage affects the attack stat once; defence improves defence once.
 // Support strengthens ONLY companion assist coefficients/flat values, not
 // duration, interrupt chance, cooldown or the owner's non-companion skills.
 const damage=1+bonuses.damageBps/10000,defence=1+bonuses.defenceBps/10000,support=1+bonuses.supportBps/10000;
 result.stats={...result.stats,attackPower:result.stats.attackPower*damage,defense:result.stats.defense*defence};
 result.abilities=result.abilities.map(ability=>!ability.tags?.includes('combat_companion')?ability:{...ability,effects:ability.effects.map(effect=>{
  if(!['damage','dot','heal','hot','shield'].includes(effect.kind))return effect;
  return {...effect,...(effect.coeff===undefined?{}:{coeff:effect.coeff*support}),...(effect.flat===undefined?{}:{flat:effect.flat*support})};
 })});
 result.tags=[...(result.tags??[]),marker];
 return result;
}
