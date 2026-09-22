import {createHash} from 'node:crypto';
import type {GameState} from '../../apps/mobile/src/core/types';
import {EVENT_EXPEDITIONS} from '../src/server/expeditions/content/event-expeditions';
import {EventExpeditionService,MemoryEventRunRepository,eventBossMechanicProjection,eventMechanicProjection,eventObjectiveProjection,effectiveEventNode,type EventRun} from '../src/server/expeditions/event-service';
import {resolveAndFreezeLoadout,type AuthoritativeLoadoutRecord,type FrozenLoadoutSnapshot} from '../src/server/coop/loadout-snapshots';
import {recruitEligibleEchoes,type PublishedEcho} from '../src/server/coop/echo-recruitment';
import {projectCombatReplay} from '../src/server/coop/combat-replay-projection';
import {combatantFromVerifiedSnapshot} from '../src/server/combat/snapshot-adapter';
import {expeditionEncounterPreview} from '../src/server/combat/expedition-combat-service';
import type {CoopDecisionCommand,CoopRole} from '../src/shared/coop-types';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash,ONLINE_COOP_BALANCE_VERSION} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';

interface Game {state:GameState|null;version:number;serverNow:number;liveEvent?:GameState['account']['liveEvent'];}
interface Echo {profileId:string;sourceAccountId:string;publishedAtMs:number;record:AuthoritativeLoadoutRecord;}
export interface OnlineEventExpeditionState {run:EventRun;seed:string;liveEventId:string;}
interface Loaded {stateVersion:number;eventCursor:number;privateState:OnlineEventExpeditionState;clientProjection:unknown;serverNow:number;}
type Services=Pick<GameplayServices,'rpc'|'randomId'>;
export interface OnlineEventExpeditionStartRequest {requestId:string;eventExpeditionId:string;characterId:string;loadoutId:string;loadoutRevision:number;}

const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const player=(snapshot:FrozenLoadoutSnapshot)=>combatantFromVerifiedSnapshot(snapshot.normalized.snapshot,snapshot.normalized.abilities);
function role(value:string):CoopRole{if(value==='tank'||value==='damage'||value==='support')return value;throw new GameplayError('invalid_coop_role');}
export function projectOnlineEventRun(run:EventRun,version:number,liveEventId:string){
 const definition=EVENT_EXPEDITIONS.find(item=>item.id===run.eventId);if(!definition)throw new GameplayError('unknown_event_expedition');
 const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);
 const options=run.phase==='awaiting_choice'&&current?current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)).filter((node):node is NonNullable<typeof node>=>Boolean(node)).map(node=>effectiveEventNode(run,node)).map(node=>({nodeId:node.nodeId,kind:node.kind,risk:node.risk,rewardTag:node.rewardTag,title:node.title,mechanicDelta:node.mechanicDelta??0,objectiveDelta:node.objectiveDelta??0,reactionLabel:node.reactionLabel,...(['battle','elite','boss'].includes(node.kind)?{encounterPreview:expeditionEncounterPreview(node.contentId)}:{})})):[];
 const mechanic=eventMechanicProjection(run),objective=eventObjectiveProjection(run),bossProfile=eventBossMechanicProjection(run);
 const bossMechanic=bossProfile?{profileId:bossProfile.profileId,label:bossProfile.label,summary:bossProfile.summary,tone:bossProfile.tone,telegraph:bossProfile.telegraph}:undefined;
 const summary=run.lastResolution?.nodeId===run.graph.bossNodeId?run.lastResolution.result.summary:undefined;
 const list=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
 const phaseLabels=new Map(bossProfile?.telegraph.phases.map(item=>[item.id,item.label])??[]);
 const abilityLabels=new Map(bossProfile?.telegraph.castAbilities.map(item=>[item.id,item.label])??[]);
 const fallback=(id:string)=>id.replace(/^EVENT_[A-Z]+_BOSS_/,'').replace(/_/g,' ').toLowerCase().replace(/\b\w/g,char=>char.toUpperCase());
 const bossRecap=summary?{
  durationMs:typeof summary.durationMs==='number'?summary.durationMs:0,
  downs:Array.isArray(summary.downs)?summary.downs.filter(item=>typeof item==='string').length:0,
  phasesTriggered:list(summary.bossPhaseIds).map(id=>phaseLabels.get(id)??fallback(id)),
  abilitiesCast:list(summary.bossCastAbilityIds).map(id=>abilityLabels.get(id)??fallback(id)),
 }:undefined;
 return {
  runId:run.id,eventExpeditionId:run.eventId,liveEventId,eventName:definition.eventName,dungeonName:definition.name,phase:run.phase,
  stateVersion:version,decisionId:run.currentNodeId,decisionRevision:version,
  team:run.players.map((member,index)=>{const state=run.persistentState.actors[member.id],companionId=(member.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length),bodyTag=(member.tags??[]).find(tag=>tag.startsWith('body:'))?.slice('body:'.length),bodyPresentation=bodyTag==='female'?'female' as const:bodyTag==='male'?'male' as const:undefined;return{memberId:member.id,displayName:member.name,role:role(member.role),classId:member.classId??'',bodyPresentation,companionId,kind:index===0?'controller' as const:'echo' as const,effectiveLevel:member.level,currentHp:state?.hp??member.stats.maxHp,maximumHp:member.stats.maxHp,downed:state?.downed??false};}),
  options,mechanic,objective,bossMechanic,bossRecap,lastCombat:projectCombatReplay(run.lastResolution),settlement:{status:run.settlement,rewardMarks:run.rewardMarks??(definition.rewardMarks+mechanic.rewardBonus+objective.rewardBonus)},
 };
}

