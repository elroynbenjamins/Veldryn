import {createHash} from 'node:crypto';
import type {GameState} from '../../apps/mobile/src/core/types';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {QModeService,type QModeRun} from '../src/server/coop/qmode';
import {projectQModeRun} from '../src/server/coop/qmode-public-projection';
import type {FrozenLoadoutSnapshot} from '../src/server/coop/loadout-snapshots';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash,ONLINE_COOP_BALANCE_VERSION} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';
import type {CoopDecisionCommand} from '../src/shared/coop-types';
interface ReadySource {checkId:string;runId:string|null;dungeonId:string;tier:1|2|3|4|5;roster:Array<Record<string,unknown>>;frozenRoster:FrozenLoadoutSnapshot[]|null;}
interface Loaded {stateVersion:number;eventCursor:number;privateState:{run:QModeRun;seed:string;pending?:{run:QModeRun;resolvesAtMs:number;startStateHash:string}};clientProjection:unknown;serverNow:number;}
interface LivePresence {serverNow:number;connectedCount:number;safetyAiCount:number;activeCount:number;safetyAiCharacterIds:string[];}
interface DecisionState {decisionId:string;revision:number;status:'open'|'resolved';closesAtMs:number;selectedOptionId?:string|null;votes:Record<string,number>;}
type Services=Pick<GameplayServices,'rpc'|'randomId'>;
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const projection=(run:QModeRun,version:number)=>({...projectQModeRun(run,'live'),stateVersion:version,decisionId:run.currentNodeId,decisionRevision:version});
function hashRequest(request:CoopDecisionCommand){return digest(request);}

/** Shared Live run transport. The same deterministic node/combat engine used by
 * Q-Mode is run with four frozen human snapshots and participant-scoped access. */
