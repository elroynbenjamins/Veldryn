import type { CoopRouteGraph, CoopRouteNode } from '../../shared/coop-types';
import type { CombatantDefinition } from '../combat/types';
import { eventExpeditionPreviews, EVENT_EXPEDITIONS } from './content/event-expeditions';
import { initialPersistentRunState, resolveCoopNode, type NodeResolutionResult, type PersistentRunState } from './node-resolution';
import { validateCoopRoster } from '../coop/invariants';
import type { CoopRole } from '../../shared/coop-types';
import { deterministicInt } from './rng';
import { validateCoopRouteGraph } from './route-generation';

export interface EventRun {id:string;requestId:string;accountIds:string[];eventId:string;graph:CoopRouteGraph;players:CombatantDefinition[];persistentState:PersistentRunState;currentNodeId:string;phase:'awaiting_choice'|'completed'|'failed';settlement:'pending'|'claimed';rewardMarks?:number;}
export interface EventRunRepository {get(id:string):EventRun|undefined;getByRequest(accountId:string,requestId:string):EventRun|undefined;save(run:EventRun):void;}
export class MemoryEventRunRepository implements EventRunRepository{private runs=new Map<string,EventRun>();private requests=new Map<string,string>();get(id:string){const run=this.runs.get(id);return run?structuredClone(run):undefined;}getByRequest(accountId:string,requestId:string){const id=this.requests.get(`${accountId}:${requestId}`);return id?this.get(id):undefined;}save(run:EventRun){this.runs.set(run.id,structuredClone(run));this.requests.set(`${run.accountIds[0]}:${run.requestId}`,run.id);}}

function graph(eventId:string,runId:string,serverSecret:string):CoopRouteGraph{
 const sun=eventId==='EVENT_SUNCREST_SHATTERED_ISLES',prefix=sun?'EVENT_SUNCREST':'EVENT_STARFALL',boss=sun?'EVENT_SUNCREST_BOSS':'EVENT_STARFALL_BOSS';
 const nodes:CoopRouteNode[]=[{nodeId:'entry',depth:0,kind:'entry',contentId:'COOP_ENTRY',modifierId:'none',risk:1,rewardTag:'none',nextNodeIds:['d1-c0','d1-c1','d1-c2']}];
 for(let depth=1;depth<=5;depth++){const ids=[0,1,2].map(choice=>`d${depth}-c${choice}`);for(const choice of [0,1,2]){const base=deterministicInt(serverSecret,1,3,'event-route-v1',eventId,runId,depth);const contentIndex=((base+choice-2)%3)+1;nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:depth===3&&choice===1?'camp':'battle',contentId:depth===3&&choice===1?`${prefix}_CAMP`:`${prefix}_BATTLE_0${contentIndex}`,modifierId:`event-${choice}`,risk:1,rewardTag:depth===3&&choice===1?'camp':'battle',nextNodeIds:depth===5?['boss']:ids.map((_,index)=>`d${depth+1}-c${index}`)});}}
 nodes.push({nodeId:'boss',depth:6,kind:'boss',contentId:boss,modifierId:'final',risk:1.25,rewardTag:'boss',nextNodeIds:[]});
 const result:CoopRouteGraph={schemaVersion:1,generatorVersion:'event-route-v1',runId,expeditionId:eventId,contentVersion:'event-v1',balanceVersion:'event-balance-v1',preBossNodeCount:5,entryNodeId:'entry',bossNodeId:'boss',nodes};validateCoopRouteGraph(result);return result;
}

export class EventExpeditionService{
 private commandReceipts=new Map<string,{hash:string;run:EventRun}>();private claims=new Map<string,{marks:number}>();
 constructor(private repository:EventRunRepository,private serverSecret:string){}
 start(input:{requestId:string;runId:string;accountId:string;eventId:string;members:Array<{accountId:string;characterId:string;role:CoopRole}>;players:CombatantDefinition[];nowMs:number}):EventRun{
  const prior=this.repository.getByRequest(input.accountId,input.requestId);if(prior)return prior;
  const definition=EVENT_EXPEDITIONS.find(item=>item.id===input.eventId);if(!definition)throw new Error('unknown_event_expedition');
  const scheduled=eventExpeditionPreviews(input.nowMs).find(item=>item.id===input.eventId)?.scheduled;if(!scheduled)throw new Error('event_not_active');
  validateCoopRoster(input.members);if(input.players.length!==4||input.players.some(player=>player.level<definition.minLevel))throw new Error('event_level_requirement');
  if(!/^[-a-zA-Z0-9_]{8,128}$/.test(input.requestId)||!/^[-a-zA-Z0-9_]{8,128}$/.test(input.runId))throw new Error('invalid_event_identity');
  const run:EventRun={id:input.runId,requestId:input.requestId,accountIds:input.members.map(member=>member.accountId),eventId:input.eventId,graph:graph(input.eventId,input.runId,this.serverSecret),players:input.players,persistentState:initialPersistentRunState(input.players),currentNodeId:'entry',phase:'awaiting_choice',settlement:'pending'};this.repository.save(run);return structuredClone(run);
 }
 choose(input:{runId:string;accountId:string;optionNodeId:string;requestId:string}):EventRun{
  const hash=`${input.runId}:${input.accountId}:${input.optionNodeId}`,receiptKey=`${input.runId}:${input.requestId}`,prior=this.commandReceipts.get(receiptKey);if(prior){if(prior.hash!==hash)throw new Error('event_idempotency_conflict');return structuredClone(prior.run);}
  const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='awaiting_choice')throw new Error('event_run_not_awaiting_choice');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||!current.nextNodeIds.includes(input.optionNodeId))throw new Error('invalid_event_option');const selected=run.graph.nodes.find(node=>node.nodeId===input.optionNodeId);if(!selected)throw new Error('invalid_event_option');
  const result=resolveCoopNode({runId:run.id,serverSecret:this.serverSecret,node:selected,players:run.players,state:run.persistentState});run.persistentState=result.state;run.currentNodeId=selected.nodeId;if(!result.success)run.phase='failed';if(selected.kind==='boss'&&result.success){run.phase='completed';run.rewardMarks=EVENT_EXPEDITIONS.find(item=>item.id===run.eventId)!.rewardMarks;}this.repository.save(run);this.commandReceipts.set(receiptKey,{hash,run:structuredClone(run)});return structuredClone(run);
 }
 claimReward(input:{runId:string;accountId:string;requestId:string}):{marks:number;idempotentReplay:boolean}{const key=`${input.accountId}:${input.requestId}`,prior=this.claims.get(key);if(prior)return{marks:prior.marks,idempotentReplay:true};const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='completed'||!run.rewardMarks)throw new Error('event_reward_not_ready');if(run.settlement==='claimed')return{marks:run.rewardMarks,idempotentReplay:true};run.settlement='claimed';this.repository.save(run);const result={marks:run.rewardMarks,idempotentReplay:false};this.claims.set(key,{marks:result.marks});return result;}
}