/** Persistent online adapter for seasonal expedition simulation. The browser sends
 * selection ids/revisions only; combat stats, LiveOps state and Echoes are rebuilt
 * from authoritative server state before the run is committed. */
export class OnlineEventExpeditionRuntime{
 constructor(private services:Services){}
 private async receipt(accountId:string,operation:string,resource:string,requestId:string,hash:string){
  const prior=await this.services.rpc<{requestHash:string;response:unknown}|null>('read_online_coop_receipt_server_v1',{p_account_id:accountId,p_operation:operation,p_resource_id:resource,p_request_id:requestId});
  if(prior&&prior.requestHash!==hash)throw new GameplayError('idempotency_key_conflict',409);
  return prior;
 }
 async start(accountId:string,request:OnlineEventExpeditionStartRequest){
  const hash=digest(request),prior=await this.receipt(accountId,'event_start_v1',accountId,request.requestId,hash);if(prior)return prior.response;
  const definition=EVENT_EXPEDITIONS.find(item=>item.id===request.eventExpeditionId);if(!definition)throw new GameplayError('unknown_event_expedition');
  const game=await this.services.rpc<Game>('load_online_game_server_v1',{p_account_id:accountId});
  const runtime=game.liveEvent;
  if(!runtime?.enabled||game.serverNow<runtime.startsAtMs||game.serverNow>=runtime.endsAtMs||!runtime.eventId.startsWith(`${definition.liveEventSeriesId}_`))throw new GameplayError('event_not_live');
  if(!game.state?.character)throw new GameplayError('character_required');
  const record=deriveOnlineCoopLoadout(accountId,game.state,game.version);
  if(record.characterId!==request.characterId||request.loadoutId!=='current')throw new GameplayError('loadout_not_owned',403);
  if(request.loadoutRevision!==record.revision){const replay=await this.receipt(accountId,'event_start_v1',accountId,request.requestId,hash);if(replay)return replay.response;throw new GameplayError('stale_game_version',409);}
  const freeze=(source:AuthoritativeLoadoutRecord)=>resolveAndFreezeLoadout({accountId:source.accountId,characterId:source.characterId,loadoutId:source.loadoutId,expectedRevision:source.revision,minLevel:definition.minLevel,syncLevel:definition.minLevel,repository:{getOwnedLoadout:()=>source}});
  const controller=freeze(record);
  const raw=await this.services.rpc<Echo[]>('eligible_online_coop_echoes_server_v1',{p_actor_account_id:accountId,p_min_level:definition.minLevel});
  const profiles:PublishedEcho[]=[];
  for(const echo of raw){
   if(echo.record.accountId!==echo.sourceAccountId)continue;
   try{profiles.push({profileId:echo.profileId,sourceAccountId:echo.sourceAccountId,publishedAtMs:echo.publishedAtMs,optedIn:true,contentVersion:ONLINE_COOP_BALANCE_VERSION,blockedAccountIds:[],snapshot:freeze(echo.record)});}catch{continue;}
  }
  const seed=this.services.randomId()+this.services.randomId();
  const selected=recruitEligibleEchoes({serverSecret:seed,requestId:request.requestId,controllerAccountId:accountId,controllerRole:controller.readiness.role,controllerClassId:controller.classId,contentVersion:ONLINE_COOP_BALANCE_VERSION,nowMs:game.serverNow,profiles});
  const snapshots=[controller,...selected.map(echo=>echo.snapshot)],runId=this.services.randomId(),repository=new MemoryEventRunRepository(),domain=new EventExpeditionService(repository,seed);
  const run=domain.start({requestId:request.requestId,runId,accountId,eventId:definition.id,activeLiveEventId:runtime.eventId,members:snapshots.map(snapshot=>({accountId:snapshot.accountId,characterId:snapshot.characterId,role:snapshot.readiness.role})),players:snapshots.map(player),nowMs:game.serverNow});
  const members=snapshots.map((snapshot,index)=>{
   if(index===0)return {snapshot,sourceHash:onlineCoopLoadoutHash(record),profileId:null};
   const chosen=selected[index-1],source=raw.find(item=>item.profileId===chosen.profileId);if(!source)throw new GameplayError('echo_no_longer_eligible',409);
   return {snapshot,sourceHash:onlineCoopLoadoutHash(source.record),profileId:chosen.profileId};
  });
  return this.services.rpc('start_online_event_expedition_server_v1',{p_account_id:accountId,p_game_version:game.version,p_request_id:request.requestId,p_request_hash:hash,p_run_id:runId,p_live_event_id:runtime.eventId,p_private_state:{run,seed,liveEventId:runtime.eventId},p_client_projection:projectOnlineEventRun(run,1,runtime.eventId),p_members:members,p_seed_hash:digest(seed)});
 }
 async load(accountId:string,runId:string){
  const loaded=await this.services.rpc<Loaded>('load_online_event_expedition_server_v1',{p_account_id:accountId,p_run_id:runId});
  return loaded.clientProjection;
 }
 async choose(accountId:string,runId:string,request:CoopDecisionCommand){
  const hash=digest(request),prior=await this.receipt(accountId,'event_choose_v1',runId,request.requestId,hash);if(prior)return prior.response;
  const loaded=await this.services.rpc<Loaded>('load_online_event_expedition_server_v1',{p_account_id:accountId,p_run_id:runId});
  const before=loaded.privateState.run;
  if(request.decisionRevision!==loaded.stateVersion||request.decisionId!==before.currentNodeId){const replay=await this.receipt(accountId,'event_choose_v1',runId,request.requestId,hash);if(replay)return replay.response;throw new GameplayError('stale_state',409);}
  const repository=new MemoryEventRunRepository();repository.save(before);
  const domain=new EventExpeditionService(repository,loaded.privateState.seed);
  const run=domain.choose({runId,accountId,optionNodeId:request.optionId,requestId:request.requestId});
  const result=run.lastResolution;if(!result)throw new GameplayError('event_resolution_missing');
  const projection=projectOnlineEventRun(run,loaded.stateVersion+1,loaded.privateState.liveEventId);
  return this.services.rpc('advance_online_event_expedition_server_v1',{p_account_id:accountId,p_run_id:runId,p_expected_version:loaded.stateVersion,p_request_id:request.requestId,p_request_hash:hash,p_private_state:{run,seed:loaded.privateState.seed,liveEventId:loaded.privateState.liveEventId},p_client_projection:projection,p_node_id:result.nodeId,p_result:result.result,p_start_state_hash:digest(before.persistentState)});
 }
 async claim(accountId:string,runId:string,requestId:string){
  const request={requestId},hash=digest(request),prior=await this.receipt(accountId,'event_claim_v1',runId,requestId,hash);if(prior)return prior.response;
  const loaded=await this.services.rpc<Loaded>('load_online_event_expedition_server_v1',{p_account_id:accountId,p_run_id:runId});
  const repository=new MemoryEventRunRepository();repository.save(loaded.privateState.run);
  const domain=new EventExpeditionService(repository,loaded.privateState.seed),reward=domain.claimReward({runId,accountId,requestId});
  const run=repository.get(runId);if(!run)throw new GameplayError('event_run_not_found');
  const projection=projectOnlineEventRun(run,loaded.stateVersion+1,loaded.privateState.liveEventId);
  return this.services.rpc('claim_online_event_expedition_server_v1',{p_account_id:accountId,p_run_id:runId,p_expected_version:loaded.stateVersion,p_request_id:requestId,p_request_hash:hash,p_marks:reward.marks,p_private_state:{run,seed:loaded.privateState.seed,liveEventId:loaded.privateState.liveEventId},p_client_projection:projection});
 }
}
