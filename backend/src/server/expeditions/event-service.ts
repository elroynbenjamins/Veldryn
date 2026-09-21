import type { CoopRouteGraph, CoopRouteNode } from '../../shared/coop-types';
import type { CombatantDefinition } from '../combat/types';
import { EVENT_EXPEDITIONS, type EventExpeditionDefinition } from './content/event-expeditions';
import { initialPersistentRunState, resolveCoopNode, type NodeResolutionResult, type PersistentRunState } from './node-resolution';
import { validateCoopRoster } from '../coop/invariants';
import type { CoopRole } from '../../shared/coop-types';
import { deterministicInt } from './rng';
import { validateCoopRouteGraph } from './route-generation';
import { eventBossMechanicProfile } from './event-boss-mechanics';

export interface EventMechanicState {id:string;value:number;}
export interface EventObjectiveState {id:string;count:number;}
export interface EventRun {id:string;requestId:string;accountIds:string[];eventId:string;graph:CoopRouteGraph;players:CombatantDefinition[];persistentState:PersistentRunState;mechanic?:EventMechanicState;objective?:EventObjectiveState;currentNodeId:string;phase:'awaiting_choice'|'completed'|'failed';settlement:'pending'|'claimed';rewardMarks?:number;lastResolution?:{nodeId:string;result:NodeResolutionResult};}
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

export function eventObjectiveProjection(run:EventRun){
 const definition=definitionFor(run.eventId),config=definition.objective,count=clamp(run.objective?.count??config.startCount,0,config.maxCount);
 const completed=count>=config.maxCount;
 let bossAttackMultiplier=1,bossHpMultiplier=1,bossDefenseMultiplier=1,rewardBonus=0,preBossHealPct=0,effectText='';
 const points=count;
 switch(config.effect){
  case 'boss_attack_down': bossAttackMultiplier=clamp(1-points*config.perPoint,.5,1);effectText=`Boss attack -${Math.round((1-bossAttackMultiplier)*100)}% from ${count}/${config.maxCount} ${config.label.toLowerCase()}.`;break;
  case 'boss_hp_down': bossHpMultiplier=clamp(1-points*config.perPoint,.5,1);effectText=`Boss maximum health -${Math.round((1-bossHpMultiplier)*100)}% from ${count}/${config.maxCount} ${config.label.toLowerCase()}.`;break;
  case 'boss_defense_down': bossDefenseMultiplier=clamp(1-points*config.perPoint,.5,1);effectText=`Boss defense -${Math.round((1-bossDefenseMultiplier)*100)}% from ${count}/${config.maxCount} ${config.label.toLowerCase()}.`;break;
  case 'reward_bonus': rewardBonus=Math.round(points*config.perPoint);effectText=`+${rewardBonus} event currency if the run clears with ${count}/${config.maxCount} ${config.label.toLowerCase()}.`;break;
  case 'preboss_heal': preBossHealPct=clamp(points*config.perPoint,0,.75);effectText=`Surviving party members recover ${Math.round(preBossHealPct*100)}% max health before the final boss.`;break;
 }
 return {id:config.id,label:config.label,description:config.description,count,maxCount:config.maxCount,effect:config.effect,completed,bossAttackMultiplier,bossHpMultiplier,bossDefenseMultiplier,rewardBonus,preBossHealPct,effectText};
}

export function eventBossMechanicProjection(run:EventRun){
 if(run.graph.generatorVersion!=='event-route-v5')return undefined;
 const mechanic=eventMechanicProjection(run),objective=eventObjectiveProjection(run);
 const profile=eventBossMechanicProfile({eventId:run.eventId,objectiveCount:objective.count,objectiveMax:objective.maxCount,mechanicStatus:mechanic.status});
 return {profileId:profile.profileId,label:profile.label,summary:profile.summary,tone:profile.tone,tuning:profile.tuning};
}

export interface EffectiveEventNode extends CoopRouteNode {encounterAttackMultiplier?:number;reactionLabel?:string;}

