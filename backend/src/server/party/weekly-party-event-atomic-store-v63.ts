/**
 * V63: service-only Postgres single-connection transactional store for V60.
 *
 * UNMOUNTED. The V11, V49/V50, V61 SQL and final Equipment 2.0 custody
 * must first be approved and installed. All operations use one SERIALIZABLE
 * connection; account+week locks and V61 PK/indexes prevent double reward.
 *
 * Port implementations MUST issue their existing wallet, Gold, resource,
 * inventory and Inbox SQL through the supplied transaction connection only.
 * No HTTP, side-effectful network call or independent Supabase .rpc() is
 * permitted inside the port — it would escape the rollback boundary.
 */
import {
 type PartyEventRewardStoreV60,type PartyEventRewardReceiptV60,
 type PartyEventRewardTransactionV60,type FrozenPartyGearGrantV60,
} from './weekly-party-event-claim-v60';
import {PARTY_EVENT_CHESTS_V51,type PartyChestTierV51} from './weekly-party-event-chests-v51';
import {deriveVerifiedPartyChestEvidenceV61,type PrivatePartyRewardProofV61} from './weekly-party-event-proof-v61';
import {
 planPartyEventEquipmentIssuanceV64,verifyPartyEventIssuedGearV64,
 type PartyEventItemIssuanceRequestV64,type PartyEventIssuerOutputV64,
} from './weekly-party-event-equipment-v64';
import {partyEventGearForFamilyV51} from './weekly-party-event-gear-v51';

