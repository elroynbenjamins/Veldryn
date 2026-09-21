import type { CoopRouteNode } from '../../shared/coop-types';
import { deterministicInt } from './rng';
import { resolveExpeditionCombat } from '../combat/expedition-combat-service';
import type { CombatantDefinition, PersistentActorState } from '../combat/types';
import { COOP_CLASS_ABILITY_MULTIPLIERS,ROOTBOUND_COOP_BALANCE_V2, type RootboundCoopBalance } from '../coop/config';

export interface PersistentRunState {
  actors:Record<string,PersistentActorState>;
  resources:number;
  boons:string[];
  artifacts:string[];
  curses:string[];
  personalEffects:Record<string,{boons:string[];artifacts:string[];purchases:string[]}>;
  visitedNodeIds:string[];
}
export interface NodeResolutionResult {success:boolean;state:PersistentRunState;summary:Record<string,unknown>}
export interface MerchantOffer {id:string;label:string;cost:number;kind:'boon'|'artifact'|'salve'}

const COMBAT_KINDS=new Set(['battle','elite','boss']);
const IMPLEMENTED_NONCOMBAT=new Set(['event','camp','shrine','treasure','forge','merchant','echo','risk','secret']);

export function initialPersistentRunState(players:readonly CombatantDefinition[]):PersistentRunState{
 return {actors:Object.fromEntries(players.map(player=>[player.id,{hp:player.stats.maxHp,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0}])),resources:0,boons:[],artifacts:[],curses:[],personalEffects:{},visitedNodeIds:[]};
}

export function merchantOffers(contentId:string):readonly MerchantOffer[]{
 const prefix=contentId.replace(/[^A-Z0-9_]/gi,'').toUpperCase();
 return [
  {id:`${prefix}:boon`,label:'Sealed boon',cost:2,kind:'boon'},
  {id:`${prefix}:artifact`,label:'Run artifact',cost:3,kind:'artifact'},
  {id:`${prefix}:salve`,label:'Restorative salve',cost:1,kind:'salve'},
 ];
}

export function purchaseMerchantOffer(input:{runId:string;node:CoopRouteNode;actorId:string;offerId:string;state:PersistentRunState;players:readonly CombatantDefinition[]}):NodeResolutionResult{
 if(input.node.kind!=='merchant')throw new Error('not_a_merchant_node');
 if(!input.state.visitedNodeIds.includes(input.node.nodeId))throw new Error('merchant_not_resolved');
 const actor=input.state.actors[input.actorId];if(!actor)throw new Error('unknown_merchant_actor');
 const offer=merchantOffers(input.node.contentId).find(item=>item.id===input.offerId);if(!offer)throw new Error('invalid_merchant_offer');
 const current=input.state.personalEffects[input.actorId]??{boons:[],artifacts:[],purchases:[]};
 if(current.purchases.includes(offer.id))throw new Error('merchant_offer_already_purchased');
 if(input.state.resources<offer.cost)throw new Error('insufficient_run_resources');
 const purchases=[...current.purchases,offer.id];
 const nextPersonal={...current,purchases};
 let actors=input.state.actors;
 let boons=current.boons,artifacts=current.artifacts;
 if(offer.kind==='boon')boons=[...boons,`${input.node.contentId}:merchant_boon`];
 if(offer.kind==='artifact')artifacts=[...artifacts,`${input.node.contentId}:merchant_artifact`];
 if(offer.kind==='salve'){
  const player=input.players.find(item=>item.id===input.actorId);if(!player)throw new Error('unknown_merchant_actor');
  actors={...actors,[input.actorId]:{...actor,downed:false,hp:Math.min(player.stats.maxHp,actor.hp+player.stats.maxHp*.35)}};
 }
 return {success:true,state:{...input.state,actors,resources:input.state.resources-offer.cost,personalEffects:{...input.state.personalEffects,[input.actorId]:{...nextPersonal,boons,artifacts}}},summary:{kind:'merchant_purchase',actorId:input.actorId,offerId:offer.id,cost:offer.cost}};
}

