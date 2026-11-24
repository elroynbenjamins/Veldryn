/**
 * Hidden review-only bridge from current co-op ready-check/loadout snapshots to
 * a future persisted Combat 2.0 party encounter. No DB table or live route.
 *
 * Existing live QModeRun/createLive does not retain partyId, readyCheckId,
 * rosterRevision or all frozen loadout hashes. Do not infer them later.
 */
import type {CombatInput} from '../types';
import type {FrozenLoadoutSnapshot} from '../../coop/loadout-snapshots';
import type {ReadyCheckRecord} from '../../coop/ready-checks';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {CLASS_NAMES_V2} from './skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from './party-synchronization';
import type {PartySyncScopeV2} from './party-sync-authority';

export const PARTY_V2_RUN_BINDING_POLICY='party-v2-run-binding-review-1' as const;
export interface PartyV2RunBindingMember{
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly classId:ClassIdV2;
 readonly loadoutId:string;
 readonly loadoutRevision:number;
 readonly loadoutSnapshotHash:string;
}
export interface PartyV2RunBindingReview{
 readonly source:'server-persisted-party-v2-review';
 readonly policy:typeof PARTY_V2_RUN_BINDING_POLICY;
 readonly runId:string;
 readonly nodeId:string;
 readonly encounterRevision:number;
 readonly stateRevision:number;
 readonly partyId:string;
 readonly readyCheckId:string;
 readonly rosterRevision:number;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly seed:string;
 readonly members:readonly PartyV2RunBindingMember[];
 readonly combatInputDigest:string;
}
export interface PartyV2RunBindingResult{
 readonly binding:PartyV2RunBindingReview;
 readonly releaseEnabled:false;
 readonly canAuthorizeCombat:false;
 readonly canGrantRewards:false;
 readonly canPersistState:false;
}
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const reverseClass=new Map<string,ClassIdV2>(
 (Object.entries(CLASS_NAMES_V2) as [ClassIdV2,string][]).flatMap(([id,name])=>[
   [id,id] as const,[name.toUpperCase().replace(/ /g,'_'),id] as const,
 ]));
const classId=(value:string):ClassIdV2|undefined=>
 reverseClass.get(value.trim().toUpperCase().replace(/ /g,'_'));
function fail(why:string):never{throw Error('party_v2_run_binding_'+why);}

