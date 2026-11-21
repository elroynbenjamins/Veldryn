/**
 * HIDDEN party Dungeon 2.0 reward receipt contract. This does not connect to
 * existing Live/Q-mode, choose/vote/grant APIs or production database.
 *
 * A privileged transaction must independently authenticate each member's
 * roster identity and grants against the server's ordered room ledger.
 */
import type {CombatInput} from '../types';
import {CLASS_ROLES_V2} from './build-contract';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {DUNGEON_REWARD_V2_POLICY,DUNGEON_REWARDS_V2,
 type DungeonRewardReceiptV2,type DungeonRoomKindV2} from './dungeon-rewards-v2';

const byId=new Map(DUNGEON_REWARDS_V2.map(row=>[row.id,row]));
const idOk=(value:unknown):value is string=>
 typeof value==='string'&&value.length>0&&value.length<=128&&/^[A-Za-z0-9:_-]+$/.test(value);
const fail=(reason:string):never=>{throw Error('dungeon_v2_party_'+reason);};
const typeForRoom=(room:DungeonRoomKindV2)=>
 room==='treasure'||room==='secret'?'artifact':'boon';
export interface DungeonPartyNodeV2 {
 readonly nodeId:string;readonly depth:number;readonly room:DungeonRoomKindV2;
}
export interface DungeonPartyRewardGrantV2 {
 readonly actorId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly receipts:readonly DungeonRewardReceiptV2[];
}
export interface VerifiedDungeonPartyRewardSnapshotV2{
 readonly source:'server-persisted-dungeon-party-v2';
 readonly policy:typeof DUNGEON_REWARD_V2_POLICY;
 readonly runId:string;
 readonly revision:number;
 readonly seed:string;
 readonly enduranceRouteVersion:2;
 readonly mode:'live';
 /** Source-owned roster order, not client party UI order. */
 readonly actorIds:readonly string[];
 /** Actual persistent ordered room layout, independent of chosen grants. */
 readonly nodes:readonly DungeonPartyNodeV2[];
 /** Per-actor grants must be DB-attested; no shared roster rewards by default. */
 readonly grants:readonly DungeonPartyRewardGrantV2[];
}
export function assertVerifiedDungeonPartyRewardSnapshotV2(
 input:CombatInput,snapshot:VerifiedDungeonPartyRewardSnapshotV2,
 verifyPersisted:(snapshot:VerifiedDungeonPartyRewardSnapshotV2,digest:string)=>boolean,
):void{
 if(!snapshot||snapshot.source!=='server-persisted-dungeon-party-v2'||
   snapshot.policy!==DUNGEON_REWARD_V2_POLICY||
   snapshot.enduranceRouteVersion!==2||snapshot.mode!=='live'||
   !idOk(snapshot.runId)||!Number.isSafeInteger(snapshot.revision)||
   snapshot.revision<1||snapshot.seed!==input.seed||
   !Array.isArray(snapshot.actorIds)||snapshot.actorIds.length!==4||
   !Array.isArray(snapshot.grants)||snapshot.grants.length!==4||
   !Array.isArray(snapshot.nodes)||snapshot.nodes.length>35||
   input.players.length!==4||input.enemies.length<1||
   input.enemies.some(e=>e.team!=='enemies')||
   input.enemyDamageProfile!==undefined||
   (input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0))
   fail('invalid_source_or_party_roster');
 const ids=input.players.map(p=>p.id);
 if(new Set(ids).size!==4||
   input.players.some((p,i)=>p.team!=='players'||p.combatV2?.version!==2||
    !idOk(p.id)||snapshot.actorIds[i]!==p.id))
   fail('roster_mismatch');
 // Endurance's dungeon composition is 1 tank, 2 distinct damage classes,
 // 1 support. Party Event composition is a DIFFERENT, flexible ruleset.
 if(input.players.filter(p=>p.role==='tank').length!==1||
    input.players.filter(p=>p.role==='damage').length!==2||
    input.players.filter(p=>p.role==='support').length!==1||
    input.players.some(p=>!p.classId||
      CLASS_ROLES_V2[p.classId as keyof typeof CLASS_ROLES_V2]!==p.role)||
    new Set(input.players.map(p=>p.classId)).size!==4)
   fail('dungeon_party_composition_mismatch');
 const nodes=new Map<string,DungeonPartyNodeV2>();
 let prevDepth=0;
 for(const node of snapshot.nodes){
  if(!node||!idOk(node.nodeId)||!Number.isSafeInteger(node.depth)||
   node.depth<=prevDepth||node.depth>35||
   !['shrine','forge','echo','treasure','secret'].includes(node.room)||
   nodes.has(node.nodeId))fail('forged_node_ledger');
  prevDepth=node.depth;nodes.set(node.nodeId,node);
 }
 const seenActors=new Set<string>(),seenAccounts=new Set<string>(),
  seenCharacters=new Set<string>();
 for(let i=0;i<snapshot.grants.length;i++){
  const grant=snapshot.grants[i];
  if(!grant||grant.actorId!==ids[i]||seenActors.has(grant.actorId)||
   !idOk(grant.accountId)||!idOk(grant.characterId)||
   !Array.isArray(grant.receipts)||grant.receipts.length>nodes.size)
   fail('forged_member_grants');
  if(seenAccounts.has(grant.accountId)||seenCharacters.has(grant.characterId))
   fail('duplicate_party_owner');
  seenActors.add(grant.actorId);seenAccounts.add(grant.accountId);
  seenCharacters.add(grant.characterId);
  const counted=new Map<string,number>(),seenNodes=new Set<string>();
  let previous=0;
  for(const receipt of grant.receipts){
   const node=nodes.get(receipt?.nodeId);
   const reward=byId.get(receipt?.id);
   if(!node||!reward||node.depth!==receipt.depth||
    node.room!==receipt.room||receipt.depth<=previous||
    seenNodes.has(receipt.nodeId)||reward.type!==typeForRoom(receipt.room)||
    reward.stage==='needs_engine_hook')fail('forged_or_unimplemented_reward');
   previous=receipt.depth;seenNodes.add(receipt.nodeId);
   const stacks=(counted.get(receipt.id)??0)+1;
   if(stacks>reward.maxStacks)fail('stack_cap');
   counted.set(receipt.id,stacks);
  }
 }
 if(typeof verifyPersisted!=='function')fail('persisted_verifier_required');
 let verified=false;
 try{verified=verifyPersisted(snapshot,enemyV2SnapshotDigest(input))===true;}
 catch{verified=false;}
 if(!verified)fail('persisted_run_ledger_not_verified');
}
