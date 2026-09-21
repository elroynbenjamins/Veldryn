import {createHash} from 'node:crypto';
import {simulateCombat} from './engine';
import type {AbilityDefinition,CombatantDefinition,CombatEvent,DamageType} from './types';

export type RegionalGemCombatKindV1='enemy'|'elite'|'regional_boss';
export interface RegionalCombatEncounterV1{
  encounterId:string;
  sourceId:'ZONE_006'|'ZONE_007'|'ZONE_008'|'ZONE_009'|'ZONE_010';
  kind:RegionalGemCombatKindV1;
  name:string;
  level:number;
  minLevel:number;
  boss:boolean;
  build:()=>CombatantDefinition[];
}
export interface RegionalCombatReplayCueV1{
  atMs:number;
  type:'action'|'phase'|'cast'|'victory'|'wipe'|'timeout';
  actorId?:string;
  targetId?:string;
  abilityId?:string;
  amount?:number;
}
export interface RegionalCombatResultV1{
  success:boolean;
  encounterId:string;
  sourceId:string;
  kind:RegionalGemCombatKindV1;
  reason:'victory'|'wipe'|'timeout';
  durationMs:number;
  playerHp:number;
  enemyHp:Record<string,number>;
  damageDone:number;
  healingDone:number;
  eventDigest:string;
  eventCount:number;
  replayCues:RegionalCombatReplayCueV1[];
}

const stats=(maxHp:number,attackPower:number,defense:number,accuracy:number,evasion:number,healingPower=0,critChance=.06,haste=.03)=>({
  maxHp,attackPower,healingPower,defense,accuracy,evasion,critChance,critMultiplier:1.5,haste,
});
const damage=(id:string,name:string,coeff:number,damageType:DamageType,cooldownMs:number,target:'current_target'|'all_enemies'='current_target',castTimeMs=0,extra:Partial<AbilityDefinition>={}):AbilityDefinition=>({
  id,name,cooldownMs,castTimeMs,target,priority:target==='all_enemies'?90:70,interruptible:castTimeMs>=900,effects:[{kind:'damage',coeff,damageType}],...extra,
});
const enemy=(input:{id:string;name:string;level:number;maxHp:number;attackPower:number;defense:number;accuracy:number;evasion:number;abilities:AbilityDefinition[];boss?:boolean;elite?:boolean;healingPower?:number;basicAttackMs?:number;basicAttackCoeff?:number;phases?:CombatantDefinition['phases']}):CombatantDefinition=>({
  id:input.id,name:input.name,team:'enemies',role:'enemy',level:input.level,
  stats:stats(input.maxHp,input.attackPower,input.defense,input.accuracy,input.evasion,input.healingPower??0),
  basicAttackMs:input.basicAttackMs??2800,basicAttackCoeff:input.basicAttackCoeff??.72,
  abilities:input.abilities,boss:input.boss,tags:input.elite||input.boss?['elite']:undefined,phases:input.phases,
});

const spiceThief=()=>[enemy({
  id:'SUNMON_002',name:'Spice Thief',level:27,maxHp:3_400,attackPower:220,defense:320,accuracy:690,evasion:205,basicAttackMs:2700,
  abilities:[
    damage('SPICE_SMOKE_STRIKE','Smoke Strike',.92,'physical',5200),
    {...damage('SPICE_DUST_FLURRY','Dust Flurry',.58,'physical',8200,'all_enemies',900),effects:[{kind:'damage',coeff:.58,damageType:'physical'},{kind:'debuff',tag:'damage_taken',value:.025,durationMs:3500}]},
  ],
})];

const sunspineElite=()=>[enemy({
  id:'SUNMON_005',name:'Sunspine Scorpion',level:32,maxHp:9_200,attackPower:330,defense:520,accuracy:760,evasion:190,elite:true,basicAttackMs:2600,
  abilities:[
    {...damage('SUNSPINE_STING','Sunspine Sting',1.02,'physical',6200,'current_target',700),effects:[{kind:'damage',coeff:1.02,damageType:'physical'},{kind:'dot',coeff:.13,damageType:'nature',durationMs:6000,tickMs:2000}]},
    {id:'SUNSPINE_BRACE',name:'Heat Scale',cooldownMs:11000,castTimeMs:0,target:'self',priority:78,effects:[{kind:'buff',tag:'damage_done',value:.07,durationMs:4500}]},
  ],
})];

const shimmerElite=()=>[enemy({
  id:'SUNMON_010',name:'Shimmer Wraith',level:38,maxHp:11_500,attackPower:365,defense:610,accuracy:820,evasion:235,elite:true,basicAttackMs:2650,
  abilities:[
    damage('SHIMMER_LANCE','Refraction Lance',1.08,'arcane',5800),
    {...damage('SHIMMER_PULSE','Shimmer Pulse',.68,'arcane',9400,'all_enemies',1050),effects:[{kind:'damage',coeff:.68,damageType:'arcane'},{kind:'debuff',tag:'damage_taken',value:.035,durationMs:4500}]},
  ],
})];

const voidLensElite=()=>[enemy({
  id:'SUNMON_014',name:'Void Lens',level:43,maxHp:13_500,attackPower:395,defense:700,accuracy:875,evasion:210,elite:true,healingPower:330,basicAttackMs:2700,
  abilities:[
    damage('VOID_LENS_BEAM','Null Beam',1.12,'arcane',6100,'current_target',650),
    {id:'VOID_REFLECTION',name:'Reflection Window',cooldownMs:12500,castTimeMs:0,target:'self',priority:82,effects:[{kind:'shield',coeff:1.0,shieldReflectPct:.18}]},
  ],
})];

