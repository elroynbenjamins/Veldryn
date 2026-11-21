/** Hidden, offline-only proposed three-choice room draft for Dungeon 2.0.
 * This DOES NOT write a room receipt: a future privileged server transaction
 * must validate, atomically persist and project an offered selection. */
import type {CombatInput} from '../types';
import {deterministicShuffle} from '../../expeditions/rng';
import {
 DUNGEON_REWARD_V2_POLICY,DUNGEON_REWARDS_V2,
 compileDraftDungeonRewardCombatV2,
 type DungeonRoomKindV2,type DungeonRewardV2,
 type VerifiedDungeonRewardSnapshotV2,type DungeonRewardReceiptV2,
} from './dungeon-rewards-v2';

export interface DungeonRewardNextRoomV2 {
 readonly nodeId:string;
 readonly depth:number;
 readonly room:DungeonRoomKindV2;
}
function fail(why:string):never{throw Error('dungeon_v2_offer_'+why);}
export function previewDungeonRewardOffersV2(
 input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2,
 next:DungeonRewardNextRoomV2,serverSecret:string,
 verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,digest:string)=>boolean,
):readonly DungeonRewardV2[]{
 // Validate all existing receipts, actor binding, pending proc gate and ledger.
 compileDraftDungeonRewardCombatV2(input,snapshot,verifyPersisted);
 const previous=snapshot.receipts[snapshot.receipts.length-1];
 if(!/^[A-Za-z0-9:_-]{1,128}$/.test(next?.nodeId??'')||
  !Number.isSafeInteger(next?.depth)||next.depth<1||next.depth>35||
  previous&&next.depth<=previous.depth||
  snapshot.receipts.some(row=>row.nodeId===next.nodeId)||
  !['shrine','forge','echo','treasure','secret'].includes(next?.room)||
  !serverSecret||serverSecret.length<16)fail('invalid_room_or_server_secret');
 const kind=next.room==='treasure'||next.room==='secret'?'artifact':'boon';
 const counts=new Map<string,number>();
 for(const row of snapshot.receipts)counts.set(row.id,(counts.get(row.id)??0)+1);
 const role=input.players[0].role;
 const ready=DUNGEON_REWARDS_V2.filter(row=>row.type===kind&&
  row.stage!=='needs_engine_hook'&&(counts.get(row.id)??0)<row.maxStacks&&
  (!row.stat?.role||row.stat.role===role||
   row.stat.role==='tank_or_support'&&(role==='tank'||role==='support')));
 if(ready.length<3)fail('not_enough_available_options');
 const shuffled=deterministicShuffle(
  serverSecret,ready,snapshot.runId,snapshot.characterId,
  next.nodeId,next.depth,DUNGEON_REWARD_V2_POLICY,'dungeon-reward-choice');
 // Refine: where the pool permits it, show three different playstyles instead
 // of accidentally drafting three near-identical Attack/Crit modifiers.
 const family=(row:DungeonRewardV2):string=>{
  if(row.id==='ROOM_BOON_BULWARK')return 'defense';
  if(row.stage==='room_only')return 'utility';
  if(row.stat?.heal)return 'healing';
  if(row.stat?.attack||row.stat?.crit)return 'offense';
  if(row.stat?.defense)return 'defense';
  if(row.stat?.haste)return 'tempo';
  return 'other';
 };
 const chosen:DungeonRewardV2[]=[],used=new Set<string>();
 for(const row of shuffled){
  const group=family(row);
  if(!used.has(group)){chosen.push(row);used.add(group);}
  if(chosen.length===3)break;
 }
 if(chosen.length<3)for(const row of shuffled){
  if(!chosen.includes(row))chosen.push(row);
  if(chosen.length===3)break;
 }
 return chosen;
}
/** Returns a CANDIDATE for a privileged transaction; no authoritative
 * state is mutated and no client-submitted ID is accepted unless offered. */
export function candidateDungeonRewardReceiptV2(
 input:CombatInput,snapshot:VerifiedDungeonRewardSnapshotV2,
 next:DungeonRewardNextRoomV2,selectedId:string,serverSecret:string,
 verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,digest:string)=>boolean,
):DungeonRewardReceiptV2{
 const offered=previewDungeonRewardOffersV2(input,snapshot,next,serverSecret,verifyPersisted);
 if(!offered.some(row=>row.id===selectedId))fail('selection_was_not_offered');
 return {id:selectedId,nodeId:next.nodeId,depth:next.depth,room:next.room};
}
