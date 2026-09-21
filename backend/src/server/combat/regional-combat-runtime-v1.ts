import {createHash} from 'node:crypto';
import {simulateCombat} from './engine';
import {combatantFromVerifiedSnapshot,type VerifiedCombatSnapshot} from './snapshot-adapter';
import type {AbilityDefinition,CombatantDefinition,CombatResult,DamageType} from './types';
import {SUNSCAR_BOSSES_V20,SUNSCAR_ENEMIES_V20,type SunscarBossV20,type SunscarEnemyV20,type SunscarZoneId} from '../content/sunscar-region-v20';
import {settleVerifiedRegionalGemEncounterV1,type RegionalGemEncounterKindV1,type RegionalGemSettlementResultV1,type RegionalGemSettlementRpcV1} from '../equipment/gems/regional-gem-settlement-v1';

export type RegionalCombatEncounterKindV1='standard'|'elite'|'regional_boss';

export interface RegionalCombatCatalogEntryV1{
  encounterId:string;
  zoneId:SunscarZoneId;
  kind:RegionalCombatEncounterKindV1;
  contentId:string;
  name:string;
  level:number;
}

export const SUNSCAR_REGIONAL_COMBAT_CATALOG_V1:readonly RegionalCombatCatalogEntryV1[]=[
  {encounterId:'REGCOM_SUN_006_STANDARD',zoneId:'ZONE_006',kind:'standard',contentId:'SUNMON_001',name:'Saffron Gate Patrol',level:25},
  {encounterId:'REGCOM_SUN_007_ELITE',zoneId:'ZONE_007',kind:'elite',contentId:'SUNMON_005',name:'Sunspine Elite',level:32},
  {encounterId:'REGCOM_SUN_008_ELITE',zoneId:'ZONE_008',kind:'elite',contentId:'SUNMON_010',name:'Mirage Basin Elite',level:38},
  {encounterId:'REGCOM_SUN_009_ELITE',zoneId:'ZONE_009',kind:'elite',contentId:'SUNMON_014',name:'Observatory Elite',level:43},
  {encounterId:'REGCOM_SUN_010_BOSS',zoneId:'ZONE_010',kind:'regional_boss',contentId:'BOSS_002',name:'The Sand Tyrant',level:45},
] as const;

export interface VerifiedRegionalPlayerV1{
  snapshot:VerifiedCombatSnapshot;
  abilities:readonly AbilityDefinition[];
}
export interface RegionalCombatAuthorizerV1{
  loadVerifiedPlayer(input:{accountId:string;characterId:string;encounter:RegionalCombatCatalogEntryV1}):Promise<VerifiedRegionalPlayerV1>;
  assertEncounterUnlocked(input:{accountId:string;characterId:string;encounter:RegionalCombatCatalogEntryV1}):Promise<void>;
}
export interface RegionalCombatReservationV1{
  receiptId:string;
  requestId:string;
  requestHash:string;
  accountId:string;
  characterId:string;
  encounterId:string;
  zoneId:SunscarZoneId;
  kind:RegionalCombatEncounterKindV1;
  contentId:string;
  serverSeed:string;
  player:CombatantDefinition;
  createdAtMs:number;
}
export interface RegionalCombatStoredResultV1{
  receiptId:string;
  victory:boolean;
  reason:CombatResult['reason'];
  durationMs:number;
  eventDigest:string;
  damageDone:number;
  healingDone:number;
  playerHp:number;
  enemyHp:number;
}
export interface RegionalCombatStoreV1{
  reserve(input:RegionalCombatReservationV1):Promise<RegionalCombatReservationV1>;
  load(receiptId:string):Promise<RegionalCombatReservationV1>;
  readResult(receiptId:string):Promise<RegionalCombatStoredResultV1|undefined>;
  commitResult(input:RegionalCombatStoredResultV1):Promise<{duplicate:boolean;result:RegionalCombatStoredResultV1}>;
}
export interface RegionalCombatRuntimeDepsV1{
  store:RegionalCombatStoreV1;
  authorizer:RegionalCombatAuthorizerV1;
  rewards:RegionalGemSettlementRpcV1;
  randomId():string;
  randomSeed():string;
  nowMs():number;
}
export interface RegionalCombatResolutionV1{
  result:RegionalCombatStoredResultV1;
  reward?:RegionalGemSettlementResultV1;
  duplicate:boolean;
}

