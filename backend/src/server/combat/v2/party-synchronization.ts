/**
 * Hidden Combat 2.0 party Synchronization plan (review only).
 * No XP, persistence, personal CP, account relationship or client-supplied bonuses.
 * The caller must derive the actual participating roster from authenticated
 * encounter state; this pure resolver is not itself an authentication boundary.
 * This output is not executable combat authority.
 */
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';

export const PARTY_SYNCHRONIZATION_RULESET_V2='party-sync-v2-draft-1';
export type SyncModeV2='dungeon'|'party_contract'|'party_event'|'guild_pve'|'solo'|'individual_world_boss';
export interface SyncParticipantV2 {
 readonly characterId:string;
 readonly classId:ClassIdV2;
}
export type SyncStatV2=
 'healing_received_pct'|'shield_strength_pct'|'damage_reduction_pct'|
 'dot_strength_pct'|'lifesteal_strength_pct'|'damage_vs_debuffed_pct'|
 'armor_pct'|'ward_strength_pct'|'crit_chance_pp'|'crit_damage_pct'|
 'accuracy_pct'|'physical_damage_pct'|'execute_damage_pct'|
 'healing_done_pct'|'resource_generation_pct'|'harmful_effect_resist_pct'|
 'armor_penetration_pct'|'haste_pct'|'evasion_rating_pct'|
 'damage_vs_shielded_pct'|'low_hp_damage_pct'|'interrupt_recovery_pct'|'penetration_pct';
type Bonus=readonly [SyncStatV2,number]; // 100 bps = 1%; pp keys are absolute points.
export type SyncValueKindV2='percent'|'percentage_points';
export function partySynchronizationStatValueKindV2(stat:SyncStatV2):SyncValueKindV2{
 // Penetration is additive to the bypass fraction in the combat engine.
 return stat==='crit_chance_pp'||stat==='armor_penetration_pct'||stat==='penetration_pct'?'percentage_points':'percent';
}
interface Pair {
 readonly id:string;readonly name:string;
 readonly classes:readonly [ClassIdV2,ClassIdV2];
 readonly bonuses:readonly Bonus[];
}
const pair=(id:string,name:string,a:ClassIdV2,b:ClassIdV2,...bonuses:Bonus[]):Pair=>
 ({id,name,classes:[a,b],bonuses});
