/** Hidden encounter-scoped synchronization authority. Never mount on public routes.
 * The verifier must compare an independently loaded committed encounter roster,
 * revision and full compiled input digest. QA callbacks are not authentication.
 */
import type {CombatInput} from '../types';
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';
import {CLASS_NAMES_V2} from './skill-catalog';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {PARTY_SYNCHRONIZATION_RULESET_V2,planPartySynchronizationV2,type SyncModeV2,type SyncStatV2} from './party-synchronization';
const brand:unique symbol=Symbol('party-sync-v2');
export type PartySyncAuthorityV2=Readonly<{[brand]:true}>;
export type PartySyncModeV2=Exclude<SyncModeV2,'solo'|'individual_world_boss'>;
export interface PartySyncPersistedRunScopeV2{
 readonly runId:string;
 readonly nodeId:string;
 readonly readyCheckId:string;
 readonly rosterRevision:number;
 readonly stateRevision:number;
 /** Canonical digest of the full frozen run binding, including loadout hashes. */
 readonly bindingDigest:string;
}
export interface PartySyncScopeV2{
 readonly ruleset:typeof PARTY_SYNCHRONIZATION_RULESET_V2;
 readonly encounterId:string;
 readonly partyId:string;
 readonly revision:number;
 readonly seed:string;
 readonly mode:PartySyncModeV2;
 readonly persistedRun?:PartySyncPersistedRunScopeV2;
 readonly members:readonly {actorId:string;characterId:string;classId:ClassIdV2}[];
}
type Totals=Readonly<Partial<Record<SyncStatV2,number>>>;
interface Issued{readonly digest:string;readonly totals:Totals;readonly actorIds:readonly string[];}
const issued=new WeakMap<object,Issued>();
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
function reject(s:string):never{throw Error('party_sync_authority_'+s);}
const modes:readonly PartySyncModeV2[]=['dungeon','party_contract','party_event','guild_pve'];
export function issuePartySyncAuthorityV2(scope:PartySyncScopeV2,input:CombatInput,
 verify:(scope:PartySyncScopeV2,digest:string)=>boolean):PartySyncAuthorityV2{
 if(!scope||scope.ruleset!==PARTY_SYNCHRONIZATION_RULESET_V2||
  !validId(scope.encounterId)||!validId(scope.partyId)||!Number.isSafeInteger(scope.revision)||scope.revision<1||
  !modes.includes(scope.mode)||typeof scope.seed!=='string'||!scope.seed.length||scope.seed.length>256||
  !Array.isArray(scope.members)||scope.members.length<2||scope.members.length>4||
  typeof verify!=='function')reject('invalid_scope');
 const members:PartySyncScopeV2['members']=scope.members;
 const persisted=scope.persistedRun;
 if(persisted!==undefined&&(
   scope.mode!=='dungeon'||!validId(persisted.runId)||!validId(persisted.nodeId)||
   !validId(persisted.readyCheckId)||!Number.isSafeInteger(persisted.rosterRevision)||
   persisted.rosterRevision<1||!Number.isSafeInteger(persisted.stateRevision)||
   persisted.stateRevision<1||!/^[0-9a-f]{64}$/.test(persisted.bindingDigest)))reject('invalid_persisted_scope');
 const carriedIds=Object.keys(input?.initialPlayerState??{}).sort();
 if(!input||input.seed!==scope.seed||input.players.length!==scope.members.length||
  input.enemyDamageProfile!==undefined||(carriedIds.length>0&&!persisted)||
  !input.enemies.length||input.enemies.some(e=>e.team!=='enemies')||
  new Set([...input.players,...input.enemies].map(p=>p.id)).size!==input.players.length+input.enemies.length)
  reject('input_mismatch');
 const actors=new Set<string>(),characters=new Set<string>();
 for(const [i,m] of members.entries()){
  const a=input.players[i];
  if(!m||!validId(m.actorId)||!validId(m.characterId)||actors.has(m.actorId)||characters.has(m.characterId)||
   !Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,m.classId)||
   a.id!==m.actorId||a.team!=='players'||a.combatV2?.version!==2||
   a.role!==CLASS_ROLES_V2[m.classId]||a.classId!==CLASS_NAMES_V2[m.classId])
   reject('member_mismatch');
  actors.add(m.actorId);characters.add(m.characterId);
 }
 if(carriedIds.length){
  const expected=[...actors].sort();
  if(carriedIds.length!==expected.length||carriedIds.some((id,i)=>id!==expected[i]))
   reject('persistent_state_roster_mismatch');
  for(const id of carriedIds){
   const state=input.initialPlayerState![id];
   const actor=input.players.find(a=>a.id===id)!;
   if(!state||!Number.isFinite(state.hp)||state.hp<0||state.hp>actor.stats.maxHp||
     typeof state.downed!=='boolean'||state.downed!==(state.hp===0)||
     !Number.isFinite(state.basicAttackRemainingMs)||state.basicAttackRemainingMs<0||
     !state.cooldownRemainingMs||typeof state.cooldownRemainingMs!=='object'||
     Array.isArray(state.cooldownRemainingMs)||
     Object.entries(state.cooldownRemainingMs).some(([key,v])=>
      !actor.abilities.some(ability=>ability.id===key)||!Number.isFinite(v)||v<0))
    reject('invalid_persistent_state');
  }
 }
 if(scope.mode==='dungeon'){
  const roles=input.players.map(a=>a.role);
  if(roles.length!==4||roles.filter(r=>r==='tank').length!==1||roles.filter(r=>r==='damage').length!==2||
   roles.filter(r=>r==='support').length!==1||
   new Set(members.filter(m=>CLASS_ROLES_V2[m.classId]==='damage').map(m=>m.classId)).size!==2)
   reject('dungeon_roles');
 }
 const plan=planPartySynchronizationV2(scope.mode,members);
 const digest=enemyV2SnapshotDigest(input);
 const frozen=Object.freeze({...scope,
  ...(persisted?{persistedRun:Object.freeze({...persisted})}:{}),
  members:Object.freeze(members.map(m=>Object.freeze({...m})))});

 let accepted=false;
 try{accepted=verify(frozen,digest)===true;}catch{accepted=false;}
 if(!accepted||enemyV2SnapshotDigest(input)!==digest)reject('unverified_scope');
 const token=Object.freeze({[brand]:true}) as PartySyncAuthorityV2;
 issued.set(token,{digest,totals:Object.freeze({...plan.totalsBps}),actorIds:Object.freeze([...actors])});
 return token;
}
export function authorizePartySyncV2(input:CombatInput,token?:PartySyncAuthorityV2):ReadonlyMap<string,Totals>{
 if(token===undefined)return new Map();
 const saved=issued.get(token);
 if(!saved)return reject('not_issued');
 if(enemyV2SnapshotDigest(input)!==saved.digest)return reject('input_mismatch');
 return new Map(saved.actorIds.map(id=>[id,saved.totals]));
}
