/** Disposable PGlite exercise of the actual V11 + V17 ballot functions and V112 chat binding.
 * Loads the exact ballot DDL/functions from the existing migration, not
 * unrelated supply/advancement dependencies. Never connects externally.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=name=>readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url),'utf8');
const v17=sql('20261113131000_party_event_stage_transitions_v17.sql');
function extract(start,end){
 const a=v17.indexOf(start),b=v17.indexOf(end,a);
 assert.ok(a>=0&&b>a,'canonical SQL definition missing');
 return v17.slice(a,b+end.length);
}
const db=await PGlite.create();
const uuid=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const party=uuid(10),a=uuid(1),b=uuid(2),c=uuid(3),outsider=uuid(4),msg=uuid(20),fake=uuid(21);
const starts=new Date(Date.now()-3600000).toISOString(),ends=new Date(Date.parse(starts)+7*86400000).toISOString();
const opened=new Date(Date.now()-60000).toISOString();
async function call(query,args){return (await db.query(query,args)).rows[0].result;}
const read=actor=>call('select private.read_party_event_chat_vote_v112($1,$2,$3) as result',[party,msg,actor]);
const chat=(actor,choice,message=msg)=>call('select private.cast_party_event_chat_ballot_v112($1,$2,$3,$4) as result',[party,message,actor,choice]);
const native=(actor,choice)=>call('select private.cast_party_event_ballot_v17($1,$2,2,$3,$4) as result',[party,starts,actor,choice]);
const resolve=()=>call('select private.resolve_party_event_ballot_v17($1,$2,2) as result',[party,starts]);
try{
 await db.exec(`
 create schema auth;create schema private;
 create role anon;create role authenticated;create role service_role;
 create table auth.users(id uuid primary key);
 create table public.parties(id uuid primary key,status text not null);
 create table public.characters(id uuid primary key,account_id uuid not null references auth.users(id),class_id text not null);
 create table public.party_members(party_id uuid,account_id uuid,left_at timestamptz);
 create table public.chat_messages(id uuid primary key,account_id uuid,channel_type text,channel_id text,is_system boolean);
 `);
 await db.exec(sql('20261113041500_party_event_receipt_ledger_v11.sql'));
 await db.exec(extract('create table private.party_event_ballots_v17 (','\n);'));
 await db.exec(extract('create or replace function private.party_event_ballot_choices_v112','\n$$;'));
 await db.exec(extract('create or replace function private.cast_party_event_ballot_v17','end;$$;'));
 await db.exec(extract('create or replace function private.resolve_party_event_ballot_v17','end;$$;'));
 await db.exec(sql('party-event-chat-ballot-v112-review.sql'));
 await db.query("insert into public.parties values($1,'active')",[party]);
 for(const [i,actor] of [a,b,c,outsider].entries()){
  await db.query('insert into auth.users values($1)',[actor]);
  await db.query("insert into public.characters values($1,$2,'WAYFINDER')",[uuid(100+i),actor]);
  if(actor!==outsider)await db.query('insert into public.party_members values($1,$2,null)',[party,actor]);
 }
 await db.query("insert into private.party_event_weeks_v11(party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty) values($1,$2,$3,'broken_caravan','bandits_crossing',0,'standard')",[party,starts,ends]);
 for(const [i,actor] of [a,b].entries())
  await db.query("insert into private.party_event_roster_v11 values($1,$2,$3,$4,'damage',$2)",[party,starts,actor,uuid(100+i)]);
 await db.query('insert into private.party_event_stages_v11(party_id,event_starts_at,stage,opened_at) values($1,$2,1,$2)',[party,starts]);
 await db.query('update private.party_event_weeks_v11 set active_stage=2 where party_id=$1',[party]);
 await db.query('insert into private.party_event_stages_v11(party_id,event_starts_at,stage,opened_at) values($1,$2,2,$3)',[party,starts,opened]);
 await db.query("insert into public.chat_messages values($1,null,'party',$2::text,true),($3,$4,'party',$2::text,false)",[msg,party,fake,a]);
 await db.query('insert into private.party_event_chat_vote_links_v112 values($1,$2,$3,2,$4)',[msg,party,starts,opened]);
 const initial=await read(a);
 assert.equal(initial.status,'pending');
 assert.equal(initial.eligibleCount,2);
 assert.equal(initial.eligibleToRespond,true);
 assert.deepEqual(initial.options,[{id:'safe_pass',votes:0},{id:'fast_pass',votes:0}]);
 assert.equal((await read(c)).eligibleToRespond,false,'new Party member not enrolled');
 await assert.rejects(read(outsider),/not_current_member/);
 await assert.rejects(chat(a,'safe_pass',fake),/unverified_message/);
 await assert.rejects(chat(c,'safe_pass'),/voter_not_enrolled/);
 await assert.rejects(chat(a,'wrong_choice'),/invalid_vote_choice/);
 assert.equal((await native(a,'safe_pass')).replayed,false);
 assert.equal((await read(a)).myVote,'safe_pass');
 assert.equal((await read(a)).eligibleToRespond,false);
 assert.equal((await chat(a,'safe_pass')).replayed,true,'native to chat same ballot');
 await assert.rejects(chat(a,'fast_pass'),/vote_already_cast/);
 await assert.rejects(resolve(),/vote_unresolved/);
 assert.equal((await chat(b,'safe_pass')).replayed,false);
 assert.equal((await native(b,'safe_pass')).replayed,true,'chat to native same ballot');
 assert.equal((await resolve()).reason,'majority');
 const closed=await read(b);
 assert.equal(closed.status,'completed');
 assert.equal(closed.selectedOptionId,'safe_pass');
 assert.equal(closed.eligibleToRespond,false);
 assert.equal(closed.options[0].votes,2);
 await db.query('update public.party_members set left_at=now() where account_id=$1',[b]);
 await assert.rejects(read(b),/not_current_member/);
 const n=(await db.query('select count(*)::int as n from private.party_event_ballots_v17')).rows[0].n;
 assert.equal(n,2);
 for(const role of ['anon','authenticated','service_role']){
  const allowed=(await db.query("select has_function_privilege($1,'private.cast_party_event_chat_ballot_v112(uuid,uuid,uuid,text)','execute') as allowed",[role])).rows[0].allowed;
  assert.equal(allowed,false);
 }
 console.log('PARTY_EVENT_CHAT_V112_SHARED_BALLOT_PASS');
}finally{await db.close();}