export const PARTY_EVENT_ATOMIC_STORE_V63_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface PartySqlConnectionV63{
 query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,params?:readonly unknown[],
 ):Promise<{rows:T[]}>;
 release():void;
}
export interface PartySqlPoolV63{
 connect():Promise<PartySqlConnectionV63>;
}
export interface PartyEventAtomicPortsV63{
 /** Every port is a DB-only query using the EXACT tx passed here. */
 readCanonicalProof(tx:PartySqlConnectionV63,accountId:string,weekStartMs:number):
  Promise<PrivatePartyRewardProofV61>;
 readOwnedGearPieceIds(tx:PartySqlConnectionV63,accountId:string):
  Promise<readonly string[]>;
 readExistingPartySigils(tx:PartySqlConnectionV63,accountId:string):
  Promise<number>;
 /** This must be backed by a registered EQ2 issuer + physical account CAS.
  * V64 currently has mandatory blockers, so this port cannot run. */
 issueAndCommitCanonicalEventGear(tx:PartySqlConnectionV63,
  request:PartyEventItemIssuanceRequestV64):Promise<PartyEventIssuerOutputV64>;
 applyExistingPartySigils(tx:PartySqlConnectionV63,
  accountId:string,sourceKey:string,delta:number):Promise<void>;
 grantExistingResources(tx:PartySqlConnectionV63,accountId:string,
  sourceKey:string,resources:{gold:number;gemDust:number;companionEssence:number}):Promise<void>;
 grantExactEquipmentCustody(tx:PartySqlConnectionV63,accountId:string,
  sourceKey:string,item:FrozenPartyGearGrantV60):Promise<void>;
}
const receiptAmounts=new Map(PARTY_EVENT_CHESTS_V51.map(c=>[c.kind,c]));
function checkedReceipt(receipt:PartyEventRewardReceiptV60,
 account:string,week:number,family:PrivatePartyRewardProofV61['week']['family'],
 approvedTier:PartyChestTierV51,
):void{
 const key='party-event:'+week+':'+account+':';
 const kind=receipt?.chestKind;
 const chest=receipt?.origin==='chest'
  ?PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind):undefined;
 const expected=receipt?.origin==='chest'&&chest
  ?key+kind:receipt?.origin==='exchange'?key+'exchange':null;
 const exact=receipt?.frozenGear;
 if(!receipt||!expected||receipt.sourceKey!==expected||
  receipt.accountId!==account||receipt.weekStartMs!==week||
  receipt.rulesVersion!=='party-event-reward-v60'||
  !Number.isSafeInteger(receipt.partySigilsDelta)||
  !Number.isSafeInteger(receipt.gold)||
  !Number.isSafeInteger(receipt.gemDust)||
  !Number.isSafeInteger(receipt.companionEssence)||
  (chest?(receipt.partySigilsDelta!==chest.partySigils||
   receipt.gold!==chest.gold||receipt.gemDust!==chest.gemDust||
   receipt.companionEssence!==chest.companionEssence):(
    receipt.chestKind!=null||
    receipt.partySigilsDelta!==-60||receipt.gold!==0||
    receipt.gemDust!==0||receipt.companionEssence!==0))||
  (receipt.pieceId!==null&&
   !partyEventGearForFamilyV51(family).some(p=>p.id===receipt.pieceId))||
  ((receipt.pieceId===null)!==(exact===null))||
  (exact!==null&&(
   !UUID.test(exact.itemInstanceId)||exact.pieceId!==receipt.pieceId||
   exact.tier!==approvedTier||
   typeof exact.exactItemReceiptVersion!=='string'||
   exact.exactItemReceiptVersion.length<3))||
  (!chest&&receipt.pieceId===null))
  throw Error('party_event_v63_corrupt_canonical_receipt');
}
const lockSql=[
 'select r.party_id::text as party_id',
 'from private.party_event_roster_v11 r',
 'join private.party_event_weeks_v11 w',
 ' on w.party_id=r.party_id and w.event_starts_at=r.event_starts_at',
 'where r.account_id=$1::uuid',
 'and r.event_starts_at=to_timestamp($2::double precision/1000)',
 'for update of r,w',
].join(' ');
const readReceiptSql=[
 'select receipt from private.party_event_reward_receipts_v61',
 'where source_key=$1 and account_id=$2::uuid',
 'and event_starts_at=to_timestamp($3::double precision/1000)',
].join(' ');
const writeReceiptSql=[
 'insert into private.party_event_reward_receipts_v61',
 '(source_key,party_id,event_starts_at,account_id,origin,chest_kind,',
 'piece_id,item_instance_id,exact_item_receipt_version,party_sigils_delta,',
 'gold,gem_dust,companion_essence,rules_version,canonical_proof_version,receipt)',
 'values ($1,$2,to_timestamp($3::double precision/1000),$4::uuid,$5,$6,',
 '$7,$8::uuid,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)',
].join(' ');
/**
 * A transaction adapter, not a public route. Explicit QA invocation only;
 * even with this adapter, V64's mandatory missing-manifest/custody blockers
 * prevent actual event-gear issuance until separate 2.0 approval.
 */