function healAtCamp(state:PersistentRunState,players:readonly CombatantDefinition[]):PersistentRunState{
 const actors={...state.actors}; let revived=false;
 for(const player of players){const current=actors[player.id];if(!current)continue;if(current.downed&&!revived){actors[player.id]={...current,downed:false,hp:Math.max(1,player.stats.maxHp*.25)};revived=true;}else actors[player.id]={...current,hp:Math.min(player.stats.maxHp,current.hp+player.stats.maxHp*.30)};}
 return {...state,actors};
}

export function resolveCoopNode(input:{runId:string;serverSecret:string;node:CoopRouteNode;players:CombatantDefinition[];state:PersistentRunState;rootboundBalance?:RootboundCoopBalance;enemyAttackMultiplier?:number;enemyHpMultiplier?:number;enemyDefenseMultiplier?:number}):NodeResolutionResult{
 if(input.state.visitedNodeIds.includes(input.node.nodeId))throw new Error('node_already_resolved');
 if(input.node.kind==='entry')throw new Error('entry_is_not_resolvable');
 let state={...input.state,visitedNodeIds:[...input.state.visitedNodeIds,input.node.nodeId]};
 if(COMBAT_KINDS.has(input.node.kind)){
  const rootbound=input.node.contentId.startsWith('ROOT')||input.node.contentId==='BOSS_EXP_ROOT',balance=input.rootboundBalance??ROOTBOUND_COOP_BALANCE_V2;
  const players=input.players.map(player=>{const multipliers=COOP_CLASS_ABILITY_MULTIPLIERS[player.classId?.toUpperCase()??''];if(!multipliers)return player;return{...player,abilities:player.abilities.map(ability=>{const multiplier=multipliers[ability.id];return multiplier?{...ability,effects:ability.effects.map(effect=>(effect.kind==='shield'||effect.kind==='heal')&&effect.coeff!==undefined?{...effect,coeff:effect.coeff*multiplier}:effect)}:ability;})};});
  const depthMultiplier=input.node.depth>=balance.lateDepthStart?balance.lateDepthAttackMultiplier:1;
  const combat=resolveExpeditionCombat({runId:input.runId,nodeIndex:input.node.depth,encounterId:input.node.contentId,serverSeed:input.serverSecret,players,initialPlayerState:state.actors,enemyAttackMultiplier:(rootbound?balance.enemyAttackMultiplier*depthMultiplier:1)*(input.enemyAttackMultiplier??1),enemyHpMultiplier:input.enemyHpMultiplier,enemyDefenseMultiplier:input.enemyDefenseMultiplier});
  state={...state,actors:combat.endingPlayerState};
  return {success:combat.success,state,summary:{kind:'combat',...combat.resultJson}};
 }
 if(!IMPLEMENTED_NONCOMBAT.has(input.node.kind))throw new Error(`unsupported_node_kind:${input.node.kind}`);
 const roll=deterministicInt(input.serverSecret,1,999,'node-resolution-v1',input.runId,input.node.nodeId,input.node.contentId);
 switch(input.node.kind){
  case 'camp': state=healAtCamp(state,input.players); break;
  case 'shrine': case 'forge': case 'echo': state={...state,boons:[...state.boons,`${input.node.contentId}:${roll}`]}; break;
  case 'treasure': case 'secret': state={...state,artifacts:[...state.artifacts,`${input.node.contentId}:${roll}`]}; break;
  case 'risk': state={...state,curses:[...state.curses,`${input.node.contentId}:${roll}`],resources:state.resources+2}; break;
  case 'event': state={...state,resources:state.resources+1}; break;
  case 'merchant': state={...state}; break;
 }
 return {success:true,state,summary:{kind:input.node.kind,roll,...(input.node.kind==='merchant'?{offers:merchantOffers(input.node.contentId)}:{})}};
}
