/** Disposable PGlite test for the PRIVATE v33 one-statement read projection. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const source=readFileSync(fileURLToPath(new URL('../online/party-event-readonly-status-v33.ts',import.meta.url)),'utf8');
const marker='export const PARTY_EVENT_READONLY_STATUS_SQL_V33=';
const start=source.indexOf(marker);
if(start<0)throw Error('v33_sql_definition_missing');
const begin=source.indexOf('`',start)+1;
const end=source.indexOf('` as const;',begin);
if(begin<1||end<begin)throw Error('v33_sql_delimiter_missing');
const sql=source.slice(begin,end);
function must(value,message){if(!value)throw Error('party_event_v33_sql_'+message);}
const accountA='11111111-1111-4111-8111-111111111111';
const accountB='22222222-2222-4222-8222-222222222222';
const accountOther='33333333-3333-4333-8333-333333333333';
const partyA='44444444-4444-4444-8444-444444444444';
const partyOther='55555555-5555-4555-8555-555555555555';
const starts='2026-11-09T00:00:00+00:00';
const ends='2026-11-16T00:00:00+00:00';
const db=await PGlite.create();
try{
 await db.exec(`
 create schema private;
 create table private.party_event_weeks_v11(
  party_id uuid,event_starts_at timestamptz,event_ends_at timestamptz,
  family text,variation text,difficulty text,status text,active_stage integer);
 create table private.party_event_roster_v11(
  party_id uuid,event_starts_at timestamptz,account_id uuid);
 create table private.party_event_receipts_v11(
  party_id uuid,event_starts_at timestamptz,account_id uuid,action_id text);
 create table private.party_event_supply_orders_v16(
  party_id uuid,event_starts_at timestamptz,stage integer,
  item_id text,category text,kind text,target_quantity integer,donated_quantity integer);
 create table private.party_event_stages_v11(
  party_id uuid,event_starts_at timestamptz,stage integer,
  vote_choice text,vote_locked_at timestamptz);
 create table private.party_event_ballots_v17(
  party_id uuid,event_starts_at timestamptz,stage integer,account_id uuid);
 `);
 await db.query(`insert into private.party_event_weeks_v11 values
 ($1::uuid,$3::timestamptz,$4::timestamptz,'broken_caravan','bandits_crossing','standard','active',2),
 ($2::uuid,$3::timestamptz,$4::timestamptz,'lost_reliquary','vault_of_echoes','heroic','active',3)`,
 [partyA,partyOther,starts,ends]);
 await db.query(`insert into private.party_event_roster_v11 values
 ($1::uuid,$4::timestamptz,$2::uuid),($1::uuid,$4::timestamptz,$3::uuid),
 ($5::uuid,$4::timestamptz,$6::uuid)`,
 [partyA,accountA,accountB,starts,partyOther,accountOther]);
 await db.query(`insert into private.party_event_receipts_v11 values
 ($1::uuid,$3::timestamptz,$2::uuid,'scout_route'),
 ($4::uuid,$3::timestamptz,$5::uuid,'prepare_finale')`,
 [partyA,accountA,starts,partyOther,accountOther]);
 await db.query(`insert into private.party_event_supply_orders_v16 values
 ($1::uuid,$3::timestamptz,2,'IRON_ORE','ore','required',20,7),
 ($2::uuid,$3::timestamptz,3,'PRIVATE_OTHER_PARTY','wood','required',99,99)`,
 [partyA,partyOther,starts]);
 await db.query(`insert into private.party_event_stages_v11 values
 ($1::uuid,$3::timestamptz,2,'safe_pass',$4::timestamptz),
 ($2::uuid,$3::timestamptz,2,'deep_passage',$4::timestamptz)`,
 [partyA,partyOther,starts,'2026-11-10T00:00:00Z']);
 await db.query(`insert into private.party_event_ballots_v17 values
 ($1::uuid,$3::timestamptz,2,$2::uuid),
 ($4::uuid,$3::timestamptz,2,$5::uuid)`,
 [partyA,accountA,starts,partyOther,accountOther]);
 const a=await db.query(sql,[accountA]);
 must(a.rows.length===1,'one_enrolled_week');
 const data=a.rows[0].snapshot;
 must(data.schema==='party-event-readonly-status-v33','version');
 must(data.family==='broken_caravan'&&data.stage===2&&data.rosterSize===2,'account_scoped_week');
 must(data.completedActions.length===1&&data.completedActions[0]==='scout_route','own_receipts_only');
 must(data.orders.length===1&&data.orders[0].donated===7,'own_party_orders_only');
 must(data.votes.myStage2Ballot===true&&data.votes.stage2==='safe_pass','own_vote_status');
 must(data.canClaim===false&&data.canContribute===false&&data.canFight===false,'no_action_grants');
 must(!JSON.stringify(data).includes('PRIVATE_OTHER_PARTY'),'other_party_data_not_leaked');
 must(!JSON.stringify(data).includes(accountOther),'account_id_not_exported');
 const b=await db.query(sql,[accountB]);
 must(b.rows.length===1&&b.rows[0].snapshot.completedActions.length===0,'member_receipts_separate');
 must(b.rows[0].snapshot.votes.myStage2Ballot===false,'ballot_separate');
 const absent=await db.query(sql,['99999999-9999-4999-8999-999999999999']);
 must(absent.rows.length===0,'unknown_account_no_data');
 const c=await db.query(sql,[accountOther]);
 must(c.rows.length===1&&c.rows[0].snapshot.family==='lost_reliquary','separate_party_visible_to_owner');
 console.log('PARTY_EVENTS_V33_PGLITE_OK: private owner-scope, frozen roster, isolated receipts/votes, supply totals, no writes');
}finally{await db.close();}
