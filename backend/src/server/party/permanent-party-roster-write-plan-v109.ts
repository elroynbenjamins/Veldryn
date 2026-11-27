/** Hidden review: plan an in-place write against the inspected legacy schema.
 * public.party_members PK (party_id,character_id), active account unique.
 * No SQL writer, no leave/rejoin, no deletion of inactive history.
 */
import {enemyV2SnapshotDigest as digest} from '../combat/v2/enemy-engine-authority';
import {CLASS_ROLES_V2,type RoleV2} from '../combat/v2/build-contract';
import {planPartyRoleSwapResponseV107} from './party-role-swap-transition-review-v107';
export interface PartyMembershipRowV109{
 readonly partyId:string;readonly accountId:string;readonly characterId:string;
 readonly role:RoleV2;readonly joinedAt:string;readonly leftAt:string|null;
}
export interface PartyStorageSnapshotV109{
 readonly partyId:string;readonly status:string;readonly leaderAccountId:string;
 readonly leaderCharacterId:string;readonly minimumLevel:number;
 readonly updatedAt:string;readonly rows:readonly PartyMembershipRowV109[];
}
const id=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const timestamp=(x:unknown):x is string=>typeof x==='string'&&Number.isFinite(Date.parse(x));
function fail(s:string):never{throw Error('party_roster_write_v109_'+s);}
export function permanentPartyRosterDigestV109(snapshot:PartyStorageSnapshotV109){
 if(!snapshot||!id(snapshot.partyId)||!id(snapshot.leaderAccountId)||!id(snapshot.leaderCharacterId)||
  !['forming','active'].includes(snapshot.status)||!timestamp(snapshot.updatedAt)||
  !Number.isSafeInteger(snapshot.minimumLevel)||snapshot.minimumLevel<0||
  !Array.isArray(snapshot.rows))fail('invalid_snapshot');
 const rows:readonly PartyMembershipRowV109[]=snapshot.rows;
 const ids=new Set<string>();
 for(const row of rows){
  if(!row||row.partyId!==snapshot.partyId||!id(row.accountId)||!id(row.characterId)||
   !['tank','damage','support'].includes(row.role)||!timestamp(row.joinedAt)||
   (row.leftAt!==null&&(!timestamp(row.leftAt)||Date.parse(row.leftAt)<Date.parse(row.joinedAt)))||
   ids.has(row.characterId))fail('invalid_membership_row');
  ids.add(row.characterId);
 }
 const active=rows.filter(x=>x.leftAt===null);
 if(active.length<2||active.length>4||new Set(active.map(x=>x.accountId)).size!==active.length||
  !active.some(x=>x.accountId===snapshot.leaderAccountId&&x.characterId===snapshot.leaderCharacterId))
  fail('invalid_active_membership');
 return digest({partyId:snapshot.partyId,status:snapshot.status,
  leaderAccountId:snapshot.leaderAccountId,leaderCharacterId:snapshot.leaderCharacterId,
  minimumLevel:snapshot.minimumLevel,updatedAt:snapshot.updatedAt,
  members:[...active].sort((a,b)=>a.accountId.localeCompare(b.accountId))});
}
export function planPermanentPartyRosterWriteV109(input:{
 readonly snapshot:PartyStorageSnapshotV109;
 readonly originalRosterDigest:string;
 readonly transition:Parameters<typeof planPartyRoleSwapResponseV107>[0];
},qaEnabled=false){
 if(!qaEnabled||process.env.NODE_ENV==='production')fail('unreleased');
 const {snapshot,transition}=input;
 if(permanentPartyRosterDigestV109(snapshot)!==input.originalRosterDigest)fail('stale_roster');
 if(snapshot.partyId!==transition.scope.activePartyId||snapshot.minimumLevel!==transition.minimumLevel)
  fail('scope_mismatch');
 const active=snapshot.rows.filter(x=>x.leftAt===null);
 if(active.length!==transition.current.length||transition.current.some(member=>
  !active.some(row=>row.accountId===member.accountId&&row.characterId===member.characterId&&
   row.role===CLASS_ROLES_V2[member.classId])))fail('roster_mismatch');
 const result=planPartyRoleSwapResponseV107(transition,true);
 const next=result.roster;
 const updates=next?active.flatMap(row=>{
  const replacement=next.find(x=>x.accountId===row.accountId);
  if(!replacement)throw Error('party_roster_write_v109_missing_replacement');
  if(replacement.characterId===row.characterId)return [];
  // Legacy PK also covers inactive rows. Do not delete/overwrite history
  // or reactivate with fake leave/join announcements to evade collisions.
  if(snapshot.rows.some(x=>x.characterId===replacement.characterId))
   fail('historical_character_key_collision');
  return [Object.freeze({partyId:row.partyId,accountId:row.accountId,
   expectedCharacterId:row.characterId,expectedRole:row.role,expectedJoinedAt:row.joinedAt,
   nextCharacterId:replacement.characterId,nextRole:CLASS_ROLES_V2[replacement.classId]})];
 }):[];
 const leaderUpdate=updates.find(x=>x.accountId===snapshot.leaderAccountId);
 return Object.freeze({partyId:snapshot.partyId,proposal:result.proposal,
  updates:Object.freeze(updates),leaderAccountId:snapshot.leaderAccountId,
  nextLeaderCharacterId:leaderUpdate?.nextCharacterId??snapshot.leaderCharacterId,
  expectedUpdatedAt:snapshot.updatedAt,expectedRosterDigest:input.originalRosterDigest,
  proposedRevision:result.proposedRevision,requiresAtomicReadback:updates.length>0,
  releaseEnabled:false as const,canPersist:false as const});
}