export function effectiveEventNode(run:EventRun,node:CoopRouteNode):EffectiveEventNode{
 const next:EffectiveEventNode={...node};
 if(!['event-route-v4','event-route-v5'].includes(run.graph.generatorVersion)||node.kind==='entry'||node.kind==='boss')return next;
 const mechanic=eventMechanicProjection(run),objective=eventObjectiveProjection(run),battleLike=node.kind==='battle'||node.kind==='elite';
 const title=()=>next.title??next.kind.charAt(0).toUpperCase()+next.kind.slice(1);
 const prefix=(label:string)=>{next.title=`${label}: ${title()}`;next.reactionLabel=label;};
 switch(run.eventId){
  case 'EVENT_TURNING_CHRONICLE_VAULT':
   if(objective.count>=2&&node.depth>=5&&node.kind==='battle'&&node.nodeId.endsWith('c0')){next.kind='echo';next.risk=.92;next.mechanicDelta=(next.mechanicDelta??0)+8;next.title='Stable Timeline Echo';next.reactionLabel='Chronicle Seals stabilized this route';}
   else if(mechanic.status==='critical'&&battleLike){next.kind='elite';next.risk=clamp(next.risk+.12,.75,1.4);next.mechanicDelta=(next.mechanicDelta??0)-2;next.encounterAttackMultiplier=1.08;prefix('Temporal Fracture');}
   break;
  case 'EVENT_HEARTBOND_VOW_GARDEN':
   if(objective.count>=2&&node.depth===5&&node.kind==='battle'&&node.nodeId.endsWith('c0')){next.kind='camp';next.risk=.9;next.mechanicDelta=(next.mechanicDelta??0)+6;next.title="Vowkeeper's Respite";next.reactionLabel='Restored vows opened a safe refuge';}
   else if(mechanic.status==='critical'&&node.kind==='risk'){next.mechanicDelta=(next.mechanicDelta??0)-4;next.risk=clamp(next.risk+.08,.75,1.4);prefix('Fractured Vow');}
   break;
  case 'EVENT_BLOOMWAKE_THORNHEART_GROVE':
   if(objective.count>=2&&node.kind==='risk'){next.mechanicDelta=Math.min(-1,(next.mechanicDelta??0)+5);next.risk=clamp(next.risk-.08,.75,1.4);prefix('Heartroot-Guided');}
   if(mechanic.status==='critical'&&battleLike){next.kind='elite';next.risk=clamp(next.risk+.1,.75,1.4);next.encounterAttackMultiplier=1.08;prefix('Feral Bloom');}
   break;
  case 'EVENT_SUNCREST_SHATTERED_ISLES':
   if(mechanic.status==='strong'&&node.kind==='risk'){next.objectiveDelta=(next.objectiveDelta??0)+1;next.mechanicDelta=(next.mechanicDelta??0)+4;prefix('Crowd-Favorite Dare');}
   if(objective.completed&&node.depth===5&&node.kind==='battle'&&node.nodeId.endsWith('c0')){next.kind='elite';next.risk=1.1;next.encounterAttackMultiplier=1.04;next.mechanicDelta=(next.mechanicDelta??0)+4;next.title='Laurel Exhibition Match';next.reactionLabel='Full laurels unlocked an exhibition challenge';}
   break;
  case 'EVENT_STARFALL_ASTRAL_RIFT':
   if(objective.count>=2&&node.kind==='risk'){const delta=next.mechanicDelta??0;next.mechanicDelta=delta<0?Math.ceil(delta/2):delta;next.risk=clamp(next.risk-.08,.75,1.4);prefix('Anchored Route');}
   if(mechanic.status==='critical'&&battleLike){next.kind='elite';next.risk=clamp(next.risk+.12,.75,1.4);next.encounterAttackMultiplier=1.1;prefix('Rift Surge');}
   break;
  case 'EVENT_VEILBREAK_GLOAM_BREACH':
   if(objective.count>=2&&['event','shrine','camp'].includes(node.kind)){next.mechanicDelta=(next.mechanicDelta??0)+4;prefix('Wardlit');}
   if(mechanic.status==='critical'&&battleLike){next.kind='elite';next.risk=clamp(next.risk+.12,.75,1.4);next.encounterAttackMultiplier=1.1;prefix('Blackout Assault');}
   break;
  case 'EVENT_MERCHANT_GILDED_ROAD':
   if(objective.count<=1&&node.kind==='merchant'){next.objectiveDelta=(next.objectiveDelta??0)+1;next.mechanicDelta=(next.mechanicDelta??0)+4;next.title='Emergency Cargo Restock';next.reactionLabel='Low cargo unlocked a recovery stop';}
   if(objective.count===0&&node.kind==='risk'){next.mechanicDelta=(next.mechanicDelta??0)-3;next.risk=clamp(next.risk+.08,.75,1.4);prefix('Empty-Wagon Gamble');}
   break;
  case 'EVENT_FROSTFALL_AURORA_HOLLOW':
   if(objective.count>=2&&battleLike){next.mechanicDelta=(next.mechanicDelta??0)+3;prefix('Hearthlit');}
   if(mechanic.status==='critical'&&battleLike){next.kind='elite';next.risk=clamp(next.risk+.1,.75,1.4);next.encounterAttackMultiplier=1.08;prefix('Deep Freeze');}
   break;
 }
 return next;
}