export function reviewPartyV2RunBinding(input:{
 readonly runId:string;
 readonly nodeId:string;
 readonly encounterRevision:number;
 readonly stateRevision:number;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly seed:string;
 readonly readyCheck:ReadyCheckRecord;
 readonly frozenRoster:readonly FrozenLoadoutSnapshot[];
 /** Server-derived from the verified Equipment runtime, never client input. */
 readonly actorCharacterIds:Readonly<Record<string,string>>;
 readonly combatInput:CombatInput;
}):PartyV2RunBindingResult{
 const {readyCheck:check,frozenRoster,actorCharacterIds,combatInput}=input;
 if(!validId(input.runId)||!validId(input.nodeId)||
   !Number.isSafeInteger(input.encounterRevision)||input.encounterRevision<1||
   !Number.isSafeInteger(input.stateRevision)||input.stateRevision<1||
   !validId(input.contentVersion)||!validId(input.balanceVersion)||
   typeof input.seed!=='string'||!input.seed.length||input.seed.length>256||
   !check||!validId(check.id)||!validId(check.partyId)||
   !Number.isSafeInteger(check.rosterRevision)||check.rosterRevision<1||
   check.status!=='committed'||check.roster.length!==4||
   !check.roster.every(member=>check.accepts[member.accountId]===true)||
   frozenRoster.length!==4||!actorCharacterIds||combatInput.seed!==input.seed||
   combatInput.players.length!==4||!combatInput.enemies.length||
   combatInput.enemyDamageProfile!==undefined)
  fail('invalid_scope');
 const accounts=new Set<string>(),characters=new Set<string>(),actors=new Set<string>();
 const byCharacter=new Map(frozenRoster.map(row=>[row.characterId,row]));
 const readyByCharacter=new Map(check.roster.map(row=>[row.characterId,row]));
 if(byCharacter.size!==4||readyByCharacter.size!==4||
   Object.keys(actorCharacterIds).length!==4)fail('duplicate_or_incomplete_character_mapping');
 const members:PartyV2RunBindingMember[]=[];
 for(const actor of combatInput.players){
  const characterId=actorCharacterIds[actor.id];
  const ready=characterId?readyByCharacter.get(characterId):undefined;
  const frozen=characterId?byCharacter.get(characterId):undefined;
  if(!ready||!frozen||ready.accountId!==frozen.accountId||
    ready.loadoutId!==frozen.loadoutId||ready.loadoutRevision!==frozen.revision||
    ready.loadoutSnapshotHash!==frozen.snapshotHash||
    !validId(ready.accountId)||!validId(ready.characterId)||
    !validId(ready.loadoutId)||!/^[0-9a-f]{64}$/.test(ready.loadoutSnapshotHash)||
    !Number.isSafeInteger(ready.loadoutRevision)||ready.loadoutRevision<1||
    frozen.readiness?.role!==ready.role||
    accounts.has(ready.accountId)||characters.has(ready.characterId)||
    !validId(actor.id)||actors.has(actor.id)||actor.team!=='players'||
    actor.combatV2?.version!==2||ready.role!==actor.role)
   fail('roster_snapshot_mismatch');
  const canonical=classId(frozen.classId);
  if(!canonical||actor.classId!==CLASS_NAMES_V2[canonical]||
    actor.role!==CLASS_ROLES_V2[canonical])
   fail('class_actor_mismatch');
  accounts.add(ready.accountId);characters.add(ready.characterId);actors.add(actor.id);
  members.push({accountId:ready.accountId,characterId:ready.characterId,
    actorId:actor.id,classId:canonical,loadoutId:ready.loadoutId,
    loadoutRevision:ready.loadoutRevision,loadoutSnapshotHash:ready.loadoutSnapshotHash});
 }
 if(Object.entries(actorCharacterIds).some(([actorId,characterId])=>
   !actors.has(actorId)||!characters.has(characterId)))
  fail('foreign_actor_character_mapping');
 const roles=members.map(m=>CLASS_ROLES_V2[m.classId]);
 if(roles.filter(r=>r==='tank').length!==1||roles.filter(r=>r==='damage').length!==2||
   roles.filter(r=>r==='support').length!==1||
   new Set(members.filter(m=>CLASS_ROLES_V2[m.classId]==='damage').map(m=>m.classId)).size!==2)
  fail('invalid_dungeon_roles');
 if(combatInput.initialPlayerState){
  const stateIds=Object.keys(combatInput.initialPlayerState).sort();
  const expected=[...actors].sort();
  if(stateIds.length!==4||stateIds.some((id,i)=>id!==expected[i]))
   fail('persistent_state_roster_mismatch');
  for(const actor of combatInput.players){
   const state=combatInput.initialPlayerState[actor.id];
   if(!state||!Number.isFinite(state.hp)||state.hp<0||state.hp>actor.stats.maxHp||
      typeof state.downed!=='boolean'||state.downed!==(state.hp===0)||
      !Number.isFinite(state.basicAttackRemainingMs)||state.basicAttackRemainingMs<0||
      !state.cooldownRemainingMs||typeof state.cooldownRemainingMs!=='object'||
      Array.isArray(state.cooldownRemainingMs)||
      Object.entries(state.cooldownRemainingMs).some(([id,ms])=>
       !actor.abilities.some(ability=>ability.id===id)||!Number.isFinite(ms)||ms<0))
    fail('invalid_persistent_state');
  }
 }
 const binding:PartyV2RunBindingReview={
  source:'server-persisted-party-v2-review',policy:PARTY_V2_RUN_BINDING_POLICY,
  runId:input.runId,nodeId:input.nodeId,encounterRevision:input.encounterRevision,
  stateRevision:input.stateRevision,partyId:check.partyId,readyCheckId:check.id,
  rosterRevision:check.rosterRevision,contentVersion:input.contentVersion,
  balanceVersion:input.balanceVersion,seed:input.seed,
  members:Object.freeze(members.map(m=>Object.freeze({...m}))),
  combatInputDigest:enemyV2SnapshotDigest(combatInput),
 };
 return {binding:Object.freeze(binding),releaseEnabled:false,canAuthorizeCombat:false,
  canGrantRewards:false,canPersistState:false};
}


/** Derives a non-client Synchronization scope only from the reviewed committed
 * roster binding. The caller must still independently verify the persisted
 * binding/digest before issuePartySyncAuthorityV2 may issue an opaque token. */
export function partySyncScopeFromRunBindingV2(
 result:PartyV2RunBindingResult,
):PartySyncScopeV2{
 const b=result.binding;
 if(result.releaseEnabled||result.canAuthorizeCombat||result.canGrantRewards||
   result.canPersistState||b.policy!==PARTY_V2_RUN_BINDING_POLICY)
  fail('unsafe_binding_result');
 return {
  ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
  encounterId:b.runId,partyId:b.partyId,revision:b.encounterRevision,
  seed:b.seed,mode:'dungeon',
  persistedRun:{runId:b.runId,nodeId:b.nodeId,readyCheckId:b.readyCheckId,
   rosterRevision:b.rosterRevision,stateRevision:b.stateRevision,
   bindingDigest:enemyV2SnapshotDigest(b)},
  members:b.members.map(m=>({actorId:m.actorId,characterId:m.characterId,classId:m.classId})),
 };
}
