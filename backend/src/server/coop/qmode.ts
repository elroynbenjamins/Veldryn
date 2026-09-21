import type { CoopRouteGraph } from '../../shared/coop-types';
import { combatantFromVerifiedSnapshot } from '../combat/snapshot-adapter';
import type { CombatantDefinition } from '../combat/types';
import { EXPEDITIONS } from '../expeditions/content/launch-content';
import { initialPersistentRunState, purchaseMerchantOffer, resolveCoopNode, type PersistentRunState, type NodeResolutionResult } from '../expeditions/node-resolution';
import { generateCoopRouteGraph } from '../expeditions/route-generation';
import { marksForRun } from '../expeditions/rewards';
import type { FrozenLoadoutSnapshot } from './loadout-snapshots';
import { recruitEligibleEchoes, type PublishedEcho } from './echo-recruitment';
import { validateCoopRoster } from './invariants';
import {coopRequiredLevel} from './config';

export interface QModeRun {
 id:string; requestId:string; controllerAccountId:string; expeditionId:string; tier:1|2|3|4|5;
 graph:CoopRouteGraph; currentNodeId:string; phase:'awaiting_choice'|'completed'|'failed';
 players:CombatantDefinition[]; persistentState:PersistentRunState; echoSourceAccountIds:string[]; rewardMarks?:number;
 lastResolution?:{nodeId:string;result:NodeResolutionResult};
}
export interface QModeRunRepository {get(runId:string):QModeRun|undefined; getByRequest(accountId:string,requestId:string):QModeRun|undefined; save(run:QModeRun):void;}
export class MemoryQModeRunRepository implements QModeRunRepository{
 private runs=new Map<string,QModeRun>(); private requests=new Map<string,string>();
 get(runId:string){const run=this.runs.get(runId);return run?structuredClone(run):undefined;}
 getByRequest(accountId:string,requestId:string){const id=this.requests.get(`${accountId}:${requestId}`);return id?this.get(id):undefined;}
 save(run:QModeRun){this.runs.set(run.id,structuredClone(run));this.requests.set(`${run.controllerAccountId}:${run.requestId}`,run.id);}
}

function combatant(snapshot:FrozenLoadoutSnapshot):CombatantDefinition{return combatantFromVerifiedSnapshot(snapshot.normalized.snapshot,snapshot.normalized.abilities);}

export class QModeService{
 constructor(private repository:QModeRunRepository,private serverSecret:string){}
 create(input:{requestId:string;runId:string;controllerAccountId:string;controllerSnapshot:FrozenLoadoutSnapshot;expeditionId:string;tier:1|2|3|4|5;contentVersion:string;balanceVersion:string;nowMs:number;profiles:PublishedEcho[]}):QModeRun{
  const prior=this.repository.getByRequest(input.controllerAccountId,input.requestId);if(prior)return prior;
  const definition=EXPEDITIONS[input.expeditionId];if(!definition)throw new Error('unknown_expedition');if(!definition.coopImplemented)throw new Error('expedition_not_implemented');
  const echoes=recruitEligibleEchoes({serverSecret:this.serverSecret,requestId:input.requestId,controllerAccountId:input.controllerAccountId,controllerRole:input.controllerSnapshot.readiness.role,controllerClassId:input.controllerSnapshot.classId,contentVersion:input.contentVersion,nowMs:input.nowMs,profiles:input.profiles});
  const requiredLevel=coopRequiredLevel(definition.minLevel,input.tier);for(const snapshot of [input.controllerSnapshot,...echoes.map(echo=>echo.snapshot)])if(snapshot.normalized.before.level<requiredLevel)throw new Error(`character_below_tier_level:${snapshot.characterId}`);
  validateCoopRoster([{accountId:input.controllerAccountId,characterId:input.controllerSnapshot.characterId,role:input.controllerSnapshot.readiness.role},...echoes.map(echo=>({accountId:echo.sourceAccountId,characterId:echo.snapshot.characterId,role:echo.snapshot.readiness.role}))]);
  const players=[combatant(input.controllerSnapshot),...echoes.map(echo=>combatant(echo.snapshot))];
  const graph=generateCoopRouteGraph(this.serverSecret,input.expeditionId,input.runId,input.contentVersion,input.balanceVersion);
  const run:QModeRun={id:input.runId,requestId:input.requestId,controllerAccountId:input.controllerAccountId,expeditionId:input.expeditionId,tier:input.tier,graph,currentNodeId:graph.entryNodeId,phase:'awaiting_choice',players,persistentState:initialPersistentRunState(players),echoSourceAccountIds:echoes.map(echo=>echo.sourceAccountId)};
  this.repository.save(run);return structuredClone(run);
 }
 getAuthorized(runId:string,accountId:string):QModeRun{const run=this.repository.get(runId);if(!run)throw new Error('run_not_found');if(run.controllerAccountId!==accountId)throw new Error('not_participant');return run;}
 choose(input:{runId:string;controllerAccountId:string;optionNodeId:string}):QModeRun{
  const run=this.getAuthorized(input.runId,input.controllerAccountId);if(run.phase!=='awaiting_choice')throw new Error('run_not_awaiting_choice');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||!current.nextNodeIds.includes(input.optionNodeId))throw new Error('invalid_option');
  const selected=run.graph.nodes.find(node=>node.nodeId===input.optionNodeId);if(!selected)throw new Error('invalid_option');
  const result=resolveCoopNode({runId:run.id,serverSecret:this.serverSecret,node:selected,players:run.players,state:run.persistentState});
  run.lastResolution={nodeId:selected.nodeId,result:structuredClone(result)};
  run.persistentState=result.state;run.currentNodeId=selected.nodeId;
  if(!result.success)run.phase='failed';
  else if(selected.kind==='boss'){
   run.phase='completed';const def=EXPEDITIONS[run.expeditionId];run.rewardMarks=marksForRun(def.baseMarks,run.tier,{cleared:true,routeProgress:1,reachedFinalBoss:true});
  }
  this.repository.save(run);return structuredClone(run);
 }
 purchaseMerchant(input:{runId:string;controllerAccountId:string;actorId:string;offerId:string}):QModeRun{
  const run=this.getAuthorized(input.runId,input.controllerAccountId);if(run.phase!=='awaiting_choice')throw new Error('run_not_awaiting_choice');
  const node=run.graph.nodes.find(item=>item.nodeId===run.currentNodeId);if(!node)throw new Error('run_node_not_found');
  const result=purchaseMerchantOffer({runId:run.id,node,actorId:input.actorId,offerId:input.offerId,state:run.persistentState,players:run.players});
  run.lastResolution={nodeId:node.nodeId,result:structuredClone(result)};run.persistentState=result.state;this.repository.save(run);return structuredClone(run);
 }
}
