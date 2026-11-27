/**
 * Hidden World Boss V91B authored LOCAL combat rehearsal.
 * Source identities from the V25 script; all numbers are QA candidates.
 * Frozen worldwide phase chooses the profile. No local HP phase transitions.
 * The engine's ordinary shield is a Guard analogue, not canonical Guard.
 * No global health settlement, official encounter profile or reward authority.
 */
import type {AbilityDefinition,AbilityEffect,CombatantDefinition,CombatStats} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';

export const WORLD_BOSS_AUTHORED_REVIEW_LIVE=false as const;
export type WorldBossReviewId='hollowroot'|'sunscar'|'frostmarch';
export type WorldBossReviewPhase='armored'|'exposed'|'enraged';
const names:Record<WorldBossReviewId,string>={hollowroot:'Hollowroot',sunscar:'Solbrand',frostmarch:'Rimewarden'};
const direct=(coeff:number,damageType:AbilityEffect['damageType']):AbilityEffect=>({kind:'damage',coeff,damageType});
const dot=(coeff:number,damageType:AbilityEffect['damageType'],tag:string):AbilityEffect=>({
 kind:'dot',coeff,damageType,tag,durationMs:4000,tickMs:1000,removable:true,
});
const debuff=(tag:string,value:number):AbilityEffect=>({kind:'debuff',tag,value,durationMs:4000,removable:true});
const cast=(id:string,name:string,target:AbilityDefinition['target'],effects:AbilityEffect[],
 cooldownMs=8000,castTimeMs=1500,interruptible=true,priority=90):AbilityDefinition=>({
 id:'WB2_'+id,name,target,effects,cooldownMs,castTimeMs,interruptible,priority,
});
function authoredCasts(boss:WorldBossReviewId,phase:WorldBossReviewPhase):AbilityDefinition[]{
 if(boss==='hollowroot'){
  if(phase==='armored')return [
   cast('ROOT_SLAM','Root Slam','current_target',[direct(1.25,'physical')]),
   cast('THORN_SWEEP','Thorn Sweep','all_enemies',[direct(.45,'nature'),dot(.12,'nature','poison')],11000,1200,true,75)];
  if(phase==='exposed')return [
   cast('SPOREBURST','Sporeburst','all_enemies',[direct(.45,'nature'),dot(.18,'nature','poison')]),
   cast('VINES','Grasping Vines','random_enemy',[direct(.50,'nature'),debuff('haste',-.15)],10000,1200,true,75)];
  return [
   cast('SPLINTERSTORM','Splinterstorm','all_enemies',[direct(.85,'physical'),dot(.16,'nature','poison')],8000,1800,true),
   cast('ROOT_SLAM','Root Slam','current_target',[direct(1.4,'physical')],10500,1400,true,75)];
 }
 if(boss==='sunscar'){
  if(phase==='armored')return [
   cast('SANDBREAKER','Sandbreaker','current_target',[direct(1.3,'physical')]),
   cast('HEAT_HAZE','Heat Haze','all_enemies',[direct(.35,'fire'),dot(.13,'fire','burn')],11000,1200,true,75)];
  if(phase==='exposed')return [
   cast('BURNING_TEMPEST','Burning Tempest','all_enemies',[direct(.80,'fire'),dot(.12,'fire','burn')],8500,1800,true),
   cast('SCORCH_MARK','Scorch Mark','random_enemy',[direct(.60,'fire'),debuff('damage_taken',.12)],11000,1200,true,75)];
  return [
   cast('SOLAR_COLLAPSE','Solar Collapse','all_enemies',[direct(1.15,'fire')],9500,2000,true),
   cast('DESERT_FURY','Desert Fury','current_target',[direct(1.4,'physical'),dot(.12,'fire','burn')],10000,1400,true,75)];
 }
 if(boss==='frostmarch'){
  if(phase==='armored')return [
   cast('ICE_SPEAR','Ice Spear','current_target',[direct(1.15,'ice'),debuff('haste',-.12)]),
   cast('SHARD_VOLLEY','Shard Volley','all_enemies',[direct(.55,'ice')],11000,1200,true,75)];
  if(phase==='exposed')return [
   cast('FREEZING_CHAINS','Freezing Chains','random_enemy',[direct(.65,'ice'),debuff('haste',-.20)]),
   cast('FROSTBITE','Frostbite','all_enemies',[dot(.20,'ice','frostbite')],11000,1400,true,75)];
  return [
   cast('WHITEOUT','Whiteout','all_enemies',[direct(.8,'ice'),debuff('haste',-.18)],9000,1800,true),
   cast('GLACIAL_REPRISAL','Glacial Reprisal','current_target',[direct(1.4,'ice')],10500,1500,true,75)];
 }
 throw Error('world_boss_review_unknown_boss');
}
export interface WorldBossAuthoredProfileReviewV2{
 readonly bossId:WorldBossReviewId;
 readonly phase:WorldBossReviewPhase;
 readonly level:number;
 /** Independent QA threat profile, not derived from attacker stats. */
 readonly stats:CombatStats;
 readonly localShieldAmount:number;
}
export function buildWorldBossAuthoredReviewV2(profile:WorldBossAuthoredProfileReviewV2){
 if(!profile||!Object.prototype.hasOwnProperty.call(names,profile.bossId)||!['armored','exposed','enraged'].includes(profile.phase)||
  !Number.isSafeInteger(profile.level)||profile.level<1||profile.level>100||
  !profile.stats||!Number.isFinite(profile.stats.maxHp)||profile.stats.maxHp<=0||
  !Number.isFinite(profile.stats.attackPower)||profile.stats.attackPower<=0||
  profile.stats.critMultiplier<1||profile.stats.critChance>1||
  !Number.isFinite(profile.localShieldAmount)||profile.localShieldAmount<0||
  profile.localShieldAmount>profile.stats.maxHp*.10||
  ['maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste'].some(key=>{
    const value=profile.stats[key as keyof CombatStats];return !Number.isFinite(value)||value<0||value>1e12;
  }))
  throw Error('world_boss_review_invalid_profile');
 const abilities=authoredCasts(profile.bossId,profile.phase);
 if(profile.localShieldAmount>0){
  const guardId=profile.bossId==='frostmarch'?'ICEBOUND_AEGIS':profile.bossId==='sunscar'?'SOLAR_PLATE':'WITHERING_BARK';
  abilities.unshift(cast(guardId,guardId==='ICEBOUND_AEGIS'?'Icebound Aegis':guardId==='SOLAR_PLATE'?'Solar Plate':'Withering Bark',
   'self',[{kind:'shield',flat:profile.localShieldAmount}],22000,1000,true,100));
 }
 const definition:CombatantDefinition={id:profile.bossId,name:names[profile.bossId],
  team:'enemies',role:'enemy',boss:true,level:profile.level,stats:{...profile.stats},
  basicAttackMs:2800,basicAttackCoeff:.7,abilities};
 return {definition,digest:enemyV2SnapshotDigest(definition),
  phase:profile.phase,localShieldOnly:true as const,releaseReady:false as const};
}
