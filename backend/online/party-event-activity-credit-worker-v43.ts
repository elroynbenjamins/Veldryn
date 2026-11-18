/**
 * Party Events V43 — HIDDEN server-only canonical activity credit bridge.
 *
 * Invoke ONLY from a trusted gameplay settlement worker after its canonical
 * idle/craft/co-op receipt has committed. Never accept these inputs from an
 * HTTP body, Supabase user client, device claim or unsigned outbox.
 *
 * This adapter derives the event/week from private roster + canonical public
 * receipt in ONE SQL statement. The existing V14 private function rechecks
 * source, stage, enrolment, age, ownership and deduplication under a week lock.
 * No endpoint, scheduler, SQL migration or release flag is mounted here.
 */
import {createHash} from 'node:crypto';

export const PARTY_EVENT_CREDIT_BRIDGE_V43_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NODE=/^[a-zA-Z0-9_:.\-]{1,100}$/;

export type TrustedCommittedPartyActivityV43=
 |Readonly<{kind:'idle';claimId:string}>
 |Readonly<{kind:'craft';receiptId:string}>
 |Readonly<{kind:'coop_node';runId:string;nodeId:string;actorAccountId:string}>;

/**
 * Only the canonical claim UUID can select an eligible event. Nothing lets a
 * caller choose an account, Party ID, week, stage, points or timestamp.
 */
export const PARTY_EVENT_IDLE_CREDIT_SQL_V43=`
with candidates as (
 select w.party_id,w.event_starts_at,count(*) over() as matching_weeks
 from public.idle_claim_receipts source
 join public.characters owner on owner.id=source.character_id
 join private.party_event_roster_v11 member
  on member.character_id=owner.id and member.account_id=owner.account_id
 join private.party_event_weeks_v11 w
  on w.party_id=member.party_id and w.event_starts_at=member.event_starts_at
 where source.claim_id=$1::uuid and source.created_at>=w.event_starts_at
  and source.created_at<w.event_ends_at
  and member.joined_at<=source.created_at
)
select private.credit_party_event_activity_v14(
 party_id,event_starts_at,'idle',$1::uuid,null::text,null::uuid,$2::text
) as credit from candidates where matching_weeks=1
` as const;

export const PARTY_EVENT_CRAFT_CREDIT_SQL_V43=`
with candidates as (
 select w.party_id,w.event_starts_at,count(*) over() as matching_weeks
 from public.craft_receipts source
 join public.characters owner on owner.id=source.character_id
 join private.party_event_roster_v11 member
  on member.character_id=owner.id and member.account_id=owner.account_id
 join private.party_event_weeks_v11 w
  on w.party_id=member.party_id and w.event_starts_at=member.event_starts_at
 where source.receipt_id=$1::uuid and source.created_at>=w.event_starts_at
  and source.created_at<w.event_ends_at
  and member.joined_at<=source.created_at
)
select private.credit_party_event_activity_v14(
 party_id,event_starts_at,'craft',$1::uuid,null::text,null::uuid,$2::text
) as credit from candidates where matching_weeks=1
` as const;

export const PARTY_EVENT_COOP_CREDIT_SQL_V43=`
with candidates as (
 select w.party_id,w.event_starts_at,count(*) over() as matching_weeks
 from private.party_event_coop_node_actors_v49 witness
 join public.coop_node_results source
  on source.run_id=witness.run_id and source.node_id=witness.node_id
   and source.success=true and source.committed_at=witness.node_committed_at
   and source.fencing_generation=witness.fencing_generation
   and source.start_state_hash=witness.start_state_hash
 join private.party_event_roster_v11 member
  on member.character_id=witness.character_id and member.account_id=witness.account_id
 join private.party_event_weeks_v11 w
  on w.party_id=member.party_id and w.event_starts_at=member.event_starts_at
 where witness.run_id=$1::uuid and witness.node_id=$2::text
  and witness.account_id=$3::uuid
  and witness.node_committed_at>=w.event_starts_at
  and witness.node_committed_at<w.event_ends_at
  and member.joined_at<=witness.node_committed_at
)
select private.credit_party_event_activity_v14(
 party_id,event_starts_at,'coop_node',$1::uuid,$2::text,$3::uuid,$4::text
) as credit from candidates where matching_weeks=1
` as const;

export type PartyEventCreditSqlV43=
 typeof PARTY_EVENT_IDLE_CREDIT_SQL_V43|
 typeof PARTY_EVENT_CRAFT_CREDIT_SQL_V43|
 typeof PARTY_EVENT_COOP_CREDIT_SQL_V43;
