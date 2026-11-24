import type { CoopRouteNode } from '../../shared/coop-types';
import { deterministicInt } from './rng';
import { resolveExpeditionCombat } from '../combat/expedition-combat-service';
import {coopTierEnemyMultipliers} from './tier-balance';
import type {ExpeditionTier} from './constants';
import type { CombatantDefinition, EncounterBossTuning, PersistentActorState } from '../combat/types';
import {rollDungeonArtifact,dungeonArtifactBonuses} from '../coop/dungeon-artifacts';
import {ROOM_BOON_CHOICES} from '../coop/room-boon-choices';
import { COOP_CLASS_ABILITY_MULTIPLIERS,ROOTBOUND_COOP_BALANCE_V2, type RootboundCoopBalance } from '../coop/config';

export interface PersistentRunState {
  actors:Record<string,PersistentActorState>;
  resources:number;
  boons:string[];
  artifacts:string[];
  curses:string[];
  personalEffects:Record<string,{boons:string[];artifacts:string[];purchases:string[]}>;
  /** Server-owned per-character healing uses; survives Q-Mode and Live room transitions. */
  healingPotionUsesByActor?:Record<string,number>;
  /** One authorized, consumed role-tonic ID per player for this run. */
  preparedAlchemyPotionIdsByActor?:Record<string,string>;
  visitedNodeIds:string[];
  /** Shared dungeon budget; receipts make retries idempotent. Persist atomically with character inventory. */
  dungeonPotionChargesUsed?:number;
  dungeonPotionReceipts?:Record<string,{requestId:string;actorId:string;itemId:string;healedHp:number;chargesUsed:number}>;
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
 return {success:true,state:{...input.state,actors,resources:input.state.resources-offer.cost,personalEffects:{...input.state.personalEffects,[input.actorId]:{...nextPersonal,boons,artifacts}}},summary:{kind:'merchant_purchase',actorId:input.actorId,offerId:offer.id,offerKind:offer.kind,cost:offer.cost,resourcesDelta:-offer.cost,healedHp:Math.max(0,(actors[input.actorId]?.hp??0)-actor.hp),revivedCount:actor.downed&&!actors[input.actorId]?.downed?1:0,boonCount:boons.length-current.boons.length,artifactCount:artifacts.length-current.artifacts.length}};
}

function healAtCamp(state:PersistentRunState,players:readonly CombatantDefinition[],campfireBalanceVersion?:2):PersistentRunState{
 const healFraction=campfireBalanceVersion===2 ? 0.20 : 0.30;
 const reviveFraction=campfireBalanceVersion===2 ? 0.15 : 0.25;
 const actors={...state.actors}; let revived=false;
 for(const player of players){const current=actors[player.id];if(!current)continue;if(current.downed&&!revived){actors[player.id]={...current,downed:false,hp:Math.max(1,player.stats.maxHp*reviveFraction)};revived=true;}else actors[player.id]={...current,hp:Math.min(player.stats.maxHp,current.hp+player.stats.maxHp*healFraction)};}
 return {...state,actors};
}

