/**
 * V80 review-only, historical Inbox receipt bridge for an ALREADY-PAID
 * Party Event chest. Never a claimable Inbox attachment or a reward writer.
 *
 * Existing reward_inbox_claim_v1 routes source_kind='party' to the legacy
 * Party Contract claim RPC. Do NOT put unclaimed Party Event rows in that
 * category; doing so could attempt a different reward claim.
 *
 * The old Inbox schema has no 'party_event' source_kind. Temporarily use the
 * inert, pre-claimed 'gift' transport classification with NO attachments.
 * Its title identifies Party Events. It is deliberately unsuitable for a
 * public launch until a dedicated Inbox category is reviewed and migrated.
 *
 * Called only after V70 guaranteed/drop writers on the SAME SERIALIZABLE
 * transaction. A failed final V70 custody verification rolls this record
 * back with every other grant. All SQL must use the supplied connection.
 */
import type {
 ChestSqlV70,ChestPhysicalGrantV70,ChestPhysicalPortsV70,
} from '../loot/chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from '../loot/chest-reward-settlement-v69';
import {PARTY_EVENT_CHESTS_V51} from './weekly-party-event-chests-v51';

export const PARTY_EVENT_INBOX_HISTORY_V80_RELEASED=false;
export const PARTY_EVENT_INBOX_HISTORY_V80_VERSION='party-event-inbox-history-v80' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SOURCE=/^party-event:(\\d{13}):([0-9a-f-]{36}):(participation|preparation|finale)$/;
const TITLE='Party Event chest received';
const BODY='Rewards were credited when this chest was opened. No additional Inbox claim is required.';
type Kind='participation'|'preparation'|'finale';
function check(receipt:FrozenChestReceiptV69){
 if(!receipt||receipt.rulesVersion!=='chest-settlement-v69'||
  receipt.committed!==true||receipt.tableId!=='party_event_chest'||
  receipt.proofVersion!=='party-event-proof-v61'||
  !UUID.test(receipt.accountId)||
  receipt.equipmentDeliveryMode!==null||
  receipt.recipientCharacterId!==null||
  receipt.drops.length!==0||
  receipt.groups.length!==1||
  receipt.groups[0]?.groupId!=='equipment'||
  receipt.groups[0]?.type!=='equipment'||
  receipt.groups[0]?.entryId!==null||
  receipt.groups[0]?.quantity!==0)
  throw Error('party_event_v80_unverified_paid_receipt');
 const found=SOURCE.exec(receipt.sourceKey);
 if(!found||found[2]!==receipt.accountId)
  throw Error('party_event_v80_foreign_or_invalid_source');
 const week=Number(found[1]);
 if(!Number.isSafeInteger(week)||week%86400000!==0||
  new Date(week).getUTCDay()!==1)
  throw Error('party_event_v80_invalid_week');
 const kind=found[3] as Kind;
 const award=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind);
 const amounts=[['party_sigils',award?.partySigils],
  ['gold',award?.gold],['gem_dust',award?.gemDust],
  ['companion_essence',award?.companionEssence]];
 if(!award||receipt.guaranteed.length!==amounts.length||
  amounts.some(([id,amount],i)=>
   receipt.guaranteed[i]?.id!==id||
   receipt.guaranteed[i]?.quantity!==amount))
  throw Error('party_event_v80_noncanonical_guarantees');
 return {week,kind};
}
const rosterSql=[
 'select r.party_id::text as party_id,',
 'w.family as family,w.difficulty as difficulty',
 'from private.party_event_roster_v11 r',
 'join private.party_event_weeks_v11 w',
 'on w.party_id=r.party_id and w.event_starts_at=r.event_starts_at',
 'where r.account_id=$1::uuid',
 'and r.event_starts_at=to_timestamp($2::double precision/1000)',
 "and w.status='settled' for share of r,w",
].join(' ');
const receiptSql=[
 'select source_key from private.chest_reward_receipts_v70',
 'where source_key=$1 and account_id=$2::uuid',
 'and proof_version=$3 and rules_version=$4 for share',
].join(' ');
const insertSql=[
 'insert into private.reward_inbox_v1',
 '(account_id,source_key,source_kind,source_id,title,body,',
 'attachments,claimed_at)',
 // No claimable attachments, ever: grants already occurred in V70.
 "values($1::uuid,$2,'gift',$3::uuid,$4,$5,'[]'::jsonb,now())",
 'returning id::text as id',
].join(' ');
const readSql=[
 'select id::text as id,account_id::text as account_id,',
 'source_key,source_kind,source_id::text as source_id,',
 'title,body,attachments,claimed_at',
 'from private.reward_inbox_v1',
 'where source_key=$1 and account_id=$2::uuid',
].join(' ');
export interface PartyChestInboxHistoryPortsV80 {
 readonly grantInbox:ChestPhysicalPortsV70['grantInbox'];
 /** Used inside V70 verifyPhysical; the V70 grant journal is NOT sufficient. */
 verifyInbox(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,
  grantId:string):Promise<boolean>;
}
export function createPartyChestInboxHistoryPortsV80(qaEnabled=false):
 PartyChestInboxHistoryPortsV80{
 const gate=()=>{
  if(!qaEnabled||PARTY_EVENT_INBOX_HISTORY_V80_RELEASED||
   process.env.NODE_ENV==='production')
   throw Error('party_event_v80_history_inbox_unreleased');
 };
 const trusted=async(tx:ChestSqlV70,receipt:FrozenChestReceiptV69)=>{
  const {week,kind}=check(receipt);
  const [roster,stored]=await Promise.all([
   tx.query<{party_id:string;family:string;difficulty:string}>(
    rosterSql,[receipt.accountId,week]),
   tx.query<{source_key:string}>(
    receiptSql,[receipt.sourceKey,receipt.accountId,
     receipt.proofVersion,receipt.rulesVersion]),
  ]);
  if(roster.rows.length!==1||stored.rows.length!==1||
   stored.rows[0]?.source_key!==receipt.sourceKey)
   throw Error('party_event_v80_canonical_paid_source_missing');
  const row=roster.rows[0]!;
  if(!UUID.test(row.party_id)||
   receipt.tableVersion!=='party_event_v51_'+row.family+'_'+kind+
    '_'+row.difficulty)
   throw Error('party_event_v80_family_or_week_mismatch');
  return row.party_id;
 };
 return {
  async grantInbox(tx,receipt):Promise<ChestPhysicalGrantV70>{
   gate();
   const partyId=await trusted(tx,receipt);
   const inserted=(await tx.query<{id:string}>(insertSql,[
    receipt.accountId,receipt.sourceKey,partyId,TITLE,BODY,
   ])).rows;
   if(inserted.length!==1||!UUID.test(inserted[0]!.id))
    throw Error('party_event_v80_inbox_write_missing');
   return {grantId:'inbox:'+inserted[0]!.id,itemInstanceId:null};
  },
  async verifyInbox(tx,receipt,grantId):Promise<boolean>{
   gate();
   if(typeof grantId!=='string'||!grantId.startsWith('inbox:')||
    !UUID.test(grantId.slice(6)))return false;
   const partyId=await trusted(tx,receipt);
   const rows=(await tx.query<{
    id:string;account_id:string;source_key:string;
    source_kind:string;source_id:string;title:string;body:string;
    attachments:unknown;claimed_at:unknown;
   }>(readSql,[receipt.sourceKey,receipt.accountId])).rows;
   if(rows.length!==1)return false;
   const row=rows[0]!;
   let attachments=row.attachments;
   if(typeof attachments==='string'){
    try{attachments=JSON.parse(attachments)}catch{return false}
   }
   return row.id===grantId.slice(6)&&
    row.account_id===receipt.accountId&&
    row.source_key===receipt.sourceKey&&
    row.source_kind==='gift'&&row.source_id===partyId&&
    row.title===TITLE&&row.body===BODY&&
    Array.isArray(attachments)&&attachments.length===0&&
    row.claimed_at!==null;
  },
 };
}