const damageType=(value:string):DamageType=>value==='poison'?'nature':value as DamageType;
const neutralDefense=(armor:number,ward:number)=>Math.max(0,Math.round((armor+ward)/2));
function basicAbility(id:string,name:string,type:DamageType,coeff=1):AbilityDefinition{
  return {id,name,cooldownMs:6500,castTimeMs:600,target:'current_target',priority:70,effects:[{kind:'damage',coeff,damageType:type}]};
}
function enemyDefinition(source:SunscarEnemyV20,elite:boolean):CombatantDefinition{
  const multiplier=elite?1.8:1;
  return {
    id:source.id,name:source.name,team:'enemies',role:'enemy',level:source.level,
    stats:{
      maxHp:Math.round(source.stats.maxHp*multiplier),
      attackPower:Math.round(source.stats.power*multiplier),
      healingPower:source.stats.healingPower,
      defense:Math.round(neutralDefense(source.stats.armor,source.stats.ward)*multiplier),
      accuracy:source.stats.accuracy,
      evasion:source.stats.evasion,
      critChance:source.stats.critChance,
      critMultiplier:source.stats.critDamage,
      haste:source.stats.haste,
    },
    basicAttackMs:2600,basicAttackCoeff:.72,
    abilities:[basicAbility(source.id+':SIGNATURE',source.signatureMechanic.split(':')[0],damageType(source.damageType),elite?1.35:1.05)],
    tags:elite?['elite',source.zoneId]:[source.zoneId],
  };
}
function bossDefinition(source:SunscarBossV20):CombatantDefinition{
  const primary=damageType(source.damageTypes[0]??'physical');
  return {
    id:source.id,name:source.name,team:'enemies',role:'enemy',level:source.level,boss:true,
    stats:{
      maxHp:source.stats.maxHp,
      attackPower:source.stats.power,
      healingPower:source.stats.healingPower,
      defense:neutralDefense(source.stats.armor,source.stats.ward),
      accuracy:source.stats.accuracy,
      evasion:source.stats.evasion,
      critChance:source.stats.critChance,
      critMultiplier:source.stats.critDamage,
      haste:source.stats.haste,
    },
    basicAttackMs:2500,basicAttackCoeff:.78,
    abilities:[
      basicAbility(source.id+':STRIKE',source.telegraphedMechanics[0]??'Boss Strike',primary,1.25),
      {id:source.id+':PRESSURE',name:source.telegraphedMechanics[1]??'Regional Pressure',cooldownMs:10500,castTimeMs:1400,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.82,damageType:primary}]},
    ],
    phases:source.phases.filter(phase=>phase.startsAtHpFraction<1).map(phase=>({id:source.id+':'+phase.id,name:phase.name,hpPct:phase.startsAtHpFraction,target:'all_enemies',effects:[{kind:'damage',coeff:.42,damageType:primary}]})),
    tags:['regional_boss',source.zoneId],
  };
}
export function regionalCombatCatalogEntryV1(encounterId:string){return SUNSCAR_REGIONAL_COMBAT_CATALOG_V1.find(row=>row.encounterId===encounterId);}
export function buildRegionalCombatEnemyV1(entry:RegionalCombatCatalogEntryV1):CombatantDefinition{
  if(entry.kind==='regional_boss'){
    const boss=SUNSCAR_BOSSES_V20.find(row=>row.id===entry.contentId&&row.zoneId===entry.zoneId);
    if(!boss)throw new Error('regional_boss_content_missing');
    return bossDefinition(boss);
  }
  const enemy=SUNSCAR_ENEMIES_V20.find(row=>row.id===entry.contentId&&row.zoneId===entry.zoneId);
  if(!enemy)throw new Error('regional_enemy_content_missing');
  return enemyDefinition(enemy,entry.kind==='elite');
}
function gemKind(kind:RegionalCombatEncounterKindV1):RegionalGemEncounterKindV1{return kind==='standard'?'enemy':kind;}
function resultDigest(result:CombatResult){return createHash('sha256').update(JSON.stringify(result.events)).digest().toString('hex');}

