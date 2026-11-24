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
 const assistIds=new Set(player.abilities.filter(a=>a.tags?.includes('combat_companion')).map(a=>a.id));
 const assistEvents=events.filter(e=>e.actorId===player.id&&e.abilityId!==undefined&&assistIds.has(e.abilityId));
 const count=(type:CombatEvent['type'],actorId:string)=>events.filter(e=>e.type===type&&e.actorId===actorId).length;
 const sum=(predicate:(e:CombatEvent)=>boolean,field:'amount'|'absorbed')=>events.filter(predicate).reduce((n,e)=>n+Math.max(0,e[field]??0),0);
 return {boss:input.boss,role:player.role,classId:player.classId??'',durationMs:result.durationMs,reason:result.reason,
  survived:hero.alive,actualBossHpRemoved:Math.max(0,boss.stats.maxHp-enemy.hp),
  rawDamage:hero.damageDone,damageTaken:hero.damageTaken,effectiveHealing:hero.healingDone,
  shieldAbsorbed:sum(e=>e.targetId===player.id&&(e.type==='damage'||e.type==='dot_tick'),'absorbed'),
  interrupts:hero.interrupts,cleanses:count('status_remove',player.id),
  // Companion assists are abilities of the owner, NOT extra combatants.
  // Only directly attributable events are reported; indirect buffs/reflect and
  // effective absorbed shield ownership cannot be inferred from these totals.
  companionDirectDamage:assistEvents.filter(e=>e.type==='damage'||e.type==='dot_tick').reduce((n,e)=>n+(e.amount??0),0),
  companionEffectiveHealing:assistEvents.filter(e=>e.type==='heal'||e.type==='hot_tick').reduce((n,e)=>n+(e.amount??0),0),
  companionShieldGranted:assistEvents.filter(e=>e.type==='shield').reduce((n,e)=>n+(e.amount??0),0),
  companionInterrupts:assistEvents.filter(e=>e.type==='interrupt').length,
  companionCleanses:assistEvents.filter(e=>e.type==='status_remove').length,
  companionAbilityEvents:assistEvents.length,
  bossCastWarnings:count('cast_start',boss.id),bossPhases:count('phase',boss.id),
  events,attemptConsumed:false as const,rewardGranted:false as const,sharedHpWritten:false as const,
  contribution:null,liveEnabled:WEEKLY_GUILD_ENGINE_RELEASED,
 };
}

/** Source-aligned legacy diagnostic only. Inputs must be the raw stat units
 * from the old SQL; fixture effective stats are a labelled proxy, not DB proof.
 * Assumes roll 1.0, no guild-skill bonuses, and a fresh weekly personal cap.
 * Never compare its absolute score with engine HP loss as equivalent units. */
export function previewLegacyWeeklyScore(input:{boss:WeeklyGuildBoss;role:'tank'|'damage'|'support';attack:number;defense:number;hp:number;level:number;companionLevel?:number;companionBond?:number;sharedMaxHp:number;personalAlready:number}){
 const {boss,role,attack:a,defense:d,hp:h,level:l,sharedMaxHp,personalAlready}=input;
 if(!WEEKLY_GUILD_BOSSES.includes(boss)||!['tank','damage','support'].includes(role)||!valid(a)||!valid(h)||!valid(l)||!Number.isFinite(d)||d<0||!Number.isSafeInteger(sharedMaxHp)||sharedMaxHp<=0||!Number.isSafeInteger(personalAlready)||personalAlready<0)throw Error('invalid_legacy_review_input');
 if(input.companionLevel!==undefined&&(!Number.isInteger(input.companionLevel)||input.companionLevel<1||input.companionLevel>35||!Number.isInteger(input.companionBond)||input.companionBond!<1||input.companionBond!>10))throw Error('invalid_legacy_companion_review_input');
 const baseline=a*180+d*35+h*2+l*450;
 const focus=boss===WEEKLY_GUILD_BOSSES[0]?'tank':boss===WEEKLY_GUILD_BOSSES[1]?'damage':'support';
 const focusScore=focus==='tank'?d*110+h*3+l*265:focus==='damage'?a*250+l*265:a*90+d*90+h*3+l*240;
 const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
 const factor=Number(clamp(.65+.35*clamp(focusScore/baseline*1.35,.80,1.20)*(role===focus?1.32:.80),.82,1.18).toFixed(4));
 const character=Math.floor(Math.floor(baseline)*factor);
 const companion=input.companionLevel===undefined?0:Math.floor(character*(.06+input.companionLevel*.006+input.companionBond!*.004));
 const perAttempt=Math.ceil(sharedMaxHp*.11*Math.min(1,factor)),personalCap=Math.ceil(sharedMaxHp*.28*Math.min(1,factor));
 const remaining=Math.max(0,personalCap-personalAlready);
 return {factor,uncapped:character+companion,perAttempt,personalCap,capReached:remaining===0,
  capped:Math.min(character+companion,perAttempt,remaining),liveEnabled:false as const};
}
