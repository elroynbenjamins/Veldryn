/**
 * World Boss V20 — PRIVATE, DISABLED consented Echo candidate bridge.
 *
 * Reads private, server-owned consent rows and independently reloads each
 * owner's authoritative character GameState before deriving a V12 snapshot.
 * The client can never submit candidate rows, ownership, stats or consent.
 *
 * IMPORTANT: A real reservation transaction MUST revalidate and lock
 * selected consent grants against revocation. This read-only adapter alone
 * does NOT close a read/revocation/reserve race. No DB route is mounted.
 */
import type {WorldBossAuthoritativeSnapshotV9} from '../src/server/combat/world-boss-verified-roster-v9';
import type {WorldBossServerBracketPolicyV12} from './world-boss-loadout-v12';
import {resolveRealWorldBossSnapshotV12} from './world-boss-loadout-v12';
import type {WorldBossOwnerStateV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V20_CONSENTED_ECHOES_LIVE=false as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxAgeMs=7*86400000;
export interface WorldBossEchoConsentRowV20 {
 eventId:string;ownerAccountId:string;characterId:string;
 gameVersion:number;consentRevision:number;
 grantedAtUtcMs:number;expiresAtUtcMs:number;
 /** A server-owned aggregate; never a client-provided boost or reward. */
 usageCount:number;
 affinity?:'none'|'friend'|'guild';
 enabled:boolean;
}
export interface WorldBossConsentedEchoSourceV20 {
 listConsents(input:{eventId:string;requesterAccountId:string;nowUtcMs:number}):
  Promise<readonly WorldBossEchoConsentRowV20[]>;
 /** Must read an owner-filtered row, never from request GameState JSON. */
 loadOwnedState(accountId:string,characterId:string):Promise<WorldBossOwnerStateV19>;
 /** A second independent private consent read, including revocation. */
 verifyGrant(input:{
  eventId:string;ownerAccountId:string;characterId:string;
  consentRevision:number;nowUtcMs:number;
 }):Promise<boolean>;
}
export interface WorldBossEchoResolutionV20 {
 candidates:readonly WorldBossAuthoritativeSnapshotV9[];
 consentBindings:readonly {
  eventId:string;ownerAccountId:string;characterId:string;consentRevision:number;
 }[];
 reviewed:number;
 rejectedInactive:number;
 persisted:false;
}
export async function loadWorldBossConsentedEchoesV20(input:{
 source:WorldBossConsentedEchoSourceV20;
 eventId:string;requesterAccountId:string;nowUtcMs:number;
 minimumCharacterLevel:number;policy:WorldBossServerBracketPolicyV12;
}):Promise<WorldBossEchoResolutionV20>{
 const {source,eventId,requesterAccountId,nowUtcMs,minimumCharacterLevel,policy}=input;
 if(!source||!uuid.test(eventId)||!uuid.test(requesterAccountId)||
  !Number.isSafeInteger(nowUtcMs)||nowUtcMs<=0||
  typeof source.listConsents!=='function'||
  typeof source.loadOwnedState!=='function'||
  typeof source.verifyGrant!=='function')
  throw Error('world_boss_v20_invalid_private_source');
 const records=await source.listConsents({eventId,requesterAccountId,nowUtcMs});
 if(!Array.isArray(records)||records.length>128)
  throw Error('world_boss_v20_invalid_consent_population');
 const candidates:WorldBossAuthoritativeSnapshotV9[]=[];
 const consentBindings:WorldBossEchoResolutionV20['consentBindings'][number][]=[];
 const seen=new Set<string>();
 let rejectedInactive=0;
 for(const row of records){
  if(!row||!uuid.test(row.eventId)||row.eventId!==eventId||
   !uuid.test(row.ownerAccountId)||!uuid.test(row.characterId)||
   row.ownerAccountId===requesterAccountId||
   seen.has(row.ownerAccountId)||!Number.isSafeInteger(row.gameVersion)||
   row.gameVersion<1||!Number.isSafeInteger(row.consentRevision)||
   row.consentRevision<1||!Number.isSafeInteger(row.grantedAtUtcMs)||
   !Number.isSafeInteger(row.expiresAtUtcMs)||
   !Number.isSafeInteger(row.usageCount)||row.usageCount<0||
   ![undefined,'none','friend','guild'].includes(row.affinity)||
   typeof row.enabled!=='boolean')
   throw Error('world_boss_v20_invalid_or_duplicate_private_consent');
  seen.add(row.ownerAccountId);
  if(!row.enabled||row.grantedAtUtcMs>nowUtcMs||
   nowUtcMs-row.grantedAtUtcMs>maxAgeMs||
   row.expiresAtUtcMs<=nowUtcMs||
   row.expiresAtUtcMs-row.grantedAtUtcMs>maxAgeMs){
   rejectedInactive++;continue;
  }
  const verifiedGrant=await source.verifyGrant({
   eventId,ownerAccountId:row.ownerAccountId,characterId:row.characterId,
   consentRevision:row.consentRevision,nowUtcMs,
  });
  if(verifiedGrant!==true){
   rejectedInactive++;continue;
  }
  const owned=await source.loadOwnedState(row.ownerAccountId,row.characterId);
  if(!owned||owned.ownerAccountId!==row.ownerAccountId||
   owned.characterId!==row.characterId||
   !Number.isSafeInteger(owned.gameVersion)||owned.gameVersion!==row.gameVersion||
   !Number.isSafeInteger(owned.updatedAtUtcMs)||
   owned.updatedAtUtcMs>nowUtcMs||
   nowUtcMs-owned.updatedAtUtcMs>maxAgeMs||
   owned.serverState?.character?.id!==row.characterId)
   throw Error('world_boss_v20_owner_character_revision_mismatch');
  const result=await resolveRealWorldBossSnapshotV12({
   reader:{principalAccountId:row.ownerAccountId,
    loadCharacterState:async()=>({
     ownerAccountId:owned.ownerAccountId,gameVersion:owned.gameVersion,
     serverState:owned.serverState,
    })},
   characterId:row.characterId,expectedGameVersion:row.gameVersion,
   nowUtcMs,minimumCharacterLevel,policy,
  });
  candidates.push({...result.snapshot,
   capturedAtUtcMs:Math.min(nowUtcMs,owned.updatedAtUtcMs),
   usageCount:row.usageCount,
   ...(row.affinity?{affinity:row.affinity}:{})});
  consentBindings.push({
   eventId,ownerAccountId:row.ownerAccountId,
   characterId:row.characterId,consentRevision:row.consentRevision,
  });
 }
 return {candidates,consentBindings,reviewed:records.length,
  rejectedInactive,persisted:false};
}
