import {generateBoonOffer} from '../expeditions/boon-generation';
import type {QModeRun} from './qmode';

/** Only these disclosed, versioned choices can change a server-owned run.
 * Offers are deterministic for each run/room and cannot be supplied by clients. */
export const ROOM_BOON_CHOICES=[
 {id:'ROOM_BOON_STRIKE',name:'Battle Focus',description:'+5% party attack power for the remaining run.'},
 {id:'ROOM_BOON_WARD',name:'Stalwart Guard',description:'+5% party defense for the remaining run.'},
 {id:'ROOM_BOON_RECOVERY',name:'Second Wind',description:'Restore 20% max HP to each party member (revives downed allies).'},
 {id:'ROOM_BOON_FURY',name:'Berserker Oath',description:'+7.5% party attack, but -2.5% defense for the remaining run.'},
 {id:'ROOM_BOON_SWIFT',name:'Quickstep',description:'+4% party haste for the remaining run.'},
 {id:'ROOM_BOON_PRECISION',name:'Eagle Sight',description:'+2.5 percentage points critical chance for the remaining run.'},
 {id:'ROOM_BOON_HARMONY',name:'Healing Chorus',description:'+10% party healing power for the remaining run.'},
 {id:'ROOM_BOON_BULWARK',name:'Guardians Pact',description:'+6% tank defense, +2.5% other party members defense.'},
 {id:'ROOM_BOON_RESERVE',name:'Supplies Cache',description:'Immediately gain 2 run supplies.'},
 {id:'ROOM_BOON_SUPPLY',name:'Expedition Cache',description:'Legacy supply boon; no longer offered in new dungeon runs.'},
] as const;
export type RoomBoonId=(typeof ROOM_BOON_CHOICES)[number]['id'];
export type RoomBoonOffer=(typeof ROOM_BOON_CHOICES)[number];
// Only purpose-built boon rooms prompt a second-stage choice. Treasure, camp,
// secret and event rooms retain their own rewards without bonus buffs.
const CHOICE_ROOM_KINDS=new Set(['shrine','forge','echo']);
export function roomBoonOffers(run:QModeRun,secret:string):RoomBoonOffer[]{
 // Live dungeons use group-voted routes; the owner-only Q-Mode choice does
 // not silently apply to teammates or bypass their voting authority.
 if(run.qmodePressureVersion!==1||run.phase!=='awaiting_choice')return [];
 const last=run.lastResolution;
 if(!last||last.nodeId!==run.currentNodeId||!last.result.success||!CHOICE_ROOM_KINDS.has(String(last.result.summary.kind)))return [];
 if(run.chosenRoomBoons?.[last.nodeId])return [];
 const current=run.graph.nodes.find(node=>node.nodeId===last.nodeId);
 if(!current||current.kind!==last.result.summary.kind)return [];
 const active=ROOM_BOON_CHOICES.filter(choice=>choice.id!=='ROOM_BOON_SUPPLY'&&(run.enduranceRouteVersion===1||['ROOM_BOON_STRIKE','ROOM_BOON_WARD','ROOM_BOON_RECOVERY'].includes(choice.id)));
 const alreadyChosen=Object.values(run.chosenRoomBoons??{});
 const fresh=active.filter(choice=>!alreadyChosen.includes(choice.id));
 const pool=fresh.length>=3?fresh:active;
 const ids=generateBoonOffer({secret,runId:run.id,characterId:run.players[0].id,nodeIndex:current.depth,contentVersion:run.graph.contentVersion,ownedBoonIds:[],eligibleBoonIds:pool.map(choice=>choice.id),choiceCount:3});
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
 }else if(boonId==='ROOM_BOON_SUPPLY'||boonId==='ROOM_BOON_RESERVE'){
  run.persistentState={...state,resources:state.resources+2};
 }else{
  run.persistentState={...state,boons:[...state.boons,boonId]};
 }
 run.chosenRoomBoons={...(run.chosenRoomBoons??{}),[run.currentNodeId]:boonId};
}
