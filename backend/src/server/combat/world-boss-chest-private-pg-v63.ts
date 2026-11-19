/**
 * World Boss V63 — PRIVATE PG transaction adapter, hidden and unmounted.
 *
 * The driver must pin one PostgreSQL connection for the whole callback,
 * BEGIN/COMMIT only after success, ROLLBACK on error. No public RPC, edge
 * route, Supabase client, production migration or implicit connection pool.
 *
 * Compatible with REVIEW-ONLY V17/V27/V28/V57/V61/V67 SQL. Real reward
 * resource and Inbox ports still require the released account ledgers.
 */
import type {WorldBossCanonicalChestReadV59} from './world-boss-chest-proof-v59';
import type {
 WorldBossChestPrivateStoreV61,WorldBossChestTransactionV61,
 WorldBossChestReceiptV61,
} from './world-boss-chest-settlement-v61';
import type {WorldBossEquipmentMintRequestV62,
 WorldBossFrozenEquipmentReceiptV62} from './world-boss-gathering-instance-v62';
import {worldBossTierForVerifiedAccountLevelV67} from './world-boss-tier-policy-v67';
import {WORLD_BOSS_GEAR_SLOTS_V58,type WorldBossGearSlotV58} from './world-boss-chests-v58';

export const WORLD_BOSS_CHEST_PRIVATE_PG_V63_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal)$/;
export interface WorldBossChestPgTransactionV63{
 query<T extends object>(sql:string,args:readonly unknown[]):Promise<{rows:T[]}>;
}
export interface WorldBossChestPgDriverV63{
 /** Same connection, READ COMMITTED, rollback all inserted rows on failure. */
 withTransaction<T>(work:(tx:WorldBossChestPgTransactionV63)=>Promise<T>):Promise<T>;
}
/** A real Node PostgreSQL pool supplies this shape from pool.connect().
 * No new pg dependency, credentials or public connection is introduced here. */
export interface WorldBossChestPgClientV63 extends WorldBossChestPgTransactionV63{
 release():void;
}
export interface WorldBossChestPgPoolV63{
 connect():Promise<WorldBossChestPgClientV63>;
}
/** Pinned-client transaction driver: errors roll back, success commits,
 * and every path returns the client. Never call from an HTTP route.
 * A COMMIT acknowledgement failure is uncertain; the next verified claim
 * must read the immutable source receipt before considering new entropy. */
export function createPinnedWorldBossPgDriverV63(
 pool:WorldBossChestPgPoolV63,isolatedFixtureEnabled=false,
):WorldBossChestPgDriverV63{
 if(!isolatedFixtureEnabled||WORLD_BOSS_CHEST_PRIVATE_PG_V63_LIVE)
  throw Error('world_boss_v63_hidden_adapter_disabled');
 if(!pool||typeof pool.connect!=='function')
  throw Error('world_boss_v63_private_pool_required');
 return {async withTransaction<T>(
  work:(tx:WorldBossChestPgTransactionV63)=>Promise<T>,
 ):Promise<T>{
  const client=await pool.connect();
  if(!client||typeof client.query!=='function'||
   typeof client.release!=='function')
   throw Error('world_boss_v63_invalid_pooled_client');
  let began=false;
  try{
   await client.query('BEGIN',[]);
   began=true;
   const result=await work(client);
   await client.query('COMMIT',[]);
   return result;
  }catch(error){
   if(began){
    try{await client.query('ROLLBACK',[]);}catch{
     // Preserve the original failure. A broken connection is not reusable;
     // the PG pool must evict it in its real client implementation.
    }
   }
   throw error;
  }finally{client.release();}
 }};
}
export interface WorldBossChestPgPortsV63{
 /** Only server-owned, committed character saves; no mobile combat level. */
 readHighestOwnedCharacterLevel(
  tx:WorldBossChestPgTransactionV63,accountId:string,
 ):Promise<number>;
 /** Existing verified account resource ledger; must use the SAME tx. */
 grantAccountResources(
  tx:WorldBossChestPgTransactionV63,sourceKey:string,accountId:string,
  values:{gold:number;gemDust:number;temperingDust:number;companionEssence:number},
 ):Promise<void>;
 /** Existing private account Inbox service; must use the SAME tx. */
 insertAccountInbox(
  tx:WorldBossChestPgTransactionV63,receipt:WorldBossChestReceiptV61,
 ):Promise<void>;
}
function assertId(id:unknown):asserts id is string{
 if(typeof id!=='string'||!UUID.test(id))throw Error('world_boss_v63_invalid_identity');
}
function one<T extends object>(rows:readonly T[],code:string):T{
 if(rows.length!==1)throw Error('world_boss_v63_'+code);
 return rows[0];
}
function checkSource(sourceKey:string,eventId:string,accountId:string){
 if(!KEY.test(sourceKey)||
  !sourceKey.startsWith('world-boss:'+eventId+':'+accountId+':'))
  throw Error('world_boss_v63_foreign_source');
}
type EventRow={eventId:string;bossId:'hollowroot'|'sunscar'|'frostmarch';
 status:'draft'|'active'|'closed';initialHp:string;remainingHp:string};