const CATALOG:readonly Pair[]=[
 pair('radiant_covenant','Radiant Covenant','BASTION','DAWNKEEPER',['healing_received_pct',500],['shield_strength_pct',400],['damage_reduction_pct',300]),
 pair('umbral_covenant','Umbral Covenant','DREADGUARD','HEXWEAVER',['dot_strength_pct',500],['lifesteal_strength_pct',400],['damage_vs_debuffed_pct',300]),
 pair('runebound_pact','Runebound Pact','IRONWARDEN','STONECALLER',['armor_pct',500],['ward_strength_pct',500],['shield_strength_pct',300]),
 pair('predators_instinct',"Predator's Instinct",'WAYFINDER','KNIFE_DANCER',['crit_chance_pp',200],['crit_damage_pct',500],['accuracy_pct',300]),
 pair('bloodbound_fury','Bloodbound Fury','DREADGUARD','RAVAGER',['physical_damage_pct',300],['execute_damage_pct',500],['lifesteal_strength_pct',300]),
 pair('mystic_harmony','Mystic Harmony','DAWNKEEPER','STONECALLER',['healing_done_pct',500],['resource_generation_pct',1000],['harmful_effect_resist_pct',500]),
 pair('steel_vanguard','Steel Vanguard','IRONWARDEN','RAVAGER',['armor_penetration_pct',400],['physical_damage_pct',300]),
 pair('guardians_vigil',"Guardian's Vigil",'IRONWARDEN','WAYFINDER',['accuracy_pct',400],['damage_reduction_pct',300]),
 pair('sacred_bulwark','Sacred Bulwark','IRONWARDEN','DAWNKEEPER',['armor_pct',400],['healing_received_pct',400]),
 pair('unbroken_fortress','Unbroken Fortress','BASTION','STONECALLER',['shield_strength_pct',500],['damage_reduction_pct',300]),
 pair('divine_pursuit','Divine Pursuit','BASTION','KNIFE_DANCER',['haste_pct',300],['evasion_rating_pct',400]),
 pair('sanctified_hunt','Sanctified Hunt','BASTION','WAYFINDER',['accuracy_pct',400],['damage_vs_shielded_pct',300]),
 pair('twilight_accord','Twilight Accord','DREADGUARD','DAWNKEEPER',['healing_received_pct',400],['low_hp_damage_pct',300]),
 pair('crimson_veil','Crimson Veil','DREADGUARD','KNIFE_DANCER',['crit_damage_pct',500],['lifesteal_strength_pct',300]),
 pair('marked_for_death','Marked for Death','WAYFINDER','HEXWEAVER',['damage_vs_debuffed_pct',400],['accuracy_pct',300]),
 pair('shattering_force','Shattering Force','RAVAGER','STONECALLER',['armor_penetration_pct',500],['interrupt_recovery_pct',300]),
 pair('ruinous_assault','Ruinous Assault','RAVAGER','HEXWEAVER',['penetration_pct',400],['damage_vs_debuffed_pct',300]),
 pair('phantom_curse','Phantom Curse','HEXWEAVER','KNIFE_DANCER',['dot_strength_pct',400],['haste_pct',300]),
];
export const PARTY_SYNCHRONIZATION_SCALES_V2=[0,100,100,80,65,55,50] as const;
export function partySynchronizationScalePercentV2(activeLinks:number):number{
 if(!Number.isInteger(activeLinks)||activeLinks<0||activeLinks>=PARTY_SYNCHRONIZATION_SCALES_V2.length)
  throw Error('party_sync_invalid_pair_count');
 return PARTY_SYNCHRONIZATION_SCALES_V2[activeLinks];
}
export function partySynchronizationEquivalentLinkBudgetV2(activeLinks:number):number{
 return activeLinks*partySynchronizationScalePercentV2(activeLinks)/100;
}
// Provisional Synchronization-only ceilings; final global stat caps remain a
// separate combat engine responsibility. No extra flat lifesteal is granted.
export function partySynchronizationCapBpsV2(stat:SyncStatV2):number{
 return stat==='crit_chance_pp'?400:stat==='damage_reduction_pct'?600:1000;
}
const MODES:readonly SyncModeV2[]=['dungeon','party_contract','party_event','guild_pve','solo','individual_world_boss'];
export interface SyncPlanV2 {
 readonly ruleset:typeof PARTY_SYNCHRONIZATION_RULESET_V2;
 readonly mode:SyncModeV2;
 readonly releaseEnabled:false;
 readonly canAuthorizeCombat:false;
 readonly recipientIds:readonly string[];
 readonly scalePercent:number;
 readonly active:readonly {id:string;name:string;classes:readonly ClassIdV2[];bonuses:readonly Bonus[]}[];
 readonly totalsBps:Readonly<Partial<Record<SyncStatV2,number>>>;
 readonly cappedStats:readonly {
  stat:SyncStatV2;rawBps:number;cappedBps:number;discardedBps:number;
 }[];
}
export function listPartySynchronizationsV2():readonly Pair[]{
 return CATALOG.map(p=>({...p,classes:[...p.classes],bonuses:p.bonuses.map(([k,v])=>[k,v])}));
}
export function planPartySynchronizationV2(mode:SyncModeV2,roster:readonly SyncParticipantV2[]):SyncPlanV2{
 if(!MODES.includes(mode)||!Array.isArray(roster)||roster.length>4)
  throw Error('party_sync_invalid_scope');
 const ids=new Set<string>(),classes=new Set<ClassIdV2>();
 for(const p of roster){
  if(!p||typeof p.characterId!=='string'||!p.characterId.trim()||
   ids.has(p.characterId)||!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,p.classId))
   throw Error('party_sync_invalid_participant');
  ids.add(p.characterId);classes.add(p.classId);
 }
 if((mode==='solo'||mode==='individual_world_boss')&&roster.length>1)
  throw Error('party_sync_invalid_solo_roster');
 const eligible=mode!=='solo'&&mode!=='individual_world_boss'&&roster.length>=2;
 const matches=eligible?CATALOG.filter(p=>p.classes.every(c=>classes.has(c))):[];
 const scalePercent=partySynchronizationScalePercentV2(matches.length);
 const totalsBps:Partial<Record<SyncStatV2,number>>={};
 const rawTotalsBps:Partial<Record<SyncStatV2,number>>={};
 const active=matches.map(p=>{
  const bonuses:Bonus[]=p.bonuses.map(([stat,bps])=>{
   const scaled=Math.floor(bps*scalePercent/100);
   rawTotalsBps[stat]=(rawTotalsBps[stat]??0)+scaled;
   totalsBps[stat]=Math.min(partySynchronizationCapBpsV2(stat),rawTotalsBps[stat]!);
   return [stat,scaled];
  });
  return {id:p.id,name:p.name,classes:[...p.classes],bonuses};
 });
 const cappedStats=(Object.entries(rawTotalsBps) as [SyncStatV2,number][])
  .filter(([stat,rawBps])=>rawBps>partySynchronizationCapBpsV2(stat))
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([stat,rawBps])=>{
   const cappedBps=partySynchronizationCapBpsV2(stat);
   return {stat,rawBps,cappedBps,discardedBps:rawBps-cappedBps};
  });
 return {ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,mode,releaseEnabled:false,
  canAuthorizeCombat:false,recipientIds:active.length?[...ids].sort():[],
  scalePercent,active,totalsBps,cappedStats};
}