export async function startRegionalCombatV1(deps:RegionalCombatRuntimeDepsV1,input:{accountId:string;characterId:string;encounterId:string;requestId:string}):Promise<RegionalCombatReservationV1>{
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId))throw new Error('invalid_request');
  const encounter=regionalCombatCatalogEntryV1(input.encounterId);if(!encounter)throw new Error('unknown_regional_encounter');
  await deps.authorizer.assertEncounterUnlocked({accountId:input.accountId,characterId:input.characterId,encounter});
  const verified=await deps.authorizer.loadVerifiedPlayer({accountId:input.accountId,characterId:input.characterId,encounter});
  if(verified.snapshot.characterId!==input.characterId)throw new Error('regional_snapshot_character_mismatch');
  const player=combatantFromVerifiedSnapshot(verified.snapshot,[...verified.abilities]);
  const requestHash=createHash('sha256').update(JSON.stringify({characterId:input.characterId,encounterId:encounter.encounterId})).digest().toString('hex');
  const reservation:RegionalCombatReservationV1={
    receiptId:deps.randomId(),requestId:input.requestId,requestHash,accountId:input.accountId,characterId:input.characterId,
    encounterId:encounter.encounterId,zoneId:encounter.zoneId,kind:encounter.kind,contentId:encounter.contentId,
    serverSeed:deps.randomSeed(),player,createdAtMs:deps.nowMs(),
  };
  return deps.store.reserve(reservation);
}

export async function resolveRegionalCombatV1(deps:RegionalCombatRuntimeDepsV1,input:{accountId:string;receiptId:string}):Promise<RegionalCombatResolutionV1>{
  const prior=await deps.store.readResult(input.receiptId);
  if(prior){
    if((await deps.store.load(input.receiptId)).accountId!==input.accountId)throw new Error('regional_combat_owner_mismatch');
    const reservation=await deps.store.load(input.receiptId);
    const reward=prior.victory?await settleVerifiedRegionalGemEncounterV1(deps.rewards,{accountId:input.accountId,receiptKey:'regional:'+reservation.receiptId,zoneId:reservation.zoneId,kind:gemKind(reservation.kind),victory:true}):undefined;
    return {result:prior,reward,duplicate:true};
  }
  const reservation=await deps.store.load(input.receiptId);
  if(reservation.accountId!==input.accountId)throw new Error('regional_combat_owner_mismatch');
  const encounter=regionalCombatCatalogEntryV1(reservation.encounterId);
  if(!encounter||encounter.zoneId!==reservation.zoneId||encounter.contentId!==reservation.contentId||encounter.kind!==reservation.kind)throw new Error('regional_combat_receipt_content_mismatch');
  const enemy=buildRegionalCombatEnemyV1(encounter);
  const combat=simulateCombat({seed:'regional:'+reservation.serverSeed+':'+reservation.receiptId,players:[structuredClone(reservation.player)],enemies:[enemy],maxDurationMs:180000});
  const stored:RegionalCombatStoredResultV1={
    receiptId:reservation.receiptId,victory:combat.victory,reason:combat.reason,durationMs:combat.durationMs,eventDigest:resultDigest(combat),
    damageDone:Number(combat.players[0].damageDone.toFixed(2)),healingDone:Number(combat.players[0].healingDone.toFixed(2)),
    playerHp:Number(combat.players[0].hp.toFixed(2)),enemyHp:Number(combat.enemies[0].hp.toFixed(2)),
  };
  const committed=await deps.store.commitResult(stored);
  const reward=committed.result.victory?await settleVerifiedRegionalGemEncounterV1(deps.rewards,{accountId:input.accountId,receiptKey:'regional:'+reservation.receiptId,zoneId:reservation.zoneId,kind:gemKind(reservation.kind),victory:true}):undefined;
  return {result:committed.result,reward,duplicate:committed.duplicate};
}
