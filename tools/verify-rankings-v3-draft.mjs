import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const proposal=read('docs/roadmap/leaderboards-authoritative-scoring-v3-proposal.sql');
const tests=[
 'leaderboards_v3_scoring_contract.sql',
 'leaderboards_v3_privacy_fixture.sql',
 'leaderboards_v3_earned_journal_fixture.sql',
 'leaderboards_v3_profession_real_fixture.sql',
].map(file=>read('backend/supabase/tests/'+file));
const adapter=read('backend/src/server/rankings/supabase-ranking-repository.ts');
const count=text=>(proposal.match(new RegExp(text,'g'))??[]).length;
const contains=(text,message)=>assert.ok(proposal.includes(text),message);
assert.ok(proposal.includes('UNDEPLOYED scoring prototype'),'v3 must remain design-only SQL');
assert.equal(count('CREATE OR REPLACE FUNCTION'),2,'v3 defines exactly two functions');
assert.equal(count('COMMIT;'),1,'proposal carries only one transaction end');
assert.equal(count('BEGIN;'),1,'proposal carries only one transaction start');
contains("LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''",'SQL functions require fixed search paths');
contains('REVOKE ALL ON FUNCTION public.rankings_board_server_v3','public RPC must revoke default execute');
contains('REVOKE ALL ON FUNCTION private.rankings_verified_metrics_v3','private scorer must revoke default execute');
contains('TO service_role;','only service role may execute new functions');
contains('RETURN public.rankings_board_server_v2','Arena and Guild boards still use vetted v2 metrics');
contains('SELECT DISTINCT s.account_id,x.key AS milestone_id','Journal unlocks must not multiply between characters');
contains('SELECT DISTINCT ON (sr.account_id,sr.character_id,sr.skill_id)','profession snapshots must deduplicate character/skill');
contains('LEFT JOIN LATERAL (','guild metadata must not multiply scoreboard accounts');
contains('LIMIT 1','guild metadata must use a single deterministic row');
const ranked=proposal.indexOf('), ranked AS (');
const filtered=proposal.indexOf('), viewable AS (');
const paged=proposal.indexOf('), page AS (');
assert.ok(ranked>0&&ranked<filtered&&filtered<paged,'global rank then privacy filter then pagination');
assert.ok(adapter.includes('private readonly v3Enabled=false'),'v2 remains the default server path');
assert.ok(adapter.includes("'rankings_board_server_v3':'rankings_board_server_v2'"),'v3 is explicit opt-in');
assert.ok(tests.every(text=>text.includes('DO $')),'retain executable staging fixtures');
assert.ok(tests[0].includes('V3_GUILD_DEDUP_QUERY_MISSING'),'test duplicate guild membership');
assert.ok(tests[1].includes('REQUESTER_RANK_MOVED_AFTER_BLOCK'),'test stable ranks after reciprocal blocks');
assert.ok(tests[2].includes('JOURNAL_MULTISAVE_DEDUP_FAILED'),'test repeated Journal saves');
assert.ok(tests[3].includes('ACCOUNT_PROFESSION_TOTAL_INVALID'),'test actual saved account total and XP pairing');
console.log('rankings v3 staged SQL/read adapter safeguards PASS');