export function resolveCoopNode(input:{runId:string;serverSecret:string;node:CoopRouteNode;players:CombatantDefinition[];state:PersistentRunState;tier?:ExpeditionTier;rootboundBalance?:RootboundCoopBalance;enemyAttackMultiplier?:number;enemyHpMultiplier?:number;enemyDefenseMultiplier?:number;enemyDamageProfile?:'qmode-v1';enemyLevel?:number;enduranceLootVersion?:1;deferArtifactChoice?:boolean;campfireBalanceVersion?:2;bossTuning?:EncounterBossTuning;maxDurationMs?:number;safetyAiPlayerIds?:readonly string[]}):NodeResolutionResult{
 if(input.state.visitedNodeIds.includes(input.node.nodeId))throw new Error('node_already_resolved');
 if(input.node.kind==='entry')throw new Error('entry_is_not_resolvable');
 let state={...input.state,visitedNodeIds:[...input.state.visitedNodeIds,input.node.nodeId]};
 if(COMBAT_KINDS.has(input.node.kind)){
  const rootbound=input.node.contentId.startsWith('ROOT')||input.node.contentId==='BOSS_EXP_ROOT',balance=input.rootboundBalance??ROOTBOUND_COOP_BALANCE_V2;
  // Selected room boons modify the server combatants, not a cosmetic label.
  // Frozen loadouts remain unchanged; bonuses are reapplied per encounter.
  const strikes=Math.min(5,state.boons.filter(id=>id==='ROOM_BOON_STRIKE').length);
  const wards=Math.min(5,state.boons.filter(id=>id==='ROOM_BOON_WARD').length);
  const fury=Math.min(3,state.boons.filter(id=>id==='ROOM_BOON_FURY').length);
  const swift=Math.min(3,state.boons.filter(id=>id==='ROOM_BOON_SWIFT').length);
  const precision=Math.min(3,state.boons.filter(id=>id==='ROOM_BOON_PRECISION').length);
  const harmony=Math.min(3,state.boons.filter(id=>id==='ROOM_BOON_HARMONY').length);
  const bulwark=Math.min(3,state.boons.filter(id=>id==='ROOM_BOON_BULWARK').length);
  // Previously some non-combat rewards and curses were only bookkeeping.
  // Keep the new boosts small and capped to protect existing tier balance.
  const roomBlessings=Math.min(5,state.boons.filter(id=>id.includes(':')).length);
  const sharedArtifacts=Math.min(5,state.artifacts.filter(id=>!id.startsWith('RELIC_')).length);
  const curses=Math.min(5,state.curses.length);
  const players=input.players.map(player=>{
   const multipliers=COOP_CLASS_ABILITY_MULTIPLIERS[player.classId?.toUpperCase()??''];
   const personal=state.personalEffects[player.id];
   const personalBlessings=Math.min(3,personal?.boons.length??0);
   const personalArtifacts=Math.min(3,personal?.artifacts.length??0);
   const relic= input.enduranceLootVersion===1?dungeonArtifactBonuses(state.artifacts,player.role,input.node.kind):{attack:1,defense:1,healing:1,haste:0,critChance:0};
   const attackMultiplier=(1+strikes*.05+fury*.075+roomBlessings*.012+sharedArtifacts*.018+personalBlessings*.025+personalArtifacts*.024)*relic.attack;
   const defenseMultiplier=Math.max(.8,1+wards*.05+bulwark*(player.role==='tank' ? .06 : .025)+roomBlessings*.008+sharedArtifacts*.012+personalArtifacts*.018-curses*.035-fury*.025)*relic.defense;
   return {...player,
    stats:{...player.stats,attackPower:player.stats.attackPower*attackMultiplier,defense:player.stats.defense*defenseMultiplier,
     healingPower:player.stats.healingPower*(1+harmony*.10)*relic.healing,
     haste:player.stats.haste+swift*.04+relic.haste,
     critChance:Math.min(.75,player.stats.critChance+precision*.025+relic.critChance)},
    abilities:multipliers?player.abilities.map(ability=>{const multiplier=multipliers[ability.id];return multiplier?{...ability,effects:ability.effects.map(effect=>(effect.kind==='shield'||effect.kind==='heal')&&effect.coeff!==undefined?{...effect,coeff:effect.coeff*multiplier}:effect)}:ability;}):player.abilities,
   };
  });
  const depthMultiplier=input.node.depth>=balance.lateDepthStart?balance.lateDepthAttackMultiplier:1;
  const tierScale=input.tier?coopTierEnemyMultipliers(input.tier):{attack:1,hp:1,defense:1};
  const combat=resolveExpeditionCombat({runId:input.runId,nodeIndex:input.node.depth,encounterId:input.node.contentId,serverSeed:input.serverSecret,players,initialPlayerState:state.actors,safetyAiPlayerIds:input.safetyAiPlayerIds,enemyAttackMultiplier:(rootbound?balance.enemyAttackMultiplier*depthMultiplier:1)*tierScale.attack*(input.enemyAttackMultiplier??1),enemyHpMultiplier:tierScale.hp*(input.enemyHpMultiplier??1),enemyDefenseMultiplier:tierScale.defense*(input.enemyDefenseMultiplier??1),enemyDamageProfile:input.enemyDamageProfile,enemyLevel:input.enemyLevel,bossTuning:input.bossTuning,maxDurationMs:input.maxDurationMs,roomModifierId:input.node.kind==='elite'?input.node.modifierId:undefined,roomModifierElite:input.node.kind==='elite'});
  state={...state,actors:combat.endingPlayerState};
  return {success:combat.success,state,summary:{kind:'combat',...combat.resultJson,...(input.bossTuning?{bossTuningProfile:input.bossTuning.profileId}: {})}};
 }
 if(!IMPLEMENTED_NONCOMBAT.has(input.node.kind))throw new Error(`unsupported_node_kind:${input.node.kind}`);
 const roll=deterministicInt(input.serverSecret,1,999,'node-resolution-v1',input.runId,input.node.nodeId,input.node.contentId);
 let awardedArtifact:string|undefined;
 let awardedBoon:string|undefined;
 switch(input.node.kind){
  case 'camp': state=healAtCamp(state,input.players,input.campfireBalanceVersion); break;
  case 'shrine': case 'forge': case 'echo': {
   if(input.enemyDamageProfile!=='qmode-v1'){
    if(input.enduranceLootVersion===1){
     // Live parties do not use the Solo owner's boon picker: freeze one
     // deterministic, shared combat boon when the room is actually resolved.
     const pool=ROOM_BOON_CHOICES.filter(choice=>!['ROOM_BOON_SUPPLY','ROOM_BOON_RESERVE','ROOM_BOON_RECOVERY'].includes(choice.id));
     const available=pool.filter(choice=>state.boons.filter(id=>id===choice.id).length<3);
     const eligible=available.length?available:pool;
     const selected=eligible[deterministicInt(input.serverSecret,0,eligible.length-1,'dungeon-live-boon-v1',input.runId,input.node.nodeId)];
     awardedBoon=selected.id;
     state={...state,boons:[...state.boons,selected.id]};
    }else state={...state,boons:[...state.boons,`${input.node.contentId}:${roll}`]};
   }
   break;
  }
  case 'treasure': case 'secret': {
   // A new Solo run drafts three artifacts at the next route decision.
   // Live and all existing runs still receive a deterministic room drop.
   if(input.enduranceLootVersion===1&&input.deferArtifactChoice)break;
   awardedArtifact=input.enduranceLootVersion===1?rollDungeonArtifact(input.serverSecret,input.runId,input.node.nodeId,state.artifacts):`${input.node.contentId}:${roll}`;
   state={...state,artifacts:[...state.artifacts,awardedArtifact]};break;
  }
  case 'risk': {
   // The +2 supplies have a real drawback: nonlethal party injury plus
   // stacking defense pressure in later encounters.
   const actors={...state.actors};
   for(const player of input.players){const actor=actors[player.id];if(!actor||actor.downed)continue;
    actors[player.id]={...actor,hp:Math.max(1,actor.hp-player.stats.maxHp*.06)};
   }
   state={...state,actors,curses:[...state.curses,`${input.node.contentId}:${roll}`],resources:state.resources+2};
   break;
  }
  case 'event': state={...state,resources:state.resources+1}; break; // Events award supplies, not a second boon.
  case 'merchant': state={...state}; break;
 }
 const healedHp=input.players.reduce((total,player)=>total+Math.max(0,(state.actors[player.id]?.hp??0)-(input.state.actors[player.id]?.hp??0)),0);
 const revivedCount=input.players.filter(player=>input.state.actors[player.id]?.downed&&!state.actors[player.id]?.downed).length;
 const damagedHp=input.players.reduce((total,player)=>total+Math.max(0,(input.state.actors[player.id]?.hp??0)-(state.actors[player.id]?.hp??0)),0);
 return {success:true,state,summary:{kind:input.node.kind,roll,
  resourcesDelta:state.resources-input.state.resources,
  healedHp,revivedCount,damagedHp,
  boonCount:state.boons.length-input.state.boons.length,
  artifactCount:state.artifacts.length-input.state.artifacts.length,
  ...(awardedArtifact?{artifactId:awardedArtifact}:{}),
  ...(awardedBoon?{boonId:awardedBoon}:{}),
  curseCount:state.curses.length-input.state.curses.length,
  ...(input.node.kind==='merchant'?{offers:merchantOffers(input.node.contentId)}:{})}};
}
