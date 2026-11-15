/**
 * Hidden World Boss V28: server-only reward receipt + role evidence boundary.
 * Mobile input: event/request selection only; account comes from Auth.
 * Actual DB/worker adapters MUST be private. No production wallet binding.
 * Personal Impact rewards remain LOCKED pending role-normalization approval.
 */
import {createHash} from 'node:crypto';
import type {WorldBossAccountEncounterOutputV25} from
 '../src/server/combat/world-boss-account-encounter-v25';

export const WORLD_BOSS_V28_REWARDS_LIVE=false as const;
export const WORLD_BOSS_V28_IMPACT_PAYOUTS_APPROVED=false as const;
export const WORLD_BOSS_V28_EVENT_CAP=100 as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{8,128}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const uuid=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
const safeNumber=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export interface WorldBossReplayProofSourceV28 {
 eventId:string;accountId:string;requestId:string;status:'committed';
 engineVersion:string;replayDigest:string;replayKey:string;
}
export interface WorldBossRewardProofReceiptV28{
 eventId:string;accountId:string;requestId:string;
 repeated:boolean;survived:boolean;
 status:'pending_balance_approval';
}
export interface WorldBossSigilClaimReceiptV28{
 eventId:string;accountId:string;requestId:string;
 repeated:boolean;creditedSigils:number;balanceAfter:number;
 walletRevision:number;
}
export interface WorldBossRewardRoleEvidenceV28{
 attempt:number;survived:boolean;worldHpContribution:number;
 localGuardDamage:number;
 characterLedger:WorldBossAccountEncounterOutputV25['characterLedger'];
 impactStatus:'pending_balance_approval';
}
export interface WorldBossRewardViewV28{
 accountId:string;eventId:string;balance:number;walletRevision:number;
 claimedThisEvent:number;eventCap:100;
 impactStatus:'pending_balance_approval';
 impactMilestonesCredited:false;
 roleContributions:WorldBossRewardRoleEvidenceV28[];
}
export interface WorldBossRewardRepositoryV28{
 committedReplay(eventId:string,accountId:string,requestId:string):
  Promise<WorldBossReplayProofSourceV28>;
 recordReplay(eventId:string,accountId:string,requestId:string,content:string):
  Promise<WorldBossRewardProofReceiptV28>;
 claim(eventId:string,accountId:string,requestId:string):
  Promise<WorldBossSigilClaimReceiptV28>;
 view(accountId:string,eventId:string):Promise<WorldBossRewardViewV28>;
}
export interface WorldBossRewardDepsV28{
 authenticate(token:string):Promise<string|null>;
 db:WorldBossRewardRepositoryV28;
 replayStore:{
  readImmutable(key:string):Promise<string>;
 };
}
function validDeps(s:WorldBossRewardDepsV28){
 if(!s||typeof s.authenticate!=='function'||!s.db||
  typeof s.db.committedReplay!=='function'||
  typeof s.db.recordReplay!=='function'||
  typeof s.db.claim!=='function'||typeof s.db.view!=='function'||
  !s.replayStore||typeof s.replayStore.readImmutable!=='function')
  throw Error('world_boss_v28_private_runtime_required');
}
async function auth(token:string,s:WorldBossRewardDepsV28){
 if(typeof token!=='string'||token.length<8||token.length>8192)
  throw Error('world_boss_v28_auth_required');
 const accountId=await s.authenticate(token);
 if(!uuid(accountId))throw Error('world_boss_v28_auth_required');
 return accountId;
}
function validateId(eventId:string,requestId:string){
 if(!uuid(eventId)||!KEY.test(requestId))
  throw Error('world_boss_v28_invalid_selection');
}
function rewardReceipt(
 r:WorldBossSigilClaimReceiptV28,
 eventId:string,accountId:string,requestId:string,
):WorldBossSigilClaimReceiptV28{
 if(!r||r.eventId!==eventId||r.accountId!==accountId||
  r.requestId!==requestId||typeof r.repeated!=='boolean'||
  !Number.isSafeInteger(r.creditedSigils)||
  r.creditedSigils<0||r.creditedSigils>WORLD_BOSS_V28_EVENT_CAP||
  !Number.isSafeInteger(r.balanceAfter)||r.balanceAfter<0||
  !Number.isSafeInteger(r.walletRevision)||r.walletRevision<0)
  throw Error('world_boss_v28_untrusted_claim_receipt');
 return r;
}
function viewValid(r:WorldBossRewardViewV28,accountId:string,eventId:string){
 if(!r||r.accountId!==accountId||r.eventId!==eventId||
  !Number.isSafeInteger(r.balance)||r.balance<0||
  !Number.isSafeInteger(r.walletRevision)||r.walletRevision<0||
  !Number.isSafeInteger(r.claimedThisEvent)||r.claimedThisEvent<0||
  r.claimedThisEvent>WORLD_BOSS_V28_EVENT_CAP||
  r.eventCap!==WORLD_BOSS_V28_EVENT_CAP||
  r.impactStatus!=='pending_balance_approval'||
  r.impactMilestonesCredited!==false||
  !Array.isArray(r.roleContributions)||r.roleContributions.length>3||
  r.roleContributions.some(x=>
   !Number.isSafeInteger(x.attempt)||x.attempt<1||x.attempt>3||
   typeof x.survived!=='boolean'||!safeNumber(x.worldHpContribution)||
   !safeNumber(x.localGuardDamage)||
   !Array.isArray(x.characterLedger)||x.characterLedger.length<1||
   x.characterLedger.length>5||
   x.impactStatus!=='pending_balance_approval'))
  throw Error('world_boss_v28_untrusted_reward_view');
 return r;
}
/** This is a private job, NOT a user-accessible command. It proves a
 * V18-committed attempt against the exact content-addressed V26 replay.
 * DB separately rehashes the same bytes and verifies committed fields.
 */
