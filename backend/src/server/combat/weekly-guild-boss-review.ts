/** Weekly Guild Hunt shared-engine experiment, NOT a live raid route.
 * All inputs are synthetic fixtures or internal review inputs. No contribution
 * conversion, attempt reservation, payout, shared HP or persisted replay.
 */
import {simulateCombat} from './engine';
import type {AbilityDefinition,CombatantDefinition,CombatEvent} from './types';

export const WEEKLY_GUILD_ENGINE_RELEASED=false as const;
export const WEEKLY_GUILD_ATTEMPT_MS=180_000;
export const WEEKLY_GUILD_BOSSES=['Fallen Oathbreaker','Granite Moss Troll','Veilbound Revenant'] as const;
export type WeeklyGuildBoss=typeof WEEKLY_GUILD_BOSSES[number];
export interface WeeklyGuildReference {attack:number;defense:number;maxHp:number}
const valid=(n:number)=>Number.isFinite(n)&&n>0&&n<=1e8;
export function weeklyGuildBossProfile(name:WeeklyGuildBoss,ref:WeeklyGuildReference):CombatantDefinition {
 if(!WEEKLY_GUILD_BOSSES.includes(name)||!valid(ref.attack)||!valid(ref.maxHp)||!Number.isFinite(ref.defense)||ref.defense<0||ref.defense>1e8)throw Error('invalid_weekly_guild_reference');
 // One fixed cohort reference per review bracket, never scale to the attacking hero.
 // Numbers are provisional; shared guild HP and contribution caps are not modelled.
 const cast=(id:string,label:string,cooldownMs:number,effects:AbilityDefinition['effects'],target:AbilityDefinition['target']='current_target'):AbilityDefinition=>({
  id,name:label,priority:95,cooldownMs,castTimeMs:1500,target,interruptible:true,effects,
 });
 const physical=(coeff:number)=>({kind:'damage' as const,coeff,damageType:'physical' as const});
 const shadow=(coeff:number)=>({kind:'damage' as const,coeff,damageType:'shadow' as const});
 const oath=name==='Fallen Oathbreaker',troll=name==='Granite Moss Troll';
 const abilities=oath?[
  cast('WG_OATH_CLEAVE','Oathbreaker Cleave',7800,[physical(1.65)]),
  cast('WG_OATH_MARK','Shattered Oath',12500,[physical(.65),{kind:'debuff',tag:'damage_taken',value:.12,durationMs:7000}]),
 ]:troll?[
  cast('WG_TROLL_QUAKE','Seismic Swing',9000,[physical(1.25)],'all_enemies'),
  cast('WG_TROLL_BARK','Stonehide',14500,[{kind:'shield',flat:ref.attack*3}], 'self'),
 ]:[
  cast('WG_VEIL_CURSE','Veil Curse',9200,[shadow(.70),{kind:'dot',coeff:.16,damageType:'shadow',durationMs:8000,tickMs:2000,tag:'weekly_veil_curse'}]),
  cast('WG_VEIL_PULSE','Soul Pulse',12000,[shadow(1.1)],'all_enemies'),
 ];
 return {id:oath?'WG_OATH':troll?'WG_TROLL':'WG_VEIL',name,team:'enemies',role:'enemy',level:25,boss:true,
  basicAttackMs:3000,basicAttackCoeff:.48,
  stats:{maxHp:Math.max(2500,ref.attack*105),attackPower:ref.attack*(oath?1.05:troll?.95:.88),healingPower:0,defense:ref.defense*(troll?1.05:.8),accuracy:700,evasion:130,critChance:.03,critMultiplier:1.5,haste:0},
  abilities,
  phases:[{id:'WG_PHASE_60',name:'Escalation',hpPct:.60,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.12,durationMs:20000}]},
   {id:'WG_PHASE_30',name:'Final Stand',hpPct:.30,target:'all_enemies',effects:[oath||troll?physical(.95):shadow(.95)]}],
  tags:['weekly-guild-review-only'],
 };
}
export function previewWeeklyGuildCombat(input:{boss:WeeklyGuildBoss;reference:WeeklyGuildReference;player:CombatantDefinition;seed:string}){
 const {player,seed}=input;
 if(typeof seed!=='string'||seed.length<4||seed.length>160||player.team!=='players'||!['tank','damage','support'].includes(player.role)||!valid(player.stats.maxHp)||!valid(player.stats.attackPower))throw Error('invalid_weekly_guild_actor');
 const boss=weeklyGuildBossProfile(input.boss,input.reference);
 if(player.id===boss.id)throw Error('weekly_guild_actor_collision');
 const result=simulateCombat({seed,players:[player],enemies:[boss],maxDurationMs:WEEKLY_GUILD_ATTEMPT_MS,tickMs:100});
 const hero=result.players[0],enemy=result.enemies[0];
 const events=result.events;
 const count=(type:CombatEvent['type'],actorId:string)=>events.filter(e=>e.type===type&&e.actorId===actorId).length;
 const sum=(predicate:(e:CombatEvent)=>boolean,field:'amount'|'absorbed')=>events.filter(predicate).reduce((n,e)=>n+Math.max(0,e[field]??0),0);
 return {boss:input.boss,role:player.role,classId:player.classId??'',durationMs:result.durationMs,reason:result.reason,
  survived:hero.alive,actualBossHpRemoved:Math.max(0,boss.stats.maxHp-enemy.hp),
  rawDamage:hero.damageDone,damageTaken:hero.damageTaken,effectiveHealing:hero.healingDone,
  shieldAbsorbed:sum(e=>e.targetId===player.id&&(e.type==='damage'||e.type==='dot_tick'),'absorbed'),
  interrupts:hero.interrupts,cleanses:count('status_remove',player.id),
  bossCastWarnings:count('cast_start',boss.id),bossPhases:count('phase',boss.id),
  events,attemptConsumed:false as const,rewardGranted:false as const,sharedHpWritten:false as const,
  contribution:null,liveEnabled:WEEKLY_GUILD_ENGINE_RELEASED,
 };
}
