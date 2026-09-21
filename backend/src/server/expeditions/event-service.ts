import type { CoopRouteGraph, CoopRouteNode } from '../../shared/coop-types';
import type { CombatantDefinition } from '../combat/types';
import { EVENT_EXPEDITIONS, type EventExpeditionDefinition } from './content/event-expeditions';
import { initialPersistentRunState, resolveCoopNode, type NodeResolutionResult, type PersistentRunState } from './node-resolution';
import { validateCoopRoster } from '../coop/invariants';
import type { CoopRole } from '../../shared/coop-types';
import { deterministicInt } from './rng';
import { validateCoopRouteGraph } from './route-generation';

export interface EventMechanicState {id:string;value:number;}
export interface EventRun {id:string;requestId:string;accountIds:string[];eventId:string;graph:CoopRouteGraph;players:CombatantDefinition[];persistentState:PersistentRunState;mechanic?:EventMechanicState;currentNodeId:string;phase:'awaiting_choice'|'completed'|'failed';settlement:'pending'|'claimed';rewardMarks?:number;lastResolution?:{nodeId:string;result:NodeResolutionResult};}
export interface EventRunRepository {get(id:string):EventRun|undefined;getByRequest(accountId:string,requestId:string):EventRun|undefined;save(run:EventRun):void;}
export class MemoryEventRunRepository implements EventRunRepository{private runs=new Map<string,EventRun>();private requests=new Map<string,string>();get(id:string){const run=this.runs.get(id);return run?structuredClone(run):undefined;}getByRequest(accountId:string,requestId:string){const id=this.requests.get(`${accountId}:${requestId}`);return id?this.get(id):undefined;}save(run:EventRun){this.runs.set(run.id,structuredClone(run));this.requests.set(`${run.accountIds[0]}:${run.requestId}`,run.id);}}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const definitionFor=(eventId:string):EventExpeditionDefinition=>{const definition=EVENT_EXPEDITIONS.find(item=>item.id===eventId);if(!definition)throw new Error('unknown_event_expedition');return definition;};

export function eventMechanicProjection(run:EventRun){
 const definition=definitionFor(run.eventId),config=definition.mechanic,value=clamp(run.mechanic?.value??config.startValue,0,config.maxValue);
 const status=value<=config.lowThreshold?'critical' as const:value>=config.highThreshold?'strong' as const:'steady' as const;
 const bossAttackMultiplier=status==='critical'?config.lowBossAttackMultiplier:status==='strong'?config.highBossAttackMultiplier:1;
 const rewardBonus=status==='strong'?config.highRewardBonus:0;
 const bossPct=Math.round(Math.abs(bossAttackMultiplier-1)*100);
 const bossEffect=status==='critical'?`Boss attack +${bossPct}% while ${config.label.toLowerCase()} is critical.`:status==='strong'?`Boss attack -${bossPct}% · +${rewardBonus} event currency on clear.`:`Reach ${config.highThreshold}+ for a boss advantage and +${config.highRewardBonus} event currency.`;
 return {id:config.id,label:config.label,description:config.description,value,maxValue:config.maxValue,lowThreshold:config.lowThreshold,highThreshold:config.highThreshold,status,bossAttackMultiplier,rewardBonus,bossEffect};
}

function graph(eventId:string,runId:string,serverSecret:string):CoopRouteGraph{
 const definition=definitionFor(eventId),prefix=definition.encounterPrefix,boss=definition.bossEncounterId,count=definition.routeNodeCount;
 const idsAt=(depth:number)=>[0,1,2].map(choice=>`d${depth}-c${choice}`);
 const nodes:CoopRouteNode[]=[{nodeId:'entry',depth:0,kind:'entry',contentId:'COOP_ENTRY',modifierId:'none',risk:1,rewardTag:'none',nextNodeIds:idsAt(1)}];
 for(let depth=1;depth<=count;depth++){
  const next=depth===count?['boss']:idsAt(depth+1);
  const base=deterministicInt(serverSecret,1,3,'event-route-v2',eventId,runId,depth);
  for(const choice of [0,1,2]){
   const special=definition.specialNodes.find(item=>item.depth===depth&&item.choice===choice);
   if(special){
    nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:special.kind,contentId:special.contentId,modifierId:`event-${choice}`,risk:special.risk??(special.kind==='risk'?1.18:special.kind==='elite'?1.10:1),rewardTag:special.rewardTag,nextNodeIds:next,title:special.title,mechanicDelta:special.mechanicDelta});
    continue;
   }
   const contentIndex=((base+choice-1)%3)+1;
   const highlight=definition.routeHighlights[(depth-1)%definition.routeHighlights.length];
   nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:'battle',contentId:`${prefix}_BATTLE_0${contentIndex}`,modifierId:`event-${choice}`,risk:1,rewardTag:'battle',nextNodeIds:next,title:`Battle through ${highlight}`,mechanicDelta:definition.mechanic.battleDelta});
  }
 }
 nodes.push({nodeId:'boss',depth:count+1,kind:'boss',contentId:boss,modifierId:'final',risk:1.25,rewardTag:'boss',nextNodeIds:[],title:definition.finalBoss,mechanicDelta:0});
 const result:CoopRouteGraph={schemaVersion:1,generatorVersion:'event-route-v2',runId,expeditionId:eventId,contentVersion:'event-v2',balanceVersion:'event-balance-v2',preBossNodeCount:count,entryNodeId:'entry',bossNodeId:'boss',nodes};validateCoopRouteGraph(result);return result;
}

