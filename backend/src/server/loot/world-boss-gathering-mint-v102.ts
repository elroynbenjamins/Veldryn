/** Review-only SQL port for a V96 gathering equipment hit.
 * Caller MUST own the existing V57 event/erasure fence and V70 account lock,
 * and use the same transaction as the chest receipt/resources/inbox.
 * No standalone chest opener, no active migration, no public API. */
import {createHmac} from 'node:crypto';
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import {rollWorldBossGatheringSlotV96} from '../combat/world-boss-chest-policy-v96';
import {WORLD_BOSS_GATHERING_SETS_V64,type GatheringGearSlotV64} from '../combat/world-boss-gathering-loot-v64';
import {assertWorldBossGatheringOriginV100,gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
import {reviewWorldBossGatheringSpeedV99} from '../combat/world-boss-gathering-speed-v99';
import type {GatheringCustodyCopyV101} from '../combat/world-boss-gathering-custody-v101';
export const WORLD_BOSS_GATHERING_MINT_V102_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Roll=ReturnType<typeof rollWorldBossGatheringSlotV96>;
interface MintRow extends Record<string,unknown>{
 id:string;source_key:string;account_id:string;event_id:string;boss_id:string;piece_id:string;slot:string;
 roll:unknown;roll_digest:string;chest_digest:string;entropy_version:string;
}
interface CustodyRow extends Record<string,unknown>{instance_id:string;account_id:string;location:GatheringCustodyCopyV101['location'];holder_character_id:string|null;revision:string|number;}
const columns='id::text AS id,source_key,account_id::text AS account_id,event_id::text AS event_id,boss_id,piece_id,slot,roll,roll_digest,chest_digest,entropy_version';
const decode=<T>(v:unknown):T=>(typeof v==='string'?JSON.parse(v):v) as T;
/** Separate domain, stable per-source entropy. Rejection sampling avoids
 * modulo bias. The committed chest slot is NEVER selected again. */
export function worldBossMintEntropyV102(secret:Uint8Array,sourceKey:string,version:string){
 if(!(secret instanceof Uint8Array)||secret.length<32||secret.length>512||!sourceKey||!/^[a-z0-9_-]{1,48}$/.test(version))
  throw Error('world_boss_mint_invalid_entropy');
 let draw=0;
 return (max:number)=>{
  if(!Number.isSafeInteger(max)||max<1||max>1_000_000)throw Error('world_boss_mint_invalid_range');
  const bound=Math.floor(0x100000000/max)*max;
  const ordinal=draw++;
  for(let retry=0;retry<64;retry++){
   const word=createHmac('sha256',Buffer.from(secret) as unknown as string)
    .update('veldryn:world-boss:gathering-mint:v102\0').update(version).update('\0').update(sourceKey)
    .update('\0').update(String(ordinal)).update('\0').update(String(retry)).digest().readUInt32BE(0);
   if(word<bound)return word%max;
  }
  throw Error('world_boss_mint_entropy_exhausted');
 };
}
export async function issueWorldBossGatheringMintV102(tx:ChestSqlV70,input:{
 accountId:string;sourceKey:string;entropyVersion:string;secret:Uint8Array;
 /** Verification must never recreate a missing historical item. */
 requireExisting?:boolean;
 /** Independent same-transaction proof of the V57 source/erasure lock and
  * current earned chest. It must not be a client or constant-true port. */
 verifyLockedSource:(tx:ChestSqlV70,accountId:string,sourceKey:string)=>Promise<boolean>;
},qaEnabled=false){
 if(!qaEnabled||WORLD_BOSS_GATHERING_MINT_V102_LIVE||process.env.NODE_ENV==='production')
  throw Error('world_boss_mint_unreleased');
 const {accountId,sourceKey}=input;
 if(!UUID.test(accountId)||!/^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$/.test(sourceKey)||
 sourceKey.split(':')[2]!==accountId||!UUID.test(sourceKey.split(':')[1])||typeof input.verifyLockedSource!=='function')
  throw Error('world_boss_mint_invalid_scope');
 if(await input.verifyLockedSource(tx,accountId,sourceKey)!==true)throw Error('world_boss_mint_source_fence_required');
 // Reacquire the existing account fence; do not make a new lock namespace.
 const fence=(await tx.query<{account_id:string}>('SELECT account_id::text AS account_id FROM private.chest_account_fence_v70 WHERE account_id=$1::uuid FOR UPDATE',[accountId])).rows;
 if(fence.length!==1||fence[0].account_id!==accountId)throw Error('world_boss_mint_account_fence_missing');
 const receiptRows=(await tx.query<{receipt:unknown}>('SELECT receipt FROM private.chest_reward_receipts_v70 WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[sourceKey,accountId])).rows;
 if(receiptRows.length!==1)throw Error('world_boss_mint_missing_chest');
 const receipt=decode<FrozenChestReceiptV69>(receiptRows[0].receipt);
 if(receipt.sourceKey!==sourceKey||receipt.accountId!==accountId||!receipt.committed||receipt.drops.length!==1||receipt.drops[0].type!=='equipment')
  throw Error('world_boss_mint_no_equipment_hit');
 const set=WORLD_BOSS_GATHERING_SETS_V64.find(x=>receipt.tableVersion==='world_boss_v98_unified_'+x.bossId);
 if(!set)throw Error('world_boss_mint_old_or_unknown_table');
 const chestDigest=gatheringSnapshotDigestV100(receipt),slot=receipt.drops[0].entryId as GatheringGearSlotV64;
 const validate=(row:MintRow)=>{
  const roll=decode<Roll>(row.roll);
  if(!UUID.test(row.id)||row.account_id!==accountId||row.source_key!==sourceKey||row.event_id!==sourceKey.split(':')[1]||
   row.boss_id!==set.bossId||row.piece_id!==roll.itemId||row.slot!==slot||row.chest_digest!==chestDigest||
   !/^[a-z0-9_-]{1,48}$/.test(row.entropy_version))throw Error('world_boss_mint_corrupt_row');
  assertWorldBossGatheringOriginV100(accountId,{roll,rollDigest:row.roll_digest,originalChest:receipt});
  reviewWorldBossGatheringSpeedV99({accountId,characterId:'mint-validation',skill:roll.skill,
   copies:[{accountId,characterId:'mint-validation',instanceId:row.id,roll}],
   baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,verifyEquippedCopy:()=>true});
  return roll;
 };
 let rows=(await tx.query<MintRow>('SELECT '+columns+' FROM private.world_boss_gathering_mints_v102 WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[sourceKey,accountId])).rows;
 if(rows.length>1)throw Error('world_boss_mint_duplicate');
 const replayed=rows.length===1;
 if(!replayed&&input.requireExisting)throw Error('world_boss_mint_missing_existing');
 if(!replayed){
  const roll=rollWorldBossGatheringSlotV96(set.bossId,slot,worldBossMintEntropyV102(input.secret,sourceKey,input.entropyVersion));
  const digest=gatheringSnapshotDigestV100(roll);
  assertWorldBossGatheringOriginV100(accountId,{roll,rollDigest:digest,originalChest:receipt});
  rows=(await tx.query<MintRow>('INSERT INTO private.world_boss_gathering_mints_v102(source_key,account_id,event_id,boss_id,piece_id,slot,roll,roll_digest,chest_digest,entropy_version) VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING '+columns,
   [sourceKey,accountId,sourceKey.split(':')[1],set.bossId,roll.itemId,slot,JSON.stringify(roll),digest,chestDigest,input.entropyVersion])).rows;
  if(rows.length!==1)throw Error('world_boss_mint_missing_insert');
  const inserted=rows[0];validate(inserted);
  if(inserted.roll_digest!==digest||inserted.entropy_version!==input.entropyVersion)throw Error('world_boss_mint_insert_mismatch');
  await tx.query('INSERT INTO private.world_boss_gathering_custody_v102(instance_id,account_id) VALUES($1::uuid,$2::uuid)',[inserted.id,accountId]);
 }
 const row=rows[0],roll=validate(row);
 const custody=(await tx.query<CustodyRow>('SELECT instance_id::text AS instance_id,account_id::text AS account_id,location,holder_character_id::text AS holder_character_id,revision FROM private.world_boss_gathering_custody_v102 WHERE instance_id=$1::uuid AND account_id=$2::uuid FOR UPDATE',[row.id,accountId])).rows;
 const c=custody[0];
 if(custody.length!==1||c.instance_id!==row.id||c.account_id!==accountId||!['unclaimed','bank','inventory','equipped'].includes(c.location)||
 !Number.isSafeInteger(Number(c.revision))||Number(c.revision)<1||
 (['unclaimed','bank'].includes(c.location)?c.holder_character_id!==null:!UUID.test(c.holder_character_id??''))||
 (!replayed&&(c.location!=='unclaimed'||Number(c.revision)!==1)))
  throw Error('world_boss_mint_missing_or_invalid_custody');
 const copy:GatheringCustodyCopyV101={accountId,instanceId:row.id,roll,rollDigest:row.roll_digest,originalChest:receipt,
  location:c.location,holderCharacterId:c.holder_character_id};
 return {copy,replayed,grantId:'wb102:'+row.id,itemInstanceId:row.id,
  persistedInCallerTransaction:true as const,committed:false as const,releaseReady:false as const};
}