export async function recordTrustedWorldBossReplayV28(job:{
 eventId:string;accountId:string;requestId:string;
},s:WorldBossRewardDepsV28):Promise<WorldBossRewardProofReceiptV28>{
 validDeps(s);validateId(job.eventId,job.requestId);
 if(!uuid(job.accountId))throw Error('world_boss_v28_invalid_worker_account');
 const source=await s.db.committedReplay(
  job.eventId,job.accountId,job.requestId);
 if(!source||source.eventId!==job.eventId||
  source.accountId!==job.accountId||source.requestId!==job.requestId||
  source.status!=='committed'||
  source.engineVersion!=='world-boss-account-rounds-v25-prototype'||
  !DIGEST.test(source.replayDigest)||!/^WB26_REPLAY_[a-f0-9]{40}$/.test(source.replayKey)||
  source.replayKey!=='WB26_REPLAY_'+source.replayDigest.slice(0,40))
  throw Error('world_boss_v28_unverified_committed_source');
 const content=await s.replayStore.readImmutable(source.replayKey);
 if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>1048576||
  Buffer.byteLength(content,'utf8')<128||
  hash(content)!==source.replayDigest)
  throw Error('world_boss_v28_replay_content_mismatch');
 let parsed:unknown;
 try{parsed=JSON.parse(content);}catch{
  throw Error('world_boss_v28_corrupt_replay_json');
 }
 const root=parsed as {version?:unknown;eventId?:unknown;accountId?:unknown;
  requestId?:unknown;replay?:Partial<WorldBossAccountEncounterOutputV25>};
 const replay=root?.replay;
 if(root?.version!==source.engineVersion||root.eventId!==job.eventId||
  root.accountId!==job.accountId||root.requestId!==job.requestId||
  replay?.schema!=='world-boss-v25-authored-account-rounds'||
  replay.accountId!==job.accountId||replay.eventId!==job.eventId||
  replay.requestId!==job.requestId||
  !Number.isInteger(replay.roundsCompleted)||replay.roundsCompleted!<1||
  replay.roundsCompleted!>14||
  typeof replay.survived!=='boolean'||
  !safeNumber(replay.proposedWorldHpDamage)||
  !safeNumber(replay.localGuardDamage)||
  !Array.isArray(replay.characterLedger)||
  !replay.characterLedger.length||replay.characterLedger.length>5||
  !Array.isArray(replay.events)||!replay.events.length)
  throw Error('world_boss_v28_invalid_authored_replay');
 const receipt=await s.db.recordReplay(
  job.eventId,job.accountId,job.requestId,content);
 if(!receipt||receipt.eventId!==job.eventId||
  receipt.accountId!==job.accountId||receipt.requestId!==job.requestId||
  receipt.status!=='pending_balance_approval'||
  typeof receipt.repeated!=='boolean'||
  typeof receipt.survived!=='boolean'||
  receipt.survived!==replay.survived)
  throw Error('world_boss_v28_untrusted_proof_receipt');
 return receipt;
}
/** User may request claim, but cannot choose source, amount, outcome,
 * role impact, Sigils or character. DB selects facts transactionally.
 */
export async function claimAuthenticatedWorldBossSigilsV28(input:{
 token:string;selection:{eventId:string;requestId:string};
},s:WorldBossRewardDepsV28):Promise<WorldBossSigilClaimReceiptV28>{
 validDeps(s);
 if(!input?.selection||Object.keys(input.selection).some(k=>
  !['eventId','requestId'].includes(k)))
  throw Error('world_boss_v28_invalid_claim_selection');
 const {eventId,requestId}=input.selection;
 validateId(eventId,requestId);
 const accountId=await auth(input.token,s);
 const result=await s.db.claim(eventId,accountId,requestId);
 return rewardReceipt(result,eventId,accountId,requestId);
}
export async function readAuthenticatedWorldBossRewardsV28(input:{
 token:string;eventId:string;
},s:WorldBossRewardDepsV28):Promise<WorldBossRewardViewV28>{
 validDeps(s);
 if(!uuid(input?.eventId))throw Error('world_boss_v28_invalid_event');
 const accountId=await auth(input.token,s);
 return viewValid(await s.db.view(accountId,input.eventId),
  accountId,input.eventId);
}