function healBeforeBoss(state:PersistentRunState,players:readonly CombatantDefinition[],pct:number):PersistentRunState{
 if(pct<=0)return state;
 const actors={...state.actors};
 for(const player of players){
  const current=actors[player.id];
  if(!current||current.downed||current.hp<=0)continue;
  actors[player.id]={...current,hp:Math.min(player.stats.maxHp,current.hp+player.stats.maxHp*pct)};
 }
 return {...state,actors};
}

function graph(eventId:string,runId:string,serverSecret:string):CoopRouteGraph{
 const definition=definitionFor(eventId),prefix=definition.encounterPrefix,boss=definition.bossEncounterId,count=definition.routeNodeCount;
 const idsAt=(depth:number)=>[0,1,2].map(choice=>`d${depth}-c${choice}`);
 const nodes:CoopRouteNode[]=[{nodeId:'entry',depth:0,kind:'entry',contentId:'COOP_ENTRY',modifierId:'none',risk:1,rewardTag:'none',nextNodeIds:idsAt(1)}];
 for(let depth=1;depth<=count;depth++){
  const next=depth===count?['boss']:idsAt(depth+1);
  const base=deterministicInt(serverSecret,1,3,'event-route-v5',eventId,runId,depth);
  for(const choice of [0,1,2]){
   const special=definition.specialNodes.find(item=>item.depth===depth&&item.choice===choice);
   if(special){
    nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:special.kind,contentId:special.contentId,modifierId:`event-${choice}`,risk:special.risk??(special.kind==='risk'?1.18:special.kind==='elite'?1.10:1),rewardTag:special.rewardTag,nextNodeIds:next,title:special.title,mechanicDelta:special.mechanicDelta,objectiveDelta:special.objectiveDelta??0});
    continue;
   }
   const contentIndex=((base+choice-1)%3)+1;
   const highlight=definition.routeHighlights[(depth-1)%definition.routeHighlights.length];
   nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:'battle',contentId:`${prefix}_BATTLE_0${contentIndex}`,modifierId:`event-${choice}`,risk:1,rewardTag:'battle',nextNodeIds:next,title:`Battle through ${highlight}`,mechanicDelta:definition.mechanic.battleDelta,objectiveDelta:0});
  }
 }
 nodes.push({nodeId:'boss',depth:count+1,kind:'boss',contentId:boss,modifierId:'final',risk:1.25,rewardTag:'boss',nextNodeIds:[],title:definition.finalBoss,mechanicDelta:0,objectiveDelta:0});
 const result:CoopRouteGraph={schemaVersion:1,generatorVersion:'event-route-v5',runId,expeditionId:eventId,contentVersion:'event-v5',balanceVersion:'event-balance-v5',preBossNodeCount:count,entryNodeId:'entry',bossNodeId:'boss',nodes};validateCoopRouteGraph(result,{preBossNodeMin:5,preBossNodeMax:7});return result;
}

