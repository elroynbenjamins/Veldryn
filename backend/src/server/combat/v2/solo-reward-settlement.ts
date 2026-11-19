/**
 * PRIVATE Classes/Skills 2.0 SOLO reward lifecycle (UNMOUNTED).
 *
 * This is the deterministic, replay-proof transaction boundary, not a
 * production reward writer. No approved 2.0 reward policy or durable account
 * grant/inbox adapter is supplied yet; default false forbids settlement.
 *
 * The store contract is deliberately all-or-nothing: ledger write, account
 * currency/XP, unique equipment custody and Inbox must share ONE DB transaction.
 * Never implement commitOnce with a sequence of separate RPC calls.
 */
import type {CombatResult} from '../types';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {
 StoredSoloEncounterV2,TrustedSoloIdentityV2,
 SoloEncounterPersistenceServiceV2,
} from './solo-encounter-persistence';

export const SOLO_REWARD_RECEIPT_SCHEMA_V2=1 as const;
export type SoloRewardResourceKindV2='gold'|'skill_xp'|'companion_essence'|'material';
export interface SoloRewardGrantV2 {
 readonly kind:SoloRewardResourceKindV2;
 readonly resourceId:string;
 readonly amount:number;
 readonly grantSourceId:string;
}
export interface ApprovedSoloRewardPolicyV2 {
 readonly policyId:string;
 readonly approved:true;
 readonly maxGrantAmount:number;
 readonly allowedResources:Readonly<Record<SoloRewardResourceKindV2,readonly string[]>>;
 /** Trusted server content only: never accept reward amounts from players. */
 quote(snapshot:StoredSoloEncounterV2,result:CombatResult):
  Promise<readonly {kind:SoloRewardResourceKindV2;resourceId:string;amount:number}[]>;
}
export interface SoloRewardReceiptV2 {
 readonly schemaVersion:typeof SOLO_REWARD_RECEIPT_SCHEMA_V2;
 readonly sourceKey:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly encounterId:string;
 readonly snapshotDigest:string;
 readonly outcomeDigest:string;
 readonly policyId:string;
 readonly grants:readonly SoloRewardGrantV2[];
 readonly grantDigest:string;
 readonly receiptDigest:string;
}
export interface SoloRewardSettlementStoreV2 {
 /** Server-role read, never a client-facing receipt API. */
 load(scope:TrustedSoloIdentityV2):Promise<SoloRewardReceiptV2|null>;
 /**
  * REQUIRED transaction semantics:
  *  1. Lock encounter row FIRST; verify exact saved snapshot digest/owner.
  *  2. Lock/insert immutable settlement key; replay returns original receipt.
  *  3. Enforce policy + grant digest and apply balance/XP/item/Inbox writes
  *     via transaction-local services ONLY, each with this same source key.
  *  4. Commit everything OR rollback everything. Do not reroll on retry.
  * No implementation exists until real source ownership + game writers approved.
  */
 commitOnce(scope:TrustedSoloIdentityV2,receipt:SoloRewardReceiptV2):
  Promise<SoloRewardReceiptV2>;
}
export interface SoloRewardSettlementDepsV2 {
 readonly solo:Pick<SoloEncounterPersistenceServiceV2,'load'|'replay'>;
 readonly store:SoloRewardSettlementStoreV2;
 readonly policy:ApprovedSoloRewardPolicyV2;
}
const id=(value:unknown)=>typeof value==='string'&&
 value.length>0&&value.length<=128&&/^[A-Za-z0-9:_-]+$/.test(value);
