/**
 * V72 HIDDEN: map canonical World Boss V59 milestones to the shared V69/V70
 * chest settlement source. No route, event selection, payout or player input
 * proof. The private port MUST run on V70's already account-locked SQL client.
 *
 * This adapter does not replace the V57 erasure fence, V63 gate attestation,
 * physical EQ2 item issuer, or a mandatory World Boss launch review.
 */
import {
 resolveWorldBossChestEvidenceV59,
 type WorldBossCanonicalChestReadV59,
} from '../combat/world-boss-chest-proof-v59';
import {
 previewVerifiedWorldBossChestsV58,worldBossChestLootTableV68,
 type WorldBossChestKindV58,
} from '../combat/world-boss-chests-v58';
import type {TrustedChestSourceV69} from './chest-reward-settlement-v69';
import type {ChestSqlV70} from './chest-postgres-store-v70';

export const WORLD_BOSS_SHARED_CHEST_SOURCE_V72_RELEASED=false;
export const WORLD_BOSS_SHARED_CHEST_PROOF_VERSION_V72=
 'world-boss-v59-replay-proven-v72' as const;
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const SOURCE=new RegExp('^world-boss:('+UUID+'):('+UUID+'):'
 +'(donations_goal|three_attempts|community_damage_goal)$');
const VALID_UUID=new RegExp('^'+UUID+'$');

export interface WorldBossChestSourcePortV72{
 /** Implement with trusted V18/V27/V28 rows on the pinned, account-locked
  * V70 connection. NEVER use network calls, mobile counters, or a fresh pool. */
 readCanonicalInLockedTransaction(
  tx:ChestSqlV70,eventId:string,accountId:string,
 ):Promise<WorldBossCanonicalChestReadV59>;
}
/** The selection carries only sourceKey; account is derived by host Auth.
 * All eligibility, boss, and guarantees are reconstructed privately. */
export async function readWorldBossTrustedChestSourceV72(input:{
 readonly authenticatedAccountId:string;
 readonly sourceKey:string;
},tx:ChestSqlV70,port:WorldBossChestSourcePortV72,qaEnabled=false):
 Promise<TrustedChestSourceV69>{
 if(!qaEnabled||WORLD_BOSS_SHARED_CHEST_SOURCE_V72_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('world_boss_v72_unreleased');
 const match=typeof input?.sourceKey==='string'?
  SOURCE.exec(input.sourceKey):null;
 if(!match||typeof input.authenticatedAccountId!=='string'||
  !VALID_UUID.test(input.authenticatedAccountId)||
  input.authenticatedAccountId!==match[2]||
  !tx||typeof tx.query!=='function'||
  !port||typeof port.readCanonicalInLockedTransaction!=='function')
  throw Error('world_boss_v72_invalid_account_source');
 const eventId=match[1]!;
 const accountId=match[2]!;
 const kind=match[3] as WorldBossChestKindV58;
 const canonical=await port.readCanonicalInLockedTransaction(
  tx,eventId,accountId,
 );
 if(!canonical||canonical.accountId!==accountId||
  canonical.eventId!==eventId)
  throw Error('world_boss_v72_cross_account_proof');
 const evidence=resolveWorldBossChestEvidenceV59(canonical);
 const earned=previewVerifiedWorldBossChestsV58(evidence).find(chest=>
  chest.kind===kind&&chest.chestId===input.sourceKey);
 if(!earned)throw Error('world_boss_v72_unearned_chest');
 return {
  sourceKey:earned.chestId,accountId,
  proofVersion:WORLD_BOSS_SHARED_CHEST_PROOF_VERSION_V72,
  recipientCharacterId:null,
  // This is a prospective policy. V69 freezes null on 99% gear misses.
  equipmentDeliveryMode:'account_unclaimed',
  earned:true,
  lootTable:worldBossChestLootTableV68({
   bossId:earned.bossId,kind,
  }),
 };
}