export function createPartyEventRewardStoreV63(
 pool:PartySqlPoolV63,ports:PartyEventAtomicPortsV63,serverEnabled=false,
):PartyEventRewardStoreV60{
 return {
  async withLockedAccountWeek<T>(
   accountId:string,weekStartMs:number,
   work:(tx:PartyEventRewardTransactionV60)=>Promise<T>,
  ):Promise<T>{
   if(!serverEnabled||PARTY_EVENT_ATOMIC_STORE_V63_RELEASED||
    process.env.NODE_ENV==='production')
    throw Error('party_event_v63_hidden_store_disabled');
   if(!UUID.test(accountId)||accountId!==accountId.toLowerCase()||
    !Number.isSafeInteger(weekStartMs)||weekStartMs<0||
    weekStartMs%86400000!==0||new Date(weekStartMs).getUTCDay()!==1)
    throw Error('party_event_v63_invalid_authenticated_week');
   const connection=await pool.connect();
   let began=false;
   try{
    await connection.query('begin isolation level serializable');
    began=true;
    await connection.query("set local lock_timeout = '5s'");
    const locked=await connection.query<{party_id:string}>(lockSql,[accountId,weekStartMs]);
    if(locked.rows.length!==1||!UUID.test(locked.rows[0]!.party_id))
     throw Error('party_event_v63_missing_or_ambiguous_roster');
    const partyId=locked.rows[0]!.party_id;
    let evidence:ReturnType<typeof deriveVerifiedPartyChestEvidenceV61>|null=null;
    let proof:PrivatePartyRewardProofV61|null=null;
    let stagedReceipt:PartyEventRewardReceiptV60|null=null;
    let sigilsApplied=false,resourcesApplied=false,equipmentApplied=false;
    const requireStagedSource=(sourceKey:string)=>{
     if(!stagedReceipt||stagedReceipt.sourceKey!==sourceKey)
      throw Error('party_event_v63_grant_without_receipt');
     return stagedReceipt;
    };
    const requireEvidence=()=>{
     if(!evidence||!proof)throw Error('party_event_v63_proof_not_loaded');
     return {evidence,proof};
    };
    const assertSource=(key:string)=>{
     const prefix='party-event:'+weekStartMs+':'+accountId+':';
     if(!key.startsWith(prefix)||
      !['participation','preparation','finale','exchange'].includes(key.slice(prefix.length)))
      throw Error('party_event_v63_invalid_source_key');
    };
    const tx:PartyEventRewardTransactionV60={
     readVerifiedEvidence:async()=>{
      proof=await ports.readCanonicalProof(connection,accountId,weekStartMs);
      if(proof.week.partyId!==partyId)
       throw Error('party_event_v63_foreign_party_proof');
      evidence=deriveVerifiedPartyChestEvidenceV61(proof,accountId);
      if(evidence.eventStartsAtUtcMs!==weekStartMs)
       throw Error('party_event_v63_wrong_week_proof');
      return evidence;
     },
     readOwnedPartyGearPieceIds:async()=>{
      const {evidence}=requireEvidence();
      const owned=await ports.readOwnedGearPieceIds(connection,accountId);
      if(!Array.isArray(owned)||owned.length>20||
       new Set(owned).size!==owned.length||
       owned.some(id=>!partyEventGearForFamilyV51(evidence.family).some(x=>x.id===id)))
       throw Error('party_event_v63_invalid_canonical_collection');
      return owned;
     },
     readPartySigilsBalance:async()=>{
      requireEvidence();
      const balance=await ports.readExistingPartySigils(connection,accountId);
      if(!Number.isSafeInteger(balance)||balance<0)
       throw Error('party_event_v63_invalid_existing_sigils');
      return balance;
     },
     readReceipt:async(sourceKey)=>{
      const {evidence}=requireEvidence();
      assertSource(sourceKey);
      const found=await connection.query<{receipt:PartyEventRewardReceiptV60}>(
       readReceiptSql,[sourceKey,accountId,weekStartMs]);
      if(found.rows.length>1)
       throw Error('party_event_v63_ambiguous_receipt');
      const receipt=found.rows[0]?.receipt??null;
      if(receipt)checkedReceipt(receipt,accountId,weekStartMs,evidence.family,
       evidence.eligibleGearTier);
      return receipt;
     },
     mintExactEquipmentV2:async({sourceKey,piece,tier})=>{
      const {evidence,proof}=requireEvidence();
      assertSource(sourceKey);
      if(!partyEventGearForFamilyV51(evidence.family).some(p=>p===piece)||
       tier!==evidence.eligibleGearTier)
       throw Error('party_event_v63_unapproved_piece_or_tier');
      const request:PartyEventItemIssuanceRequestV64={
       source:'trusted_party_reward_transaction',
       sourceKey,accountId,
       ownerCharacterId:proof.roster.frozenCharacterId,
       eventStartsAtUtcMs:weekStartMs,piece,tier,
       classRestriction:null,
       rollPolicy:'equipment_v2_authoritative_quality_rarity_affixes',
       custodyPolicy:'same_account_transaction_or_rollback',
       sourceCatalogVersion:'party-event-gear-v51',
      };
      const plan=planPartyEventEquipmentIssuanceV64(request);
      if(plan.blockers.length)
       throw Error('party_event_v63_eq2_event_issuer_not_ready');
      const output=await ports.issueAndCommitCanonicalEventGear(connection,request);
      return verifyPartyEventIssuedGearV64(request,output);
     },
     insertReceiptOnce:async receipt=>{
      const {evidence}=requireEvidence();
      checkedReceipt(receipt,accountId,weekStartMs,evidence.family,
       evidence.eligibleGearTier);
      if(stagedReceipt)throw Error('party_event_v63_multiple_receipts_in_one_transaction');
      await connection.query(writeReceiptSql,[
       receipt.sourceKey,partyId,weekStartMs,accountId,receipt.origin,
       receipt.chestKind??null,receipt.pieceId,
       receipt.frozenGear?.itemInstanceId??null,
       receipt.frozenGear?.exactItemReceiptVersion??null,
       receipt.partySigilsDelta,receipt.gold,receipt.gemDust,
       receipt.companionEssence,receipt.rulesVersion,
       'party-event-proof-v61',JSON.stringify({...receipt,
        chestKind:receipt.chestKind??null}),
      ]);
      stagedReceipt=receipt;
     },
     applyPartySigilsDelta:async(sourceKey,delta)=>{
      requireEvidence();assertSource(sourceKey);
      const receipt=requireStagedSource(sourceKey);
      if(sigilsApplied||receipt.partySigilsDelta!==delta||
       !Number.isSafeInteger(delta)||delta<-60||delta>16)
       throw Error('party_event_v63_invalid_wallet_delta');
      await ports.applyExistingPartySigils(connection,accountId,sourceKey,delta);
      sigilsApplied=true;
     },
     grantExistingResources:async(sourceKey,amounts)=>{
      requireEvidence();assertSource(sourceKey);
      const receipt=requireStagedSource(sourceKey);
      if(resourcesApplied||receipt.origin!=='chest'||!amounts||
       amounts.gold!==receipt.gold||amounts.gemDust!==receipt.gemDust||
       amounts.companionEssence!==receipt.companionEssence||
       ![amounts.gold,amounts.gemDust,amounts.companionEssence]
       .every(v=>Number.isSafeInteger(v)&&v>=0))
       throw Error('party_event_v63_invalid_resource_grant');
      await ports.grantExistingResources(connection,accountId,sourceKey,amounts);
      resourcesApplied=true;
     },
     grantFrozenEquipment:async(sourceKey,item)=>{
      requireEvidence();assertSource(sourceKey);
      const receipt=requireStagedSource(sourceKey);
      if(equipmentApplied||!item||!receipt.frozenGear||
       !UUID.test(item.itemInstanceId)||
       item.itemInstanceId!==receipt.frozenGear.itemInstanceId||
       item.pieceId!==receipt.frozenGear.pieceId||
       item.tier!==receipt.frozenGear.tier||
       item.exactItemReceiptVersion!==receipt.frozenGear.exactItemReceiptVersion)
       throw Error('party_event_v63_invalid_item_grant');
      await ports.grantExactEquipmentCustody(connection,accountId,sourceKey,item);
      equipmentApplied=true;
     },
    };
    const result=await work(tx);
    if(stagedReceipt&&(!sigilsApplied||
     (stagedReceipt.origin==='chest'&&!resourcesApplied)||
     (stagedReceipt.frozenGear!==null&&!equipmentApplied)))
     throw Error('party_event_v63_incomplete_grant_transaction');
    await connection.query('commit');
    return result;
   }catch(error){
    if(began){
     try{await connection.query('rollback');}
     catch{throw Error('party_event_v63_rollback_failed');}
    }
    throw error;
   }finally{
    connection.release();
   }
  },
 };
}