type CampRow={fortifications:number;fieldProvisions:number;siegecraft:number;
 fortTier1:number;fieldTier1:number;siegeTier1:number;
 fortTier2:number;fieldTier2:number;siegeTier2:number};
type DonationRow={eventId:string;accountId:string;requestId:string};
type AttackRow={eventId:string;accountId:string;requestId:string;
 ordinal:number;status:'reserved'|'committed'|'voided';
 replayProof:'verified'|'absent'};
const sourceComponents=['gold','gem_dust','tempering_dust','companion_essence'] as const;
function validatePorts(ports:WorldBossChestPgPortsV63){
 if(!ports||typeof ports.readHighestOwnedCharacterLevel!=='function'||
  typeof ports.grantAccountResources!=='function'||
  typeof ports.insertAccountInbox!=='function')
  throw Error('world_boss_v63_private_resource_ports_required');
}
export function createWorldBossChestPrivatePgV63(
 driver:WorldBossChestPgDriverV63,ports:WorldBossChestPgPortsV63,
 isolatedFixtureEnabled=false,
):WorldBossChestPrivateStoreV61{
 // The production path cannot open an unapproved review-only table.
 if(!isolatedFixtureEnabled||WORLD_BOSS_CHEST_PRIVATE_PG_V63_LIVE)
  throw Error('world_boss_v63_hidden_adapter_disabled');
 if(!driver||typeof driver.withTransaction!=='function')
  throw Error('world_boss_v63_transaction_driver_required');
 validatePorts(ports);
 return {
  async withLockedAccountEvent<T>(eventId:string,accountId:string,
   work:(tx:WorldBossChestTransactionV61)=>Promise<T>):Promise<T>{
   assertId(eventId);assertId(accountId);
   if(eventId!==eventId.toLowerCase()||accountId!==accountId.toLowerCase())
    throw Error('world_boss_v63_noncanonical_identity');
   if(typeof work!=='function')throw Error('world_boss_v63_missing_transaction_work');
   return driver.withTransaction(async db=>{
    if(!db||typeof db.query!=='function')
     throw Error('world_boss_v63_missing_pinned_transaction');
    // Must be the first statement after driver BEGIN, not a pooled query.
    await db.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED',[]);
    // Event lock FIRST to match V18/V27/V28 ordering; then V57 account lock.
    // FOR UPDATE serializes HP progress with this exact claim snapshot.
    const event=one((await db.query<EventRow>(
     'SELECT id::text AS "eventId",boss_id AS "bossId",status,'+
     'max_hp::text AS "initialHp",remaining_hp::text AS "remainingHp" '+
     'FROM private.world_boss_events_v17 WHERE id=$1::uuid FOR UPDATE',
     [eventId])).rows,'event_missing');
    if(event.eventId!==eventId||!['hollowroot','sunscar','frostmarch'].includes(event.bossId)||
     !['active','closed'].includes(event.status))
     throw Error('world_boss_v63_invalid_event');
    await db.query(
     'SELECT private.world_boss_v57_assert_write_open($1::uuid)',[accountId]);
    await db.query(
     'SELECT pg_catalog.pg_advisory_xact_lock('+
      'pg_catalog.hashtextextended($1::text,630063::bigint))',
     [eventId+':'+accountId]);
    let evidenceRead=false;
    const readEvidence=async():Promise<WorldBossCanonicalChestReadV59>=>{
     const camp=one((await db.query<CampRow>(
      'SELECT fortifications,"field_provisions" AS "fieldProvisions",siegecraft,'+
      'fort_tier1 AS "fortTier1",field_tier1 AS "fieldTier1",'+
      'siege_tier1 AS "siegeTier1",fort_tier2 AS "fortTier2",'+
      'field_tier2 AS "fieldTier2",siege_tier2 AS "siegeTier2" '+
      'FROM private.world_boss_war_camps_v27 WHERE event_id=$1::uuid FOR SHARE',
      [eventId])).rows,'camp_missing');
     const donations=(await db.query<DonationRow>(
      'SELECT event_id::text AS "eventId",account_id::text AS "accountId",'+
      'request_id AS "requestId" FROM private.world_boss_war_donations_v27 '+
      'WHERE event_id=$1::uuid AND account_id=$2::uuid ORDER BY ordinal',
      [eventId,accountId])).rows.map(r=>({...r,status:'committed' as const}));
     const attempts=(await db.query<AttackRow>(
      'SELECT a.event_id::text AS "eventId",a.account_id::text AS "accountId",'+
      'a.request_id AS "requestId",a.ordinal,a.status,'+
      'CASE WHEN a.status=\'committed\' AND p.replay_digest=a.replay_digest '+
      'THEN \'verified\' ELSE \'absent\' END AS "replayProof" '+
      'FROM private.world_boss_attempts_v17 a '+
      'LEFT JOIN private.world_boss_replay_proofs_v28 p ON '+
      'p.event_id=a.event_id AND p.account_id=a.account_id '+
      'AND p.request_id=a.request_id '+
      'WHERE a.event_id=$1::uuid AND a.account_id=$2::uuid '+
      'ORDER BY a.ordinal,a.request_id',
      [eventId,accountId])).rows;
     const max=Number(event.initialHp),remaining=Number(event.remainingHp);
     if(!Number.isSafeInteger(max)||max<=0||!Number.isSafeInteger(remaining)||
      remaining<0||remaining>max)throw Error('world_boss_v63_bad_hp');
     for(const n of ['fortifications','fieldProvisions','siegecraft',
      'fortTier1','fieldTier1','siegeTier1','fortTier2','fieldTier2','siegeTier2'] as const){
      if(!Number.isSafeInteger(camp[n])||camp[n]<0)
       throw Error('world_boss_v63_untrusted_war_camp');
     }
     const level=(current:number,first:number,second:number)=>
      current>=second?2:current>=first?1:0;
     evidenceRead=true;
     return {eventId,accountId,
      event:{bossId:event.bossId,initialHp:max,remainingHp:remaining},
      warCamp:{eventId,trackTiers:{
       fortifications:level(camp.fortifications,camp.fortTier1,camp.fortTier2),
       fieldProvisions:level(camp.fieldProvisions,camp.fieldTier1,camp.fieldTier2),
       siegecraft:level(camp.siegecraft,camp.siegeTier1,camp.siegeTier2),
      },ownDonationReceipts:donations},
      attacks:attempts,
     };
    };
    const tx:WorldBossChestTransactionV61={
     readCanonicalEvidence:readEvidence,
     async readOwnedBossGatheringSlots(){
      if(!evidenceRead)throw Error('world_boss_v63_proof_required');
      const rows=(await db.query<{slot:WorldBossGearSlotV58}>(
       'SELECT DISTINCT slot FROM private.world_boss_gathering_items_v67 '+
       'WHERE account_id=$1::uuid AND boss_id=$2::text '+
       'AND custody IN (\'account_bound_unclaimed_inventory\',\'equipped\')',
       [accountId,event.bossId])).rows;
      if(rows.some(r=>!WORLD_BOSS_GEAR_SLOTS_V58.includes(r.slot)))
       throw Error('world_boss_v63_invalid_owned_slots');
      return rows.map(r=>r.slot);
     },
     async readTrustedEquipmentTier(){
      if(!evidenceRead)throw Error('world_boss_v63_proof_required');
      const level=await ports.readHighestOwnedCharacterLevel(db,accountId);
      return worldBossTierForVerifiedAccountLevelV67({
       highestOwnedCharacterLevel:level,
      });
     },
     async readReceipt(sourceKey){
      checkSource(sourceKey,eventId,accountId);
      const rows=(await db.query<{receipt:WorldBossChestReceiptV61}>(
       'SELECT immutable_receipt AS receipt '+
       'FROM private.world_boss_chest_receipts_v61 '+
       'WHERE event_id=$1::uuid AND account_id=$2::uuid AND source_key=$3::text',
       [eventId,accountId,sourceKey])).rows;
      if(rows.length>1)throw Error('world_boss_v63_duplicate_receipts');
      const receipt=rows[0]?.receipt??null;
      if(!receipt)return null;
      // This replay path must also prove that source bookkeeping and the
      // exact frozen item survived. Do not silently accept partial grants.
      const sources=(await db.query<{component:string}>(
       'SELECT component FROM private.world_boss_chest_grant_sources_v61 '+
       'WHERE source_key=$1::text',[sourceKey])).rows;
      const expected=['gold','gem_dust','tempering_dust','companion_essence','inbox'];
      if(receipt.gearHit)expected.push('equipment');
      if(sources.length!==expected.length||
       new Set(sources.map(x=>x.component)).size!==sources.length||
       expected.some(component=>!sources.some(x=>x.component===component)))
       throw Error('world_boss_v63_incomplete_stored_grant');
      if(receipt.gearHit){
       const owned=(await db.query<{instanceId:string;roll:unknown}>(
        'SELECT instance_id::text AS "instanceId",roll '+
        'FROM private.world_boss_gathering_items_v67 '+
        'WHERE source_key=$1::text AND account_id=$2::uuid AND event_id=$3::uuid',
        [sourceKey,accountId,eventId])).rows;
       if(owned.length!==1||!receipt.frozenGear||
        owned[0].instanceId!==receipt.frozenGear.instanceId||
        JSON.stringify(owned[0].roll)!==JSON.stringify(receipt.frozenGear.roll))
        throw Error('world_boss_v63_missing_frozen_item');
      }
      return receipt;
     },
     async issueExactGatheringItem(req:WorldBossEquipmentMintRequestV62){
      checkSource(req.sourceKey,eventId,accountId);
      if(req.accountId!==accountId||req.eventId!==eventId||req.bossId!==event.bossId)
       throw Error('world_boss_v63_foreign_item');
      const r=one((await db.query<{instanceId:string}>(
       'INSERT INTO private.world_boss_gathering_items_v67 '+
       '(instance_id,source_key,event_id,account_id,boss_id,slot,'+
       'equipment_slot,piece_id,set_id,tier,rarity,quality,'+
       'base_speed_bps,roll,custody) VALUES '+
       '(pg_catalog.gen_random_uuid(),$1::text,$2::uuid,$3::uuid,'+
       '$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,'+
       '$10::text,$11::integer,$12::integer,$13::jsonb,'+
       '\'account_bound_unclaimed_inventory\') '+
       'RETURNING instance_id::text AS "instanceId"',
       [req.sourceKey,eventId,accountId,req.bossId,req.roll.slot,
        req.slot,req.pieceId,req.setId,req.tier,req.roll.rarity,
        req.roll.quality,req.roll.gatheringSpeedBasisPoints,
        JSON.stringify(req.roll)])).rows,'item_issuance_missing');
      return {...req,instanceId:r.instanceId,
       custody:'account_bound_unclaimed_inventory',mutable:false};
     },
     async insertReceiptOnce(receipt){
      checkSource(receipt.sourceKey,eventId,accountId);
      if(receipt.accountId!==accountId||receipt.eventId!==eventId||
       receipt.bossId!==event.bossId)throw Error('world_boss_v63_foreign_receipt');
      const hit=receipt.frozenGear!==null;
      const rows=(await db.query<{sourceKey:string}>(
       'INSERT INTO private.world_boss_chest_receipts_v61 '+
       '(event_id,account_id,boss_id,chest_kind,source_key,gear_hit,'+
       'gear_instance_id,gear_tier,gear_roll,gold,gem_dust,'+
       'tempering_dust,companion_essence,world_sigils_delta,'+
       'inbox_source_key,immutable_receipt) VALUES '+
       '($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::boolean,'+
       '$7::uuid,$8::text,$9::jsonb,$10::integer,$11::integer,'+
       '$12::integer,$13::integer,0,$5::text,$14::jsonb) '+
       'RETURNING source_key AS "sourceKey"',
       [eventId,accountId,event.bossId,receipt.kind,receipt.sourceKey,
        hit,receipt.frozenGear?.instanceId??null,
        receipt.frozenGear?.tier??null,
        hit?JSON.stringify(receipt.frozenGear?.roll):null,
        receipt.gold,receipt.gemDust,receipt.temperingDust,
        receipt.companionEssence,JSON.stringify(receipt)])).rows;
      if(one(rows,'receipt_insert_missing').sourceKey!==receipt.sourceKey)
       throw Error('world_boss_v63_receipt_identity_mismatch');
     },
     async grantExistingResources(sourceKey,values){
      checkSource(sourceKey,eventId,accountId);
      await ports.grantAccountResources(db,sourceKey,accountId,values);
      for(const component of sourceComponents){
       await db.query(
        'INSERT INTO private.world_boss_chest_grant_sources_v61 '+
        '(source_key,component,grant_id) VALUES ($1::text,$2::text,$3::text)',
        [sourceKey,component,sourceKey+':'+component]);
      }
     },
     async attachIssuedEquipment(sourceKey,item){
      checkSource(sourceKey,eventId,accountId);
      if(item.sourceKey!==sourceKey||item.accountId!==accountId||
       item.eventId!==eventId||item.bossId!==event.bossId)
       throw Error('world_boss_v63_foreign_equipment_receipt');
      const items=(await db.query<{instanceId:string}>(
       'SELECT instance_id::text AS "instanceId" '+
       'FROM private.world_boss_gathering_items_v67 '+
       'WHERE source_key=$1::text AND account_id=$2::uuid AND event_id=$3::uuid',
       [sourceKey,accountId,eventId])).rows;
      if(one(items,'unowned_item').instanceId!==item.instanceId)
       throw Error('world_boss_v63_item_receipt_mismatch');
      await db.query(
       'INSERT INTO private.world_boss_chest_grant_sources_v61 '+
       '(source_key,component,grant_id) VALUES ($1::text,\'equipment\',$2::text)',
       [sourceKey,item.instanceId]);
     },
     async insertInboxOnce(receipt){
      checkSource(receipt.sourceKey,eventId,accountId);
      await ports.insertAccountInbox(db,receipt);
      await db.query(
       'INSERT INTO private.world_boss_chest_grant_sources_v61 '+
       '(source_key,component,grant_id) VALUES ($1::text,\'inbox\',$2::text)',
       [receipt.sourceKey,receipt.sourceKey+':inbox']);
     },
    };
    return work(tx);
   });
  },
 };
}
