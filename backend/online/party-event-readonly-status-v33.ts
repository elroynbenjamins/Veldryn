/**
 * Party Events V33 — hidden, account-scoped status for a future authenticated
 * server response. This has NO route, client RPC, reward claim, or event write.
 *
 * Input accountId MUST come from server-authenticated identity, not a request
 * parameter. A single SELECT projects a coherent MVCC snapshot.
 * V42 additionally suppresses future, expired and overlapping live enrollments.
 */
export const PARTY_EVENT_READONLY_STATUS_V33_RELEASED=false;

export const PARTY_EVENT_READONLY_STATUS_SQL_V33=`
select jsonb_build_object(
 'schema','party-event-readonly-status-v33',
 'eventStartsAt',w.event_starts_at,
 'eventEndsAt',w.event_ends_at,
 'serverTime',now(),
 'family',w.family,'variation',w.variation,
 'difficulty',w.difficulty,'status',w.status,
 'stage',w.active_stage,
 'rosterSize',(select count(*)::integer from private.party_event_roster_v11 rr
   where rr.party_id=w.party_id and rr.event_starts_at=w.event_starts_at),
 'completedActions',coalesce((
   select jsonb_agg(a.action_id order by a.action_id)
   from private.party_event_receipts_v11 a
   where a.party_id=w.party_id and a.event_starts_at=w.event_starts_at
    and a.account_id=r.account_id
 ),'[]'::jsonb),
 'orders',coalesce((
   select jsonb_agg(jsonb_build_object(
     'stage',s.stage,'itemId',s.item_id,'category',s.category,
     'kind',s.kind,'target',s.target_quantity,'donated',s.donated_quantity)
     order by s.stage,s.kind,s.category,s.item_id)
   from private.party_event_supply_orders_v16 s
   where s.party_id=w.party_id and s.event_starts_at=w.event_starts_at
 ),'[]'::jsonb),
 'votes',jsonb_build_object(
   'stage2',(
     select s.vote_choice from private.party_event_stages_v11 s
     where s.party_id=w.party_id and s.event_starts_at=w.event_starts_at
       and s.stage=2 and s.vote_locked_at is not null
   ),
   'stage3',(
     select s.vote_choice from private.party_event_stages_v11 s
     where s.party_id=w.party_id and s.event_starts_at=w.event_starts_at
       and s.stage=3 and s.vote_locked_at is not null
   ),
   'myStage2Ballot',exists(
     select 1 from private.party_event_ballots_v17 b
     where b.party_id=w.party_id and b.event_starts_at=w.event_starts_at
      and b.account_id=r.account_id and b.stage=2),
   'myStage3Ballot',exists(
     select 1 from private.party_event_ballots_v17 b
     where b.party_id=w.party_id and b.event_starts_at=w.event_starts_at
      and b.account_id=r.account_id and b.stage=3)
 ),
 'canClaim',false,
 'canContribute',false,
 'canFight',false
) as snapshot
from private.party_event_roster_v11 r
join private.party_event_weeks_v11 w
 on w.party_id=r.party_id and w.event_starts_at=r.event_starts_at
where r.account_id=$1::uuid
  -- V42: only the current 7-day event + Day 8 read-only results window.
  -- The full-history newest enrollment could otherwise mask an active week.
  and w.event_starts_at <= now()
  and w.event_ends_at + interval '1 day' > now()
  -- V11 prevents duplicate account/week, but a different event start time
  -- could still overlap. Ambiguous active enrollments must fail closed.
  and (
    select count(*) from private.party_event_roster_v11 overlap_roster
    join private.party_event_weeks_v11 overlap_week
      on overlap_week.party_id=overlap_roster.party_id
      and overlap_week.event_starts_at=overlap_roster.event_starts_at
    where overlap_roster.account_id=r.account_id
      and overlap_week.event_starts_at <= now()
      and overlap_week.event_ends_at + interval '1 day' > now()
  )=1
order by w.event_starts_at desc
limit 1
` as const;

export type PartyEventFamilyV33='broken_caravan'|'nightfall_hunt'|'broken_wards'|'lost_reliquary';
export type PartyEventDifficultyV33='standard'|'veteran'|'heroic';
export type PartyEventStatusV33='active'|'closed'|'settled';
export type PartyEventActionV33='scout_route'|'secure_approach'|'support_expedition'|'prepare_finale';
export interface PartyEventSupplyStatusV33 {
 readonly stage:1|2|3;
 readonly itemId:string;
 readonly category:'wood'|'ore'|'herb';
 readonly kind:'required'|'optional';
 readonly target:number;
 readonly donated:number;
}
export interface PartyEventReadOnlyStatusV33 {
 readonly schema:'party-event-readonly-status-v33';
 readonly eventStartsAt:string;
 readonly eventEndsAt:string;
 readonly serverTime:string;
 readonly family:PartyEventFamilyV33;
 readonly variation:string;
 readonly difficulty:PartyEventDifficultyV33;
 readonly status:PartyEventStatusV33;
 readonly stage:1|2|3;
 readonly rosterSize:2|3|4;
 readonly completedActions:readonly PartyEventActionV33[];
 readonly orders:readonly PartyEventSupplyStatusV33[];
 readonly votes:{
  readonly stage2:string|null;
  readonly stage3:string|null;
  readonly myStage2Ballot:boolean;
  readonly myStage3Ballot:boolean;
 };
 readonly canClaim:false;
 readonly canContribute:false;
 readonly canFight:false;
}