export class EventExpeditionService{
 private commandReceipts=new Map<string,{hash:string;run:EventRun}>();private claims=new Map<string,{marks:number}>();
 constructor(private repository:EventRunRepository,private serverSecret:string){}
 start(input:{requestId:string;runId:string;accountId:string;eventId:string;activeLiveEventId?:string;members:Array<{accountId:string;characterId:string;role:CoopRole}>;players:CombatantDefinition[];nowMs:number}):EventRun{
  const prior=this.repository.getByRequest(input.accountId,input.requestId);if(prior)return prior;
  const definition=definitionFor(input.eventId);
  // Player-event LiveOps is authoritative for entry. Calendar dates are preview metadata only.
  // This means an Owner Hard off immediately blocks new expedition runs, while manual
  // Go live outside the normal seasonal window can intentionally open the matching route.
  if(!input.activeLiveEventId||!input.activeLiveEventId.startsWith(`${definition.liveEventSeriesId}_`))throw new Error('event_not_live');
  validateCoopRoster(input.members);if(input.players.length!==4||input.players.some(player=>player.level<definition.minLevel))throw new Error('event_level_requirement');
  if(!/^[-a-zA-Z0-9_]{8,128}$/.test(input.requestId)||!/^[-a-zA-Z0-9_]{8,128}$/.test(input.runId))throw new Error('invalid_event_identity');
  const run:EventRun={id:input.runId,requestId:input.requestId,accountIds:input.members.map(member=>member.accountId),eventId:input.eventId,graph:graph(input.eventId,input.runId,this.serverSecret),players:input.players,persistentState:initialPersistentRunState(input.players),mechanic:{id:definition.mechanic.id,value:definition.mechanic.startValue},currentNodeId:'entry',phase:'awaiting_choice',settlement:'pending'};this.repository.save(run);return structuredClone(run);
 }
 choose(input:{runId:string;accountId:string;optionNodeId:string;requestId:string}):EventRun{
  const hash=`${input.runId}:${input.accountId}:${input.optionNodeId}`,receiptKey=`${input.runId}:${input.requestId}`,prior=this.commandReceipts.get(receiptKey);if(prior){if(prior.hash!==hash)throw new Error('event_idempotency_conflict');return structuredClone(prior.run);}
  const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='awaiting_choice')throw new Error('event_run_not_awaiting_choice');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||!current.nextNodeIds.includes(input.optionNodeId))throw new Error('invalid_event_option');const selected=run.graph.nodes.find(node=>node.nodeId===input.optionNodeId);if(!selected)throw new Error('invalid_event_option');
  const beforeMechanic=eventMechanicProjection(run),enemyAttackMultiplier=selected.kind==='boss'?beforeMechanic.bossAttackMultiplier:1;
  const result=resolveCoopNode({runId:run.id,serverSecret:this.serverSecret,node:selected,players:run.players,state:run.persistentState,enemyAttackMultiplier});run.lastResolution={nodeId:selected.nodeId,result:structuredClone(result)};run.persistentState=result.state;run.currentNodeId=selected.nodeId;
  if(result.success&&selected.kind!=='boss'&&selected.mechanicDelta){const config=definitionFor(run.eventId).mechanic,current=run.mechanic?.value??config.startValue;run.mechanic={id:config.id,value:clamp(current+selected.mechanicDelta,0,config.maxValue)};}
  if(!result.success)run.phase='failed';
  if(selected.kind==='boss'&&result.success){run.phase='completed';const definition=definitionFor(run.eventId),mechanic=eventMechanicProjection(run);run.rewardMarks=definition.rewardMarks+mechanic.rewardBonus;}
  this.repository.save(run);this.commandReceipts.set(receiptKey,{hash,run:structuredClone(run)});return structuredClone(run);
 }
 claimReward(input:{runId:string;accountId:string;requestId:string}):{marks:number;idempotentReplay:boolean}{const key=`${input.accountId}:${input.requestId}`,prior=this.claims.get(key);if(prior)return{marks:prior.marks,idempotentReplay:true};const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='completed'||!run.rewardMarks)throw new Error('event_reward_not_ready');if(run.settlement==='claimed')return{marks:run.rewardMarks,idempotentReplay:true};run.settlement='claimed';this.repository.save(run);const result={marks:run.rewardMarks,idempotentReplay:false};this.claims.set(key,{marks:result.marks});return result;}
}
