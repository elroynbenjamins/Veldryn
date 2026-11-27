/** Private hidden transactional equipment movement. Caller-owned transaction,
 * existing V57 -> V70 -> party-account locks, CAS state and exact custody.
 * Not a live command: missing EQ2 registry/derived stat and shared reservation
 * integration remain release blockers. Never accepts player state or rolls. */
import type {GameState} from '../../../../apps/mobile/src/core/types';
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import {reviewWorldBossGatheringCustodyV101,type GatheringCustodyIntentV101,type GatheringCustodyCopyV101} from '../combat/world-boss-gathering-custody-v101';
import {gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
export const WORLD_BOSS_GATHERING_MOVES_V107_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digest=gatheringSnapshotDigestV100;
const revision=(v:unknown)=>{const n=typeof v==='string'&&/^\d+$/.test(v)?Number(v):v;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>=Number.MAX_SAFE_INTEGER)throw Error('world_boss_v107_bad_revision');return n;};
const decode=<T>(v:unknown):T=>(typeof v==='string'?JSON.parse(v):v) as T;
type MoveReceipt=ReturnType<typeof reviewWorldBossGatheringCustodyV101>['receipt'];
type MoveRow=Record<string,unknown>&{request_digest:string;receipt_digest:string;receipt:unknown;instance_id:string;character_id:string;source_revision:unknown;next_revision:unknown};
type ReadRow=Record<string,unknown>&{id:string;account_id:string;source_key:string;roll:unknown;roll_digest:string;chest_digest:string;receipt:unknown;location:GatheringCustodyCopyV101['location'];holder_character_id:string|null;revision:unknown;grant_id:string;item_instance_id:string};
export async function moveWorldBossGatheringCopyV107(tx:ChestSqlV70,input:{
 accountId:string;characterId:string;expectedRevision:number;intent:GatheringCustodyIntentV101;
 /** Privileged same-transaction check against real reservations/activity
  * freezes and other exclusive custody. No client-supplied verdict. */
 assertMoveAllowed:(tx:ChestSqlV70,scope:{accountId:string;characterId:string;instanceId:string;revision:number;kind:GatheringCustodyIntentV101['kind']})=>Promise<boolean>;
},qaEnabled=false){
 if(!qaEnabled||WORLD_BOSS_GATHERING_MOVES_V107_LIVE||process.env.NODE_ENV==='production')throw Error('world_boss_v107_unreleased');
 const {accountId,characterId,expectedRevision}=input;
 const intent=structuredClone(input.intent);
 if(!UUID.test(accountId)||!UUID.test(characterId)||!intent||!UUID.test(intent.instanceId)||!/^[A-Za-z0-9:_-]{1,180}$/.test(intent.requestId)||
 !['claim_to_bank','withdraw_bank','deposit_bank','equip','unequip'].includes(intent.kind)||typeof input.assertMoveAllowed!=='function')
  throw Error('world_boss_v107_invalid_scope');
 revision(expectedRevision);
 const requestDigest=digest({accountId,characterId,expectedRevision,intent});
 // No event lock after this point. Account-only operations must not
 // reacquire a World Boss event lock and reverse the V73 lock order.
 await tx.query('SELECT private.world_boss_v57_assert_write_open($1::uuid)',[accountId]);
 await tx.query('INSERT INTO private.chest_account_fence_v70(account_id) SELECT id FROM auth.users WHERE id=$1::uuid ON CONFLICT DO NOTHING',[accountId]);
 const fence=(await tx.query<{account_id:string}>('SELECT account_id::text AS account_id FROM private.chest_account_fence_v70 WHERE account_id=$1::uuid FOR UPDATE',[accountId])).rows;
 if(fence.length!==1||fence[0].account_id!==accountId)throw Error('world_boss_v107_account_missing');
 await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('party-account:'||$1::text,0))",[accountId]);
 const readReceipt=async()=> (await tx.query<MoveRow>('SELECT request_digest,receipt_digest,receipt,instance_id::text AS instance_id,character_id::text AS character_id,source_revision,next_revision FROM private.world_boss_gathering_moves_v107 WHERE account_id=$1::uuid AND request_id=$2 FOR UPDATE',[accountId,intent.requestId])).rows;
 const verifiedReceipt=(row:MoveRow)=>{
  const receipt=decode<MoveReceipt>(row.receipt);
  if(row.request_digest!==requestDigest||row.instance_id!==intent.instanceId||row.character_id!==characterId||
  revision(row.source_revision)!==expectedRevision||revision(row.next_revision)!==expectedRevision+1||
  receipt.accountId!==accountId||receipt.requestId!==intent.requestId||receipt.instanceId!==intent.instanceId||
  receipt.sourceRevision!==expectedRevision||receipt.nextRevision!==expectedRevision+1||digest(receipt)!==row.receipt_digest)
   throw Error('world_boss_v107_request_conflict_or_corrupt_receipt');
  return receipt;
 };
 const previous=await readReceipt();
 if(previous.length>1)throw Error('world_boss_v107_duplicate_request');
 if(previous.length===1)return {receipt:verifiedReceipt(previous[0]),replayed:true,persistedInCallerTransaction:true as const,committed:false as const,releaseReady:false as const};
 const readState=async()=> (await tx.query<{state:unknown;character_id:string;revision:unknown}>('SELECT state,character_id::text AS character_id,revision FROM public.online_game_states WHERE account_id=$1::uuid FOR UPDATE',[accountId])).rows;
 const stateRows=await readState();
 if(stateRows.length!==1||stateRows[0].character_id!==characterId||revision(stateRows[0].revision)!==expectedRevision)
  throw Error('world_boss_v107_stale_state');
 const state=decode<GameState>(stateRows[0].state);
 if(state.character?.id!==characterId||!state.account||!state.inventory||!state.bank||!state.overflow)
  throw Error('world_boss_v107_bad_state');
 const ownedCharacterIds=(await tx.query<{id:string}>('SELECT id::text AS id FROM public.characters WHERE account_id=$1::uuid ORDER BY id FOR KEY SHARE',[accountId])).rows.map(x=>x.id);
 if(!ownedCharacterIds.includes(characterId)||!ownedCharacterIds.every(x=>UUID.test(x)))throw Error('world_boss_v107_foreign_character');
 // Immutable mint, original V70 receipt, actual drop leg and current
 // custody. LEFT JOIN intentionally detects missing custody/grant evidence.
 const readCopies=async()=>{
  const rows=(await tx.query<ReadRow>('SELECT m.id::text AS id,m.account_id::text AS account_id,m.source_key,m.roll,m.roll_digest,m.chest_digest,r.receipt,c.location,c.holder_character_id::text AS holder_character_id,c.revision,l.grant_id,l.item_instance_id::text AS item_instance_id FROM private.world_boss_gathering_mints_v102 m LEFT JOIN private.chest_reward_receipts_v70 r ON r.source_key=m.source_key AND r.account_id=m.account_id LEFT JOIN private.world_boss_gathering_custody_v102 c ON c.instance_id=m.id AND c.account_id=m.account_id LEFT JOIN private.chest_reward_grant_legs_v70 l ON l.source_key=m.source_key AND l.account_id=m.account_id AND l.leg_kind=\'drop\' AND l.ordinal=0 WHERE m.account_id=$1::uuid ORDER BY m.id FOR UPDATE OF m',[accountId])).rows;
  if(rows.length>10000||new Set(rows.map(x=>x.id)).size!==rows.length)throw Error('world_boss_v107_bad_mint_count');
  const copies:GatheringCustodyCopyV101[]=rows.map(row=>{
   const originalChest=decode<FrozenChestReceiptV69>(row.receipt);
   if(!UUID.test(row.id)||row.account_id!==accountId||!originalChest||row.source_key!==originalChest.sourceKey||
   originalChest.accountId!==accountId||digest(originalChest)!==row.chest_digest||row.grant_id!=='wb102:'+row.id||
   row.item_instance_id!==row.id||!['unclaimed','bank','inventory','equipped'].includes(row.location))throw Error('world_boss_v107_missing_physical_grant');
   revision(row.revision);
   return {accountId,instanceId:row.id,roll:decode<GatheringCustodyCopyV101['roll']>(row.roll),rollDigest:row.roll_digest,
    originalChest,location:row.location,holderCharacterId:row.holder_character_id};
  });
  return {rows,copies};
 };
 const {rows,copies}=await readCopies();
 const old=rows.find(x=>x.id===intent.instanceId);
 if(!old)throw Error('world_boss_v107_unknown_copy');
 const sourceDigest=digest({accountId,revision:expectedRevision,state,copies,ownedCharacterIds,intent});
 if(await input.assertMoveAllowed(tx,{accountId,characterId,instanceId:intent.instanceId,revision:expectedRevision,kind:intent.kind})!==true)
  throw Error('world_boss_v107_move_not_allowed');
 // Check again after privileged reservation reader, even inside the lock.
 const check=await readState(),checkCopies=await readCopies();
 if(check.length!==1||check[0].character_id!==characterId||revision(check[0].revision)!==expectedRevision||
 digest(decode<GameState>(check[0].state))!==digest(state)||digest(checkCopies.rows)!==digest(rows))
  throw Error('world_boss_v107_source_changed');
 const candidate=reviewWorldBossGatheringCustodyV101({accountId,revision:expectedRevision,state,copies,ownedCharacterIds,intent,
  verifyPersisted:(owner,rev,d)=>owner===accountId&&rev===expectedRevision&&d===sourceDigest,
  verifyMoveAllowed:(owner,rev,id,req)=>owner===accountId&&rev===expectedRevision&&id===intent.instanceId&&req===intent.requestId});
 const changed=candidate.candidateCopies.find(x=>x.instanceId===intent.instanceId)!;
 const oldRevision=revision(old.revision);
 const custody=(await tx.query<{revision:unknown}>('UPDATE private.world_boss_gathering_custody_v102 SET location=$3,holder_character_id=$4::uuid,revision=revision+1 WHERE instance_id=$1::uuid AND account_id=$2::uuid AND revision=$5::bigint AND location=$6 AND holder_character_id IS NOT DISTINCT FROM $7::uuid RETURNING revision',
 [intent.instanceId,accountId,changed.location,changed.holderCharacterId,oldRevision,old.location,old.holder_character_id])).rows;
 if(custody.length!==1||revision(custody[0].revision)!==oldRevision+1)throw Error('world_boss_v107_custody_cas_failed');
 const update=(await tx.query<{revision:unknown}>('UPDATE public.online_game_states SET state=$3::jsonb,revision=revision+1,updated_at=now() WHERE account_id=$1::uuid AND character_id=$2::uuid AND revision=$4 RETURNING revision',
 [accountId,characterId,JSON.stringify(candidate.candidateState),expectedRevision])).rows;
 if(update.length!==1||revision(update[0].revision)!==expectedRevision+1)throw Error('world_boss_v107_state_cas_failed');
 const after=await readState(),afterCopies=await readCopies();
 if(after.length!==1||after[0].character_id!==characterId||revision(after[0].revision)!==expectedRevision+1||
 digest({state:decode<GameState>(after[0].state),copies:afterCopies.copies})!==candidate.receipt.candidateDigest)
  throw Error('world_boss_v107_physical_readback_failed');
 await tx.query('INSERT INTO private.world_boss_gathering_moves_v107(account_id,request_id,instance_id,character_id,request_digest,receipt_digest,receipt,source_revision,next_revision) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)',
 [accountId,intent.requestId,intent.instanceId,characterId,requestDigest,candidate.receiptDigest,JSON.stringify(candidate.receipt),expectedRevision,expectedRevision+1]);
 const journal=await readReceipt();
 if(journal.length!==1||digest(verifiedReceipt(journal[0]))!==candidate.receiptDigest)throw Error('world_boss_v107_journal_readback_failed');
 return {receipt:candidate.receipt,replayed:false,persistedInCallerTransaction:true as const,committed:false as const,releaseReady:false as const};
}