export interface TrustedPrivatePartyStatusSqlV33 {
 queryOne(sql:typeof PARTY_EVENT_READONLY_STATUS_SQL_V33,
  params:readonly [string]):Promise<{snapshot:unknown}|null>;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=(x:unknown):x is Record<string,unknown>=>x!==null
 &&typeof x==='object'&&!Array.isArray(x);
const positiveInt=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const time=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const oneOf=<T extends string>(x:unknown,values:readonly T[]):x is T=>
 typeof x==='string'&&values.includes(x as T);

/** Fail closed on ambiguous or malformed private rows — no fake progress. */
export function parsePartyEventReadOnlyStatusV33(raw:unknown):PartyEventReadOnlyStatusV33 {
 if(!record(raw)||raw.schema!=='party-event-readonly-status-v33'
   ||!time(raw.eventStartsAt)||!time(raw.eventEndsAt)||!time(raw.serverTime)
   ||Date.parse(raw.eventEndsAt as string)-Date.parse(raw.eventStartsAt as string)!==604800000
   ||!oneOf(raw.family,['broken_caravan','nightfall_hunt','broken_wards','lost_reliquary'])
   ||!oneOf(raw.difficulty,['standard','veteran','heroic'])
   ||!oneOf(raw.status,['active','closed','settled'])
   ||typeof raw.stage!=='number'||![1,2,3].includes(raw.stage)
   ||typeof raw.rosterSize!=='number'||!Number.isInteger(raw.rosterSize)||raw.rosterSize<2||raw.rosterSize>4
   ||typeof raw.variation!=='string'||raw.variation.length<3||raw.variation.length>80
   ||raw.canClaim!==false||raw.canContribute!==false||raw.canFight!==false
   ||!Array.isArray(raw.completedActions)||raw.completedActions.length>4
   ||!Array.isArray(raw.orders)||raw.orders.length>120||!record(raw.votes))
  throw Error('party_event_v33_invalid_status');
 const actions=['scout_route','secure_approach','support_expedition','prepare_finale'] as const;
 if(raw.completedActions.some((a:unknown)=>!oneOf(a,actions))
   ||new Set(raw.completedActions).size!==raw.completedActions.length
   ||(raw.stage===1&&raw.completedActions.some((a:unknown)=>a!=='scout_route'))
   ||(raw.stage===2&&raw.completedActions.includes('prepare_finale')))
  throw Error('party_event_v33_invalid_actions');
 const orders:PartyEventSupplyStatusV33[]=[];
 const keys=new Set<string>();
 for(const value of raw.orders){
  if(!record(value)||![1,2,3].includes(value.stage as number)
   ||typeof value.itemId!=='string'||value.itemId.length<3||value.itemId.length>100
   ||!oneOf(value.category,['wood','ore','herb'])
   ||!oneOf(value.kind,['required','optional'])
   ||!positiveInt(value.target)||!(value.target as number)
   ||(value.target as number)>10000||!positiveInt(value.donated)
   ||(value.donated as number)>(value.target as number))
   throw Error('party_event_v33_invalid_order');
  const key=[value.stage,value.kind,value.itemId].join(':');
  if(keys.has(key))throw Error('party_event_v33_duplicate_order');
  keys.add(key);
  orders.push(value as unknown as PartyEventSupplyStatusV33);
 }
 const v=raw.votes;
 if((v.stage2!==null&&!(typeof v.stage2==='string'&&v.stage2.length<=80&&v.stage2.length>0))
   ||(v.stage3!==null&&!(typeof v.stage3==='string'&&v.stage3.length<=80&&v.stage3.length>0))
   ||typeof v.myStage2Ballot!=='boolean'||typeof v.myStage3Ballot!=='boolean'
   ||(raw.stage===1&&(v.stage2!==null||v.stage3!==null
     ||v.myStage2Ballot||v.myStage3Ballot))
   ||(raw.stage===2&&(v.stage3!==null||v.myStage3Ballot))
   ||(raw.stage===3&&v.stage2===null))
  throw Error('party_event_v33_invalid_vote');
 return raw as unknown as PartyEventReadOnlyStatusV33;
}
export function createPrivatePartyStatusReaderV33(db:TrustedPrivatePartyStatusSqlV33){
 return {
  async readForTrustedAccount(trustedAccountId:string):Promise<PartyEventReadOnlyStatusV33|null>{
   if(!uuid.test(trustedAccountId))throw Error('party_event_v33_invalid_trusted_account');
   const result=await db.queryOne(PARTY_EVENT_READONLY_STATUS_SQL_V33,[trustedAccountId]);
   return result===null?null:parsePartyEventReadOnlyStatusV33(result.snapshot);
  },
 };
}