const sandTyrant=()=>[enemy({
  id:'BOSS_002',name:'The Sand Tyrant',level:45,maxHp:24_000,attackPower:500,defense:850,accuracy:900,evasion:120,boss:true,healingPower:420,basicAttackMs:2750,basicAttackCoeff:.74,
  abilities:[
    damage('TYRANT_CHARGE','Tyrant Charge',1.14,'physical',6400,'current_target',650),
    damage('SOLAR_PILLAR','Solar Pillar',.92,'fire',9000,'current_target',1150),
    {...damage('SANDSTORM_COLLAPSE','Sandstorm Collapse',.62,'physical',11800,'all_enemies',1450),interruptible:true},
    {id:'ROYAL_CARAPACE',name:'Royal Carapace',cooldownMs:16000,castTimeMs:0,target:'self',priority:62,effects:[{kind:'shield',coeff:.85}]},
  ],
  phases:[
    {id:'TYRANT_PHASE_PILLARS',name:'Crown of Pillars',hpPct:.66,target:'all_enemies',effects:[{kind:'damage',coeff:.30,damageType:'fire'},{kind:'debuff',tag:'damage_taken',value:.04,durationMs:6000}]},
    {id:'TYRANT_PHASE_STORM',name:'Tyrant Sandstorm',hpPct:.33,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.10,durationMs:30000}]},
  ],
})];

export const REGIONAL_COMBAT_ENCOUNTERS_V1:readonly RegionalCombatEncounterV1[]=[
  {encounterId:'SUNMON_002',sourceId:'ZONE_006',kind:'enemy',name:'Spice Thief',level:27,minLevel:25,boss:false,build:spiceThief},
  {encounterId:'SUNMON_005',sourceId:'ZONE_007',kind:'elite',name:'Sunspine Scorpion',level:32,minLevel:30,boss:false,build:sunspineElite},
  {encounterId:'SUNMON_010',sourceId:'ZONE_008',kind:'elite',name:'Shimmer Wraith',level:38,minLevel:34,boss:false,build:shimmerElite},
  {encounterId:'SUNMON_014',sourceId:'ZONE_009',kind:'elite',name:'Void Lens',level:43,minLevel:37,boss:false,build:voidLensElite},
  {encounterId:'BOSS_002',sourceId:'ZONE_010',kind:'regional_boss',name:'The Sand Tyrant',level:45,minLevel:45,boss:true,build:sandTyrant},
] as const;

export function regionalCombatEncounterV1(encounterId:string):RegionalCombatEncounterV1|undefined{
  return REGIONAL_COMBAT_ENCOUNTERS_V1.find(row=>row.encounterId===encounterId);
}

function replayCues(events:readonly CombatEvent[]):RegionalCombatReplayCueV1[]{
  const cues:RegionalCombatReplayCueV1[]=[];let lastBasic=-Infinity;
  for(const event of events){
    if(event.type==='phase'){cues.push({atMs:event.atMs,type:'phase',actorId:event.actorId,abilityId:event.abilityId});continue;}
    if(event.type==='cast_start'){cues.push({atMs:event.atMs,type:'cast',actorId:event.actorId,targetId:event.targetId,abilityId:event.abilityId});continue;}
    if(event.type==='combat_end'){const type=event.detail==='victory'?'victory':event.detail==='wipe'?'wipe':'timeout';cues.push({atMs:event.atMs,type});continue;}
    if((event.type==='damage'||event.type==='heal'||event.type==='shield')&&event.actorId&&event.targetId&&event.abilityId){
      if(event.abilityId==='BASIC'&&event.atMs-lastBasic<1200)continue;if(event.abilityId==='BASIC')lastBasic=event.atMs;
      cues.push({atMs:event.atMs,type:'action',actorId:event.actorId,targetId:event.targetId,abilityId:event.abilityId,amount:event.amount});
    }
  }
  if(cues.length<=48)return cues;
  const terminal=cues[cues.length-1],important=cues.slice(0,-1).filter(cue=>cue.type!=='action'),actions=cues.slice(0,-1).filter(cue=>cue.type==='action');
  const room=Math.max(0,47-important.length),sampled=actions.length<=room?actions:Array.from({length:room},(_,i)=>actions[Math.min(actions.length-1,Math.floor(i*actions.length/room))]);
  return [...important,...sampled].sort((a,b)=>a.atMs-b.atMs).concat(terminal);
}

export function resolveRegionalCombatV1(input:{runId:string;serverSeed:string;encounterId:string;player:CombatantDefinition;maxDurationMs?:number}):RegionalCombatResultV1{
  const encounter=regionalCombatEncounterV1(input.encounterId);if(!encounter)throw new Error('unknown_regional_combat_encounter');
  if(input.player.team!=='players'||input.player.role==='enemy')throw new Error('invalid_regional_player_snapshot');
  const result=simulateCombat({seed:`regional:${input.serverSeed}:${input.runId}:${encounter.encounterId}`,players:[structuredClone(input.player)],enemies:encounter.build(),maxDurationMs:input.maxDurationMs??180000});
  const eventDigest=createHash('sha256').update(JSON.stringify(result.events)).digest('hex');
  const player=result.players[0];
  return {
    success:result.victory,encounterId:encounter.encounterId,sourceId:encounter.sourceId,kind:encounter.kind,reason:result.reason,
    durationMs:result.durationMs,playerHp:Number(player.hp.toFixed(2)),
    enemyHp:Object.fromEntries(result.enemies.map(row=>[row.definition.id,Number(row.hp.toFixed(2))])),
    damageDone:Number(player.damageDone.toFixed(2)),healingDone:Number(player.healingDone.toFixed(2)),
    eventDigest,eventCount:result.events.length,replayCues:replayCues(result.events),
  };
}
