import type {GameState} from '../../apps/mobile/src/core/types';
import {rebaseCombatGameState,rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../../apps/mobile/src/core/progression';
import {CLASSES} from '../../apps/mobile/src/content/classes';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {baseMarks} from '../src/server/expeditions/rewards';
import {combatPowerRating} from '../../apps/mobile/src/core/combat-power';
import {eventExpeditionPreviews,isFrostfallEventExpedition,eventTierRewardMarks} from '../src/server/expeditions/content/event-expeditions';
import {PUBLISHED_COOP_TIERS,type CoopTier} from '../src/server/coop/config';
import {listedRegularDungeon,publishedRegularDungeon,regularDungeonEntryError,regularDungeonLockedReason,regularDungeonReadyTier,regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from '../src/server/coop/dungeon-entry-policy';
import {publishedDungeonBossVariants} from '../src/server/expeditions/content/dungeon-boss-rotation';
import {assessOnlineCoopLoadout,deriveOnlineCoopLoadout} from './coop-loadout';
import {possibleDungeonCompanionCounters} from '../src/server/coop/dungeon-companion-preview';
import {GameplayError,type GameplayServices} from './gameplay';

type Services=Pick<GameplayServices,'authenticate'|'rpc'>;
interface Loaded {state:GameState|null;version:number;serverNow:number;liveEvent?:GameState['account']['liveEvent'];}
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const tiers:CoopTier[]=[...PUBLISHED_COOP_TIERS];

/** Read-only authenticated dungeon catalog. Social Echo availability is
 * derived automatically on demand from current contact game states. */
export function coopEntryHandler(services:Services){return async(request:Request):Promise<Response>=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'auth_required'},401);
  const accountId=await services.authenticate(token);if(!accountId)return json({error:'invalid_session'},401);
  const path=new URL(request.url).pathname;
  if(!path.endsWith('/coop/entry'))return json({error:'not_found'},404);
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  try{await services.rpc('record_player_activity_server_v1',{p_account_id:accountId,p_kind:'coop_action'});}catch{/* Analytics are best-effort and must never block co-op entry. */}
  const loaded=await services.rpc<Loaded>('load_online_game_server_v1',{p_account_id:accountId});
  if(!loaded.state?.character)throw new GameplayError('character_required');
  const gameState=rebaseCombatGameState(loaded.state);
  // Catalog browsing works even if gear/companion readiness fails.
  // No publication or manual sharing choice is made during browsing.
  let prepared:{record:ReturnType<typeof deriveOnlineCoopLoadout>;assessment:ReturnType<typeof assessOnlineCoopLoadout>}|undefined;
  try{
   const record=deriveOnlineCoopLoadout(accountId,gameState,loaded.version);
   prepared={record,assessment:assessOnlineCoopLoadout(record)};
  }catch(error){
   console.error('coop_entry_loadout_invalid',error instanceof Error?error.message:'unknown');
  }
  const character=gameState.character!,combatPower=combatPowerRating(gameState).total;
  const participation=await services.rpc<Record<string,unknown>>('online_coop_entry_state_server_v1',{p_account_id:accountId});
  // Optional until the read-only projection migration is released. Missing
  // budget data never prevents browsing or fabricates remaining charges.
  let rewardBudget:unknown;
  try{rewardBudget=await services.rpc('online_coop_reward_budget_server_v1',{p_account_id:accountId});}catch{/* Old server schema: hide counts until migrated. */}
  const liveRecruitment=await services.rpc<unknown[]>('browse_online_coop_lfg_server_v1',{p_account_id:accountId});
  const runtime=loaded.liveEvent,activeLiveEventId=runtime?.enabled&&loaded.serverNow>=runtime.startsAtMs&&loaded.serverNow<runtime.endsAtMs?runtime.eventId:undefined;
  let frostfallDailyBudget:number|undefined;
  if(activeLiveEventId?.startsWith('EVT_ANNUAL_012_')){
   try{const budget=await services.rpc<number>('online_event_expedition_daily_budget_server_v1',{p_account_id:accountId,p_event_id:activeLiveEventId});if(Number.isInteger(budget)&&budget>=0&&budget<=2)frostfallDailyBudget=budget;}catch{/* Service not migrated yet: do not fabricate the account's remaining reward count. */}
  }
  return json({...participation,serverNow:loaded.serverNow,gameVersion:loaded.version,characterCombatPower:combatPower,liveRecruitment,...(rewardBudget?{rewardBudget}:{}),
   dungeons:Object.values(EXPEDITIONS).filter(listedRegularDungeon).map(def=>({id:def.id,name:def.name,region:def.region,baseMarks:def.baseMarks,expectedMarksByTier:Object.fromEntries(tiers.map(tier=>[tier,baseMarks(def.baseMarks,tier)])),minLevel:regularDungeonTierRequiredLevel(def,1),recommendedLevel:Math.max(regularDungeonTierRequiredLevel(def,1),rebaseLevel(def.recommendedLevel)),recommendedLiveTier:!regularDungeonEntryError(def,gameState,character.level,combatPower)&&prepared?.assessment.readiness.ready?regularDungeonReadyTier(def,character.level,prepared.assessment.readiness.normalizedScore,combatPower):undefined,recommendedPower:regularDungeonTierRequiredPower(def,1),itemDropRates:[],bossVariants:publishedRegularDungeon(def)?publishedDungeonBossVariants(def.id):[],companionCounterIds:possibleDungeonCompanionCounters(def.id),syncLevel:def.recommendedLevel,available:!regularDungeonEntryError(def,gameState,character.level,combatPower,1,'qmode'),lockedReason:regularDungeonLockedReason(def,gameState,character.level,combatPower,'qmode'),difficulties:tiers,tierMinLevels:Object.fromEntries(tiers.map(tier=>[tier,regularDungeonTierRequiredLevel(def,tier)])),tierMinPower:Object.fromEntries(tiers.map(tier=>[tier,regularDungeonTierRequiredPower(def,tier)])),preBossRoomMin:7,preBossRoomMax:7,estimatedMinutes:{min:8,max:12}})),
   eventExpeditions:eventExpeditionPreviews(loaded.serverNow).map(def=>{const matches=Boolean(activeLiveEventId&&activeLiveEventId.startsWith(`${def.liveEventSeriesId}_`)),levelReady=character.level>=(isFrostfallEventExpedition(def.id)?def.minLevel:rebaseLevel(def.minLevel)),available=matches&&levelReady&&prepared?.assessment.readiness.ready===true;return {...def,...(isFrostfallEventExpedition(def.id)?{routeNodeCount:undefined,endurance:{checkpointInterval:7,maxNormalRooms:42},...(matches&&frostfallDailyBudget!==undefined?{rewardedClearsRemaining:frostfallDailyBudget}:{})}:{}),minLevel:isFrostfallEventExpedition(def.id)?def.minLevel:rebaseLevel(def.minLevel),tiers:isFrostfallEventExpedition(def.id)?[1,2,3,4,5]:[1],tierMinLevels:isFrostfallEventExpedition(def.id)?[10,15,20,25,30]:[rebaseLevel(def.minLevel)],tierRewardMarks:isFrostfallEventExpedition(def.id)?[1,2,3,4,5].map(tier=>eventTierRewardMarks(def,tier)):[def.rewardMarks],status:available?'available' as const:'preview' as const,liveEventId:matches?activeLiveEventId:undefined,lockedReason:available?undefined:!matches?`Available only while ${def.eventName} is active.`:!levelReady?`Requires level ${isFrostfallEventExpedition(def.id)?def.minLevel:rebaseLevel(def.minLevel)}`:'Current co-op loadout is not expedition-ready.'};}),
   loadouts:prepared?[{id:'current',characterId:character.id,revision:loaded.version,verifiedRevision:loaded.version,name:'Current equipment',characterName:character.name,className:CLASSES.find(row=>row.id===character.classId)!.name,role:prepared.assessment.readiness.role,status:prepared.assessment.readiness.ready?'verified':'ineligible',ready:prepared.assessment.readiness.ready,failures:prepared.assessment.readiness.failures,level:character.level,effectiveLevel:prepared.assessment.normalized.effectiveLevel,beforeStats:prepared.assessment.normalized.before,effectiveStats:prepared.assessment.normalized.snapshot,normalizationVersion:prepared.assessment.normalized.normalizationVersion,verifiedAt:new Date(loaded.serverNow).toISOString(),skills:prepared.record.abilities.map(row=>row.name),equipment:Object.values(character.equipment).filter(Boolean)}]:[],
  });
 }catch(error){
  const message=error instanceof Error?error.message:'server_error';
  const conflict=/^(stale_game_version|idempotency_key_conflict)$/.test(message);
  const status=conflict?409:error instanceof GameplayError?error.status:503;
  if(status===503)console.error('coop_entry_unexpected_error',message);
  return json({error:status===503?(request.method==='GET'?'Dungeons are temporarily unavailable. Try again.':'Could not confirm the co-op action. Retry it.'):message},status);
 }
};}
