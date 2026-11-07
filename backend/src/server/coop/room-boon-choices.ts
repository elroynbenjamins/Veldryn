import {generateBoonOffer} from '../expeditions/boon-generation';
import type {QModeRun} from './qmode';

/** Only these disclosed, versioned choices can change a server-owned run.
 * Offers are deterministic for each run/room and cannot be supplied by clients. */
export const ROOM_BOON_CHOICES=[
 {id:'ROOM_BOON_STRIKE',name:'Battle Focus',description:'+5% party attack power for the remaining run.'},
 {id:'ROOM_BOON_WARD',name:'Stalwart Guard',description:'+5% party defense for the remaining run.'},
 {id:'ROOM_BOON_RECOVERY',name:'Second Wind',description:'Restore 20% max HP to each party member (revives downed allies).'},
 {id:'ROOM_BOON_SUPPLY',name:'Expedition Cache',description:'Gain 2 supplies to spend at Merchant rooms.'},
] as const;
export type RoomBoonId=(typeof ROOM_BOON_CHOICES)[number]['id'];
export type RoomBoonOffer=(typeof ROOM_BOON_CHOICES)[number];
const CHOICE_ROOM_KINDS=new Set(['shrine','forge','echo','event','treasure','secret','camp']);
export function roomBoonOffers(run:QModeRun,secret:string):RoomBoonOffer[]{
 // Live dungeons use group-voted routes; the owner-only Q-Mode choice does
 // not silently apply to teammates or bypass their voting authority.
 if(run.qmodePressureVersion!==1||run.phase!=='awaiting_choice')return [];
 const last=run.lastResolution;
 if(!last||last.nodeId!==run.currentNodeId||!last.result.success||!CHOICE_ROOM_KINDS.has(String(last.result.summary.kind)))return [];
 if(run.chosenRoomBoons?.[last.nodeId])return [];
 const current=run.graph.nodes.find(node=>node.nodeId===last.nodeId);
 if(!current)return [];
 const ids=generateBoonOffer({secret,runId:run.id,characterId:run.players[0].id,nodeIndex:current.depth,contentVersion:run.graph.contentVersion,ownedBoonIds:[],eligibleBoonIds:ROOM_BOON_CHOICES.map(choice=>choice.id),choiceCount:3});
 return ids.map(id=>ROOM_BOON_CHOICES.find(choice=>choice.id===id)!).filter(Boolean);
}
export function applyRoomBoon(run:QModeRun,boonId:RoomBoonId):void{
 if(run.chosenRoomBoons?.[run.currentNodeId])throw new Error('boon_already_chosen');
 const state=run.persistentState;
 if(boonId==='ROOM_BOON_RECOVERY'){
  const actors={...state.actors};
  for(const player of run.players){const actor=actors[player.id];if(!actor)continue;
   actors[player.id]={...actor,hp:Math.min(player.stats.maxHp,actor.hp+player.stats.maxHp*.20),downed:false};
  }
  run.persistentState={...state,actors};
 }else if(boonId==='ROOM_BOON_SUPPLY'){
  run.persistentState={...state,resources:state.resources+2};
 }else{
  run.persistentState={...state,boons:[...state.boons,boonId]};
 }
 run.chosenRoomBoons={...(run.chosenRoomBoons??{}),[run.currentNodeId]:boonId};
}
