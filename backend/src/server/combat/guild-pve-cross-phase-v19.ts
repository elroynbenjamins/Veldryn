/**
 * Hidden Guild PvE V19: one continuous real-engine guardian attempt.
 * Not mounted in V18 settlement. V17 objective/boon effects must be
 * carried across phases before that integration can happen.
 */
import {simulateCombat} from './engine';
import {draftBrokenForgeGuardianV7,GUILD_PVE_V7_PHASES,
 type GuildPveBossV7,type GuildPveDifficultyV7,type GuildPveReferenceV7,
 type GuildPvePhaseV7} from './guild-pve-broken-forge-v7';
import {observedGuildPveV17Cues} from './guild-pve-effects-v17';
import type {CombatantDefinition} from './types';
import {createHash} from 'node:crypto';

export const GUILD_PVE_V19_LIVE=false as const;
export function previewGuildPveV19CrossPhase(input:{
 player:CombatantDefinition;boss:GuildPveBossV7;difficulty:GuildPveDifficultyV7;
 reference:GuildPveReferenceV7;sharedHp:number;sharedMaxHp:number;seed:string;
}){
 const phases=GUILD_PVE_V7_PHASES[input.boss];
 if(!phases||input.player.team!=='players'||input.player.role==='enemy'||
  !Number.isFinite(input.sharedHp)||!Number.isFinite(input.sharedMaxHp)||
  input.sharedHp<=0||input.sharedMaxHp<1||input.sharedHp>input.sharedMaxHp||
  typeof input.seed!=='string'||input.seed.length<4||input.seed.length>160)
  throw Error('guild_pve_v19_invalid_input');
 const cuts=input.boss==='gatekeeper'?[.6,.2]:input.boss==='seer'?[.65,.3]:[.7,.3];
 const ratio=input.sharedHp/input.sharedMaxHp;
 const start=ratio>cuts[0]?0:ratio>cuts[1]?1:2;
 const enemyId='GX_V19_'+input.boss;
 const profile=(phase:GuildPvePhaseV7)=>{
  const def=draftBrokenForgeGuardianV7({...input,phase});
  return {...def,id:enemyId,stats:{...def.stats,maxHp:input.sharedMaxHp}};
 };
 const boss=profile(phases[start]);
 const plan={
  enemyId,initialHp:input.sharedHp,initialPhaseId:phases[start],
  transitions:phases.slice(start+1).map((phase,i)=>({
   phaseId:phase,hpPct:cuts[start+i],definition:profile(phase),
  })),
 };
 const r=simulateCombat({seed:input.seed,players:[structuredClone(input.player)],
  enemies:[boss],guildPvePhasePlan:plan,maxDurationMs:18000,tickMs:100});
 // Partition by actual phase events, including same-tick order, not
 // timestamps alone. Abandoned casts remain warning-only.
 let current=phases[start];
 let segment:typeof r.events=[];
 const observedCues:ReturnType<typeof observedGuildPveV17Cues>=[];
 const transitions:GuildPvePhaseV7[]=[];
 const flush=()=>observedCues.push(...observedGuildPveV17Cues({
  boss:input.boss,phase:current,enemyId,events:segment,
 }));
 for(const event of r.events){
  if(event.type==='phase'&&event.actorId===enemyId&&
   event.detail==='guild_pve_hp_threshold'){
   flush();segment=[];
   current=event.abilityId as GuildPvePhaseV7;transitions.push(current);
  }else segment.push(event);
 }
 flush();
 return {startPhase:phases[start],endPhase:current,transitions,
  beforeHp:input.sharedHp,afterHp:r.enemies[0].hp,
  bossHpRemoved:input.sharedHp-r.enemies[0].hp,
  playerHp:r.players[0].hp,reason:r.reason,events:r.events,observedCues,
  evidenceHash:createHash('sha256').update(JSON.stringify([
   input.seed,input.reference.digest,plan,input.player,r.events,r.enemies[0].hp,
  ])).digest('hex'),
  rewardGranted:false as const,serverPersisted:false as const};
}