export interface TrustedPartyActivitySqlV43 {
 /** Privileged internal PG connection, never user-facing PostgREST. */
 queryOne(sql:PartyEventCreditSqlV43,params:readonly string[]):Promise<{credit:unknown}|null>;
}
export type PartyEventCreditResultV43=
 |Readonly<{status:'not_enrolled';eventPointsGranted:0;
  pointsAddedThisInvocation:0;credited:false}>
 |Readonly<{status:'credited'|'replayed';eventPointsGranted:number;
  pointsAddedThisInvocation:number;
  totalMemberPoints:number;stage:1|2|3;credited:true}>;

function invalid(reason:string):never{throw Error('party_event_v43_'+reason);}
const record=(value:unknown):value is Record<string,unknown>=>value!==null
 &&typeof value==='object'&&!Array.isArray(value);
const safeInt=(value:unknown,min:number,max:number)=>typeof value==='number'
 &&Number.isSafeInteger(value)&&value>=min&&value<=max;

/** A stable idempotency key is derived, never supplied by a device. */
export function privatePartyActivityKeyV43(event:TrustedCommittedPartyActivityV43):string{
 if(!event||!['idle','craft','coop_node'].includes(event.kind))
  invalid('invalid_source_kind');
 let identity:string;
 if(event.kind==='idle'){
  if(!UUID.test(event.claimId))invalid('invalid_claim_id');
  identity=event.claimId.toLowerCase();
 }else if(event.kind==='craft'){
  if(!UUID.test(event.receiptId))invalid('invalid_craft_receipt_id');
  identity=event.receiptId.toLowerCase();
 }else{
  if(!UUID.test(event.runId)||!UUID.test(event.actorAccountId)
   ||!NODE.test(event.nodeId))invalid('invalid_coop_source');
  identity=event.runId.toLowerCase()+'|'+event.nodeId+'|'+event.actorAccountId.toLowerCase();
 }
 return 'pe43:'+event.kind+':'+createHash('sha256').update(identity).digest('hex');
}

function parseCredit(raw:unknown):PartyEventCreditResultV43{
 // V14 only returns creditId for REPLAY; a first credit returns no ID.
 if(!record(raw)
  ||typeof raw.replayed!=='boolean'
  ||(raw.replayed===true&&!UUID.test(raw.creditId as string))
  ||(raw.replayed===false&&raw.creditId!==undefined)
  ||!safeInt(raw.eventPointsGranted,0,40)
  ||!safeInt(raw.totalMemberPoints,0,40)
  ||!safeInt(raw.stage,1,3))
  invalid('malformed_private_credit');
 return {
  status:raw.replayed?'replayed':'credited',
  eventPointsGranted:raw.eventPointsGranted as number,
  // The SQL replay reports the ORIGINAL credited points, not a fresh grant.
  pointsAddedThisInvocation:raw.replayed?0:raw.eventPointsGranted as number,
  totalMemberPoints:raw.totalMemberPoints as number,
  stage:raw.stage as 1|2|3,credited:true,
 };
}

/**
 * Explicit internal worker factory; no registration or polling exists.
 *
 * A source may have no Party Event enrollment: return a nonpaying no-op.
 * Ambiguous overlapping enrollment yields zero rows in the CTE. V14's SQL
 * transaction remains authoritative for all real EP increments.
 */
export function createPrivatePartyActivityCreditWorkerV43(db:TrustedPartyActivitySqlV43){
 return {
  async creditCommittedSource(event:TrustedCommittedPartyActivityV43):
   Promise<PartyEventCreditResultV43>{
   const requestId=privatePartyActivityKeyV43(event);
   let sql:PartyEventCreditSqlV43;
   let params:readonly string[];
   if(event.kind==='idle'){
    sql=PARTY_EVENT_IDLE_CREDIT_SQL_V43;
    params=[event.claimId,requestId];
   }else if(event.kind==='craft'){
    sql=PARTY_EVENT_CRAFT_CREDIT_SQL_V43;
    params=[event.receiptId,requestId];
   }else{
    sql=PARTY_EVENT_COOP_CREDIT_SQL_V43;
    params=[event.runId,event.nodeId,event.actorAccountId,requestId];
   }
   let row:{credit:unknown}|null;
   try{row=await db.queryOne(sql,params);}
   catch{throw Error('party_event_v43_private_credit_unavailable');}
   return row===null
    ?{status:'not_enrolled',eventPointsGranted:0,pointsAddedThisInvocation:0,credited:false}
    :parseCredit(row.credit);
  },
 };
}