export class EventExpeditionService{
 private commandReceipts=new Map<string,{hash:string;run:EventRun}>();private claims=new Map<string,{marks:number}>();
 constructor(private repository:EventRunRepository,private serverSecret:string){}
 start(input:{requestId:string;runId:string;accountId:string;eventId:string;activeLiveEventId?:string;members:Array<{accountId:string;characterId:string;role:CoopRole}>;players:CombatantDefinition[];nowMs:number}):EventRun{
  const prior=this.repository.getByRequest(input.accountId,input.requestId);if(prior)return prior;
  const definition=definitionFor(input.eventId);
  if(!input.activeLiveEventId||!input.activeLiveEventId.startsWith(`${definition.liveEventSeriesId}_`))throw new Error('event_not_live');
  validateCoopRoster(input.members);if(input.players.length!==4||input.players.some(player=>player.level<definition.minLevel))throw new Error('event_level_requirement');
  if(!/^[-a-zA-Z0-9_]{8,128}$/.test(input.requestId)||!/^[-a-zA-Z0-9_]{8,128}$/.test(input.runId))throw new Error('invalid_event_identity');
  const run:EventRun={id:input.runId,requestId:input.requestId,accountIds:input.members.map(member=>member.accountId),eventId:input.eventId,graph:graph(input.eventId,input.runId,this.serverSecret),players:input.players,persistentState:initialPersistentRunState(input.players),mechanic:{id:definition.mechanic.id,value:definition.mechanic.startValue},objective:{id:definition.objective.id,count:definition.objective.startCount},currentNodeId:'entry',phase:'awaiting_choice',settlement:'pending'};this.repository.save(run);return structuredClone(run);
 }
 choose(input:{runId:string;accountId:string;optionNodeId:string;requestId:string}):EventRun{
  const hash=`${input.runId}:${input.accountId}:${input.optionNodeId}`,receiptKey=`${input.runId}:${input.requestId}`,prior=this.commandReceipts.get(receiptKey);if(prior){if(prior.hash!==hash)throw new Error('event_idempotency_conflict');return structuredClone(prior.run);}
  const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='awaiting_choice')throw new Error('event_run_not_awaiting_choice');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||!current.nextNodeIds.includes(input.optionNodeId))throw new Error('invalid_event_option');const baseSelected=run.graph.nodes.find(node=>node.nodeId===input.optionNodeId);if(!baseSelected)throw new Error('invalid_event_option');const selected=effectiveEventNode(run,baseSelected);
  const beforeMechanic=eventMechanicProjection(run),beforeObjective=eventObjectiveProjection(run),bossMechanic=selected.kind==='boss'?eventBossMechanicProjection(run):undefined;
  let startingState=run.persistentState;
  if(selected.kind==='boss'&&beforeObjective.preBossHealPct>0)startingState=healBeforeBoss(startingState,run.players,beforeObjective.preBossHealPct);
  const result=resolveCoopNode({runId:run.id,serverSecret:this.serverSecret,node:selected,players:run.players,state:startingState,enemyAttackMultiplier:selected.kind==='boss'?beforeMechanic.bossAttackMultiplier*beforeObjective.bossAttackMultiplier:(selected.encounterAttackMultiplier??1),enemyHpMultiplier:selected.kind==='boss'?beforeObjective.bossHpMultiplier:1,enemyDefenseMultiplier:selected.kind==='boss'?beforeObjective.bossDefenseMultiplier:1,bossTuning:bossMechanic?.tuning});
  run.lastResolution={nodeId:selected.nodeId,result:structuredClone(result)};run.persistentState=result.state;run.currentNodeId=selected.nodeId;
  if(result.success&&selected.kind!=='boss'){
   const definition=definitionFor(run.eventId);
   if(selected.mechanicDelta){const currentValue=run.mechanic?.value??definition.mechanic.startValue;run.mechanic={id:definition.mechanic.id,value:clamp(currentValue+selected.mechanicDelta,0,definition.mechanic.maxValue)};}
   if(selected.objectiveDelta){const currentCount=run.objective?.count??definition.objective.startCount;run.objective={id:definition.objective.id,count:clamp(currentCount+selected.objectiveDelta,0,definition.objective.maxCount)};}
  }
  if(!result.success)run.phase='failed';
  if(selected.kind==='boss'&&result.success){run.phase='completed';const definition=definitionFor(run.eventId),mechanic=eventMechanicProjection(run),objective=eventObjectiveProjection(run);run.rewardMarks=definition.rewardMarks+mechanic.rewardBonus+objective.rewardBonus;}
  this.repository.save(run);this.commandReceipts.set(receiptKey,{hash,run:structuredClone(run)});return structuredClone(run);
 }
 claimReward(input:{runId:string;accountId:string;requestId:string}):{marks:number;idempotentReplay:boolean}{const key=`${input.accountId}:${input.requestId}`,prior=this.claims.get(key);if(prior)return{marks:prior.marks,idempotentReplay:true};const run=this.repository.get(input.runId);if(!run)throw new Error('event_run_not_found');if(!run.accountIds.includes(input.accountId))throw new Error('not_participant');if(run.phase!=='completed'||!run.rewardMarks)throw new Error('event_reward_not_ready');if(run.settlement==='claimed')return{marks:run.rewardMarks,idempotentReplay:true};run.settlement='claimed';this.repository.save(run);const result={marks:run.rewardMarks,idempotentReplay:false};this.claims.set(key,{marks:result.marks});return result;}
}