export class OnlineLiveRuntime{
 constructor(private services:Services){}
 private async ensureDecision(accountId:string,loaded:Loaded):Promise<DecisionState|undefined>{
  const run=loaded.privateState.run;if(run.phase!=='awaiting_choice')return undefined;
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||current.nextNodeIds.length<2)return undefined;
  return this.services.rpc<DecisionState>('ensure_online_live_decision_server_v1',{p_run_id:run.id,p_account_id:accountId,p_revision:loaded.stateVersion,p_option_ids:current.nextNodeIds,p_fallback_option_id:current.nextNodeIds[0],p_opened_at_ms:loaded.serverNow});
 }
 private decorate(value:unknown,decision?:DecisionState){
  if(!decision||!value||typeof value!=='object')return value;
  const source=value as Record<string,unknown>,options=Array.isArray(source.options)?source.options.map(item=>{if(!item||typeof item!=='object')return item;const node=item as Record<string,unknown>;return {...node,votes:decision.votes[String(node.nodeId)]??0};}):source.options;
  return {...source,options,decisionId:decision.decisionId,decisionRevision:decision.revision,resolvesAtMs:decision.closesAtMs};
 }
 private async touch(accountId:string,runId:string,loaded:Loaded):Promise<LivePresence>{
  const presence=await this.services.rpc<LivePresence>('touch_online_live_run_server_v1',{p_run_id:runId,p_account_id:accountId});
  loaded.serverNow=presence.serverNow;return presence;
 }
 private withPresence(value:unknown,presence:LivePresence){
  if(!value||typeof value!=='object')return value;
  return {...value as Record<string,unknown>,presenceSummary:{connectedCount:presence.connectedCount,safetyAiCount:presence.safetyAiCount,activeCount:presence.activeCount,safetyAiCharacterIds:presence.safetyAiCharacterIds}};
 }
 private async queueSelected(accountId:string,runId:string,request:CoopDecisionCommand,loaded:Loaded,selectedOptionId:string,requestHash:string,safetyAiPlayerIds:readonly string[]){
  const repository=new (class{private run:QModeRun;constructor(run:QModeRun){this.run=structuredClone(run)}get(id:string){return this.run.id===id?structuredClone(this.run):undefined}getByRequest(){return undefined}save(run:QModeRun){this.run=structuredClone(run)}})(loaded.privateState.run);
  const run=new QModeService(repository,loaded.privateState.seed).choose({runId,controllerAccountId:loaded.privateState.run.controllerAccountId,optionNodeId:selectedOptionId,safetyAiPlayerIds});
  const duration=Math.max(0,Number(run.lastResolution?.result.summary.durationMs??0)),resolvesAtMs=loaded.serverNow+duration;
  const client={...projection(loaded.privateState.run,loaded.stateVersion+1),phase:'resolving_node',options:[],selectedNodeId:selectedOptionId,resolvesAtMs};
  return this.services.rpc('queue_online_live_node_server_v1',{p_account_id:accountId,p_run_id:runId,p_expected_version:loaded.stateVersion,p_request_id:request.requestId,p_request_hash:requestHash,p_private_state:{run:loaded.privateState.run,seed:loaded.privateState.seed,pending:{run,resolvesAtMs,startStateHash:digest(loaded.privateState.run.persistentState),settlement:{projection:projection(run,loaded.stateVersion+1),enhancedMarks:run.phase==='completed'||run.phase==='failed'?Math.max(0,Math.round((EXPEDITIONS[run.expeditionId]?.baseMarks??0)*.8)):0,assistanceMarks:0}}},p_client_projection:client});
 }
 async startFromReady(accountId:string,checkId:string){
  const source=await this.services.rpc<ReadySource>('online_live_committed_sources_server_v1',{p_account_id:accountId,p_check_id:checkId});
  if(source.runId)return source.runId;
  if(!source.frozenRoster||source.frozenRoster.length!==4)throw new GameplayError('invalid_frozen_roster');
  const definition=EXPEDITIONS[source.dungeonId];if(!definition?.coopImplemented)throw new GameplayError('dungeon_unavailable');
  const id=this.services.randomId(),seed=this.services.randomId()+this.services.randomId();
  const domain=new QModeService(new (class{private run?:QModeRun;get(id:string){return this.run?.id===id?structuredClone(this.run):undefined}getByRequest(){return undefined}save(run:QModeRun){this.run=structuredClone(run)}})(),seed);
  const run=domain.createLive({requestId:`live-${checkId}`,runId:id,controllerAccountId:source.frozenRoster[0].accountId,expeditionId:source.dungeonId,tier:source.tier,contentVersion:ONLINE_COOP_BALANCE_VERSION,balanceVersion:ONLINE_COOP_BALANCE_VERSION,snapshots:source.frozenRoster});
  const members=source.frozenRoster.map(snapshot=>({snapshot,sourceHash:onlineCoopLoadoutHash({accountId:snapshot.accountId,characterId:snapshot.characterId,classId:snapshot.classId,loadoutId:snapshot.loadoutId,revision:snapshot.revision,characterLevel:snapshot.normalized.before.level,dungeonUnlocked:true,legalEquipment:true,stats:snapshot.normalized.snapshot,abilities:snapshot.normalized.abilities,capabilities:[]}),profileId:null}));
  const result=await this.services.rpc<{runId:string}>('start_online_live_server_v1',{p_account_id:accountId,p_check_id:checkId,p_run_id:id,p_seed_hash:digest(seed),p_private_state:{run,seed},p_client_projection:projection(run,1),p_members:members});
  return result.runId;
 }
 async load(accountId:string,runId:string){
  const loaded=await this.services.rpc<Loaded>('load_coop_runtime_server_v1',{p_run_id:runId,p_actor_account_id:accountId});
  if((loaded.clientProjection as {mode?:string})?.mode!=='live')throw new GameplayError('not_live_run',404);
  const presence=await this.touch(accountId,runId,loaded);
  const pending=loaded.privateState.pending,decision=await this.ensureDecision(accountId,loaded),client=this.withPresence(this.decorate(loaded.clientProjection,decision),presence);
  if(!pending||loaded.serverNow<pending.resolvesAtMs)return client;
  const run=pending.run,last=run.lastResolution!;
  const completed=run.phase==='completed'||run.phase==='failed';
  return this.services.rpc('finalize_online_live_node_server_v1',{p_account_id:accountId,p_run_id:runId,p_expected_version:loaded.stateVersion,p_private_state:{run,seed:loaded.privateState.seed},p_client_projection:projection(run,loaded.stateVersion+1),p_node_id:last.nodeId,p_result:last.result,p_start_state_hash:pending.startStateHash,p_enhanced_marks:completed?Math.max(0,Math.round((EXPEDITIONS[run.expeditionId]?.baseMarks??0)*.8)):0,p_assistance_marks:0});
 }
 async choose(accountId:string,runId:string,request:CoopDecisionCommand){
  const hash=hashRequest(request);const prior=await this.services.rpc<{requestHash:string;response:unknown}|null>('read_online_coop_receipt_server_v1',{p_account_id:accountId,p_operation:'live_choose_v1',p_resource_id:runId,p_request_id:request.requestId});
  if(prior){if(prior.requestHash!==hash)throw new GameplayError('idempotency_key_conflict',409);return prior.response;}
  const loaded=await this.services.rpc<Loaded>('load_coop_runtime_server_v1',{p_run_id:runId,p_actor_account_id:accountId});
  if((loaded.clientProjection as {mode?:string})?.mode!=='live')throw new GameplayError('not_live_run',404);
  if(loaded.privateState.pending)throw new GameplayError('node_resolving',409);
  if(request.decisionRevision!==loaded.stateVersion||request.decisionId!==loaded.privateState.run.currentNodeId)throw new GameplayError('stale_state',409);
  const presence=await this.touch(accountId,runId,loaded);
  return this.queueSelected(accountId,runId,request,loaded,request.optionId,hash,presence.safetyAiCharacterIds);
 }
 async vote(accountId:string,runId:string,request:CoopDecisionCommand){
  const hash=hashRequest(request);const prior=await this.services.rpc<{requestHash:string;response:unknown}|null>('read_online_coop_receipt_server_v1',{p_account_id:accountId,p_operation:'live_vote_v1',p_resource_id:runId,p_request_id:request.requestId});
  if(prior){if(prior.requestHash!==hash)throw new GameplayError('idempotency_key_conflict',409);return prior.response;}
  const loaded=await this.services.rpc<Loaded>('load_coop_runtime_server_v1',{p_run_id:runId,p_actor_account_id:accountId});
  if((loaded.clientProjection as {mode?:string})?.mode!=='live')throw new GameplayError('not_live_run',404);
  if(loaded.privateState.pending)throw new GameplayError('node_resolving',409);
  const presence=await this.touch(accountId,runId,loaded);
  const decision=await this.ensureDecision(accountId,loaded);
  if(!decision||decision.decisionId!==request.decisionId||decision.revision!==request.decisionRevision)throw new GameplayError('stale_decision',409);
  const result=await this.services.rpc<DecisionState>('record_online_live_vote_server_v1',{p_run_id:runId,p_account_id:accountId,p_decision_id:request.decisionId,p_revision:request.decisionRevision,p_option_id:request.optionId,p_request_id:request.requestId,p_request_hash:hash});
  if(result.status!=='resolved')return this.withPresence(this.decorate(loaded.clientProjection,result),presence);
  return this.queueSelected(accountId,runId,request,loaded,result.selectedOptionId??request.optionId,hash,presence.safetyAiCharacterIds);
 }
 async chat(accountId:string,runId:string,requestId:string,body?:string){
  return this.services.rpc('online_live_party_chat_server_v1',{p_run_id:runId,p_account_id:accountId,p_request_id:body===undefined?null:requestId,p_body:body===undefined?null:body});
 }
}