const digest=(value:unknown)=>enemyV2SnapshotDigest(value);
const denied=(reason:string):never=>{throw Error('combat_v2_reward_'+reason);};
const validDigest=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const sourceKey=(id:string)=>'combat-v2:solo:'+id;
const receiptBody=(value:SoloRewardReceiptV2)=>{
 const {receiptDigest,...body}=value;return body;
};
function validateReceipt(
 scope:TrustedSoloIdentityV2,snapshot:StoredSoloEncounterV2,
 outcomeDigest:string,receipt:SoloRewardReceiptV2,
):SoloRewardReceiptV2{
 if(!receipt||receipt.schemaVersion!==1||
  receipt.sourceKey!==sourceKey(scope.encounterId)||
  receipt.encounterId!==scope.encounterId||
  receipt.accountId!==scope.accountId||
  receipt.characterId!==scope.characterId||
  receipt.snapshotDigest!==snapshot.snapshotDigest||
  receipt.outcomeDigest!==outcomeDigest||
  !id(receipt.policyId)||!Array.isArray(receipt.grants)||
  receipt.grants.length<1||receipt.grants.length>32||
  !validDigest(receipt.grantDigest)||!validDigest(receipt.receiptDigest)||
  receipt.grantDigest!==digest(receipt.grants)||
  receipt.receiptDigest!==digest(receiptBody(receipt)))
  denied('invalid_persisted_receipt');
 for(const [i,g] of receipt.grants.entries()){
  if(!g||!['gold','skill_xp','companion_essence','material'].includes(g.kind)||
   !id(g.resourceId)||!Number.isSafeInteger(g.amount)||g.amount<1||
   g.grantSourceId!==receipt.sourceKey+':'+i)
   denied('invalid_grant_receipt');
 }
 return JSON.parse(JSON.stringify(receipt)) as SoloRewardReceiptV2;
}
function makeReceipt(
 scope:TrustedSoloIdentityV2,snapshot:StoredSoloEncounterV2,
 outcomeDigest:string,policy:ApprovedSoloRewardPolicyV2,
 raw:readonly {kind:SoloRewardResourceKindV2;resourceId:string;amount:number}[],
):SoloRewardReceiptV2 {
 if(!id(policy?.policyId)||policy.approved!==true||
  !Number.isSafeInteger(policy.maxGrantAmount)||policy.maxGrantAmount<1||
  !Array.isArray(raw)||raw.length<1||raw.length>32)
  denied('unapproved_policy');
 const grants:SoloRewardGrantV2[]=raw.map((grant,i)=>{
  if(!grant||!['gold','skill_xp','companion_essence','material'].includes(grant.kind)||
   !id(grant.resourceId)||!policy.allowedResources[grant.kind]?.includes(grant.resourceId)||
   !Number.isSafeInteger(grant.amount)||grant.amount<1||
   grant.amount>policy.maxGrantAmount)denied('invalid_policy_grant');
  return {kind:grant.kind,resourceId:grant.resourceId,amount:grant.amount,
   grantSourceId:sourceKey(scope.encounterId)+':'+i};
 });
 if(new Set(grants.map(grant=>grant.kind+':'+grant.resourceId)).size!==grants.length)
  denied('duplicate_grant');
 const body={
  schemaVersion:1 as const,sourceKey:sourceKey(scope.encounterId),
  accountId:scope.accountId,characterId:scope.characterId,
  encounterId:scope.encounterId,snapshotDigest:snapshot.snapshotDigest,
  outcomeDigest,policyId:policy.policyId,grants,
  grantDigest:digest(grants),
 };
 return {...body,receiptDigest:digest(body)};
}
function battleOutcomeDigest(snapshot:StoredSoloEncounterV2,result:CombatResult):string{
 if(!result||!['victory','wipe','timeout'].includes(result.reason)||
  typeof result.victory!=='boolean'||
  !Number.isSafeInteger(result.durationMs)||result.durationMs<0||
  !Array.isArray(result.events)||!result.events.length||
  !Array.isArray(result.players)||result.players.length!==1||
  !Array.isArray(result.enemies)||!result.enemies.length||
  result.players[0].definition.id!==snapshot.actorId||
  !result.enemies.every((enemy,i)=>enemy.definition.id===
   snapshot.combatInput.enemies[i]?.id)||
  result.events.at(-1)?.type!=='combat_end'||
  result.events.at(-1)?.detail!==result.reason)
  denied('invalid_replay_outcome');
 if(result.reason==='victory'!==result.victory)
  denied('outcome_inconsistent');
 if(result.victory && result.enemies.some(enemy=>enemy.alive||enemy.hp>0))
  denied('false_victory');
 return digest({
  snapshotDigest:snapshot.snapshotDigest,reason:result.reason,
  victory:result.victory,durationMs:result.durationMs,
  players:result.players.map(actor=>({id:actor.definition.id,hp:actor.hp,alive:actor.alive})),
  enemies:result.enemies.map(actor=>({id:actor.definition.id,hp:actor.hp,alive:actor.alive})),
  events:result.events,
 });
}
export class SoloRewardSettlementServiceV2 {
 constructor(private readonly deps:SoloRewardSettlementDepsV2){}
 async settle(scope:TrustedSoloIdentityV2,serverEnabled=false):Promise<SoloRewardReceiptV2>{
  if(!serverEnabled)denied('feature_disabled');
  if(!scope||!id(scope.accountId)||!id(scope.characterId)||!id(scope.encounterId))
   denied('invalid_scope');
  // ALWAYS use validated persistence, never caller-provided result or loot.
  const snapshot=await this.deps.solo.load(scope,true);
  const result=await this.deps.solo.replay(scope,true);
  const outcomeDigest=battleOutcomeDigest(snapshot,result);
  const previous=await this.deps.store.load(scope);
  if(previous)return validateReceipt(scope,snapshot,outcomeDigest,previous);
  if(!result.victory||result.reason!=='victory')denied('combat_not_victorious');
  // The policy must be explicitly approved by server code before any grant
  // computation; replay receipt bypasses a later rotated policy.
  if(!this.deps.policy||this.deps.policy.approved!==true)
   denied('unapproved_policy');
  const plan=makeReceipt(scope,snapshot,outcomeDigest,this.deps.policy,
   await this.deps.policy.quote(snapshot,result));
  const committed=await this.deps.store.commitOnce(scope,plan);
  // The store may return the first existing receipt after a concurrent caller.
  // Never require its policy to be the currently selected one, but always
  // require the exact immutable encounter and replay outcome.
  return validateReceipt(scope,snapshot,outcomeDigest,committed);
 }
}
