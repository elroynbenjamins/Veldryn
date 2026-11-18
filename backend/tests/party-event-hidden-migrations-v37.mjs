/**
 * V37 static hidden SQL compatibility guard. No DB connections and no DDL.
 * Audits the draft migration dependency chain against the actual V35 reader
 * contract and the canonical starter gathering content.
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
const base='docs/roadmap/party-events/hidden-migrations/';
const files={
 v11:'20261113041500_party_event_receipt_ledger_v11.sql',
 v16:'20261113114000_party_event_supply_donations_v16.sql',
 v17:'20261113131000_party_event_stage_transitions_v17.sql',
 v22:'20261113184500_party_event_audited_herb_v22.sql',
 v29:'20261115173500_party_event_paid_receipt_inbox_v29.sql',
 v30:'20261115190000_party_event_locked_claim_snapshot_v30.sql',
 v45:'20261118143000_party_event_canonical_source_writer_v45.sql',
 v46:'20261118173000_party_event_source_outbox_v46.sql',
 v47:'20261118183000_party_event_source_leases_v47.sql',
 v48:'20261118194500_party_event_server_gateway_v48.sql',
};
const sql=Object.fromEntries(Object.entries(files).map(([key,path])=>
 [key,read(base+path)]));
const spec=read('backend/online/party-event-schema-readiness-v35.ts');
const rows=[...spec.matchAll(/\['(party_event_\w+)','(\w+)','(\w+)'\]/g)]
 .map(([,table,column,type])=>({table,column,type}));
assert.equal(rows.length,28,'V35 snapshot should have exactly 28 columns');
const parent={
 party_event_weeks_v11:'v11',party_event_roster_v11:'v11',
 party_event_receipts_v11:'v11',party_event_stages_v11:'v11',
 party_event_supply_orders_v16:'v16',party_event_ballots_v17:'v17',
};
const sqlTypes={int2:'smallint',int4:'integer',uuid:'uuid',
 timestamptz:'timestamptz',text:'text'};
for(const {table,column,type} of rows){
 const source=sql[parent[table]];
 assert.ok(source,'unknown V35 table '+table);
 const tableMarker='create table private.'+table+' (';
 const start=source.indexOf(tableMarker);
 assert.ok(start>=0,'draft missing expected table '+table);
 const end=source.indexOf('\n);',start);
 assert.ok(end>start,'draft table definition not terminated '+table);
 const body=source.slice(start+tableMarker.length,end);
 assert.match(body,new RegExp('(?:^|\\n)\\s*'+column+'\\s+'+sqlTypes[type]+'(?=\\s|,|\\))','m'),
  'V35 column/type mismatch '+table+'.'+column);
 assert.match(source,new RegExp('alter table private\\.'+table+' enable row level security;','i'),
  'private table must be RLS enabled: '+table);
}
assert.match(sql.v11,/revoke all on private\.party_event_weeks_v11/i);
assert.match(sql.v16,/revoke all on private\.party_event_supply_catalogue_v16/i);
assert.match(sql.v17,/revoke all on private\.party_event_stage_seals_v17/i);
assert.match(sql.v22,/values\('DEWLEAF','herb',true\)/i);
assert.match(sql.v22,/category='herb' and item_id<>'DEWLEAF'/i);
assert.match(sql.v16,/values\('THORN_SAP','herb',false\)/i);
const herbs=read('apps/mobile/src/content/herbalism.ts');
const skills=read('apps/mobile/src/content/skills.ts');
const v22=read('backend/online/party-event-canonical-supplies-v22.ts');
for(const [src,id,item] of [
 [herbs,'DEWLEAF_PATCH','DEWLEAF'],
 [skills,'GREENWOOD_TREE','GREENWOOD_LOG'],
 [skills,'GREENFIELDS_COPPER_OUTCROP','COPPER_ORE'],
]){
 const match=src.match(new RegExp('\\{id:\\x27'+id+'\\x27[^}]*\\}'));
 assert.ok(match,'missing source node '+id);
 const def=match[0];
 assert.ok(def.includes("itemId:'"+item+"'")
  &&def.includes("zoneId:'GREENFIELDS'")
  &&def.includes('unlockLevel:1'),
  'source renamed or level-gated '+id);
 assert.ok(v22.includes("nodeId:'"+id+"'")
  &&v22.includes("itemId:'"+item+"'"),
  'V22 adapter diverged from source '+id);
}
assert.match(sql.v29,/create table private\.party_event_paid_claim_receipts_v29/i);
assert.match(sql.v29,/create table private\.party_event_paid_claim_inbox_v29/i);
assert.match(sql.v30,/inspect_party_event_claim_lock_v30/i);
assert.match(sql.v45,/private\.commit_online_game_party_sources_v45/i);
assert.match(sql.v46,/private\.party_event_source_outbox_v46/i);
assert.match(sql.v47,/private\.lease_party_event_sources_v47/i);
assert.match(sql.v48,/public\.commit_online_game_party_sources_server_v48/i);
assert.match(sql.v48,/grant execute on function public\.commit_online_game_party_sources_server_v48\([\s\S]*?\)\s*to service_role/i);
const commitPreview=read('backend/online/party-event-gameplay-commit-v48.ts');
const gameplay=read('backend/online/gameplay.ts');
assert.match(commitPreview,/export const PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED=false;/,
 'V48 gameplay route must remain hidden pending staging approval');
assert.match(gameplay,/enableDraftBridge:PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED/,
 'normal gameplay must stay behind the shared release gate');
for(const [key,source] of Object.entries(sql)){
 assert.doesNotMatch(source,/\bgrant\s+(?:all|execute|select|insert|update|delete)\b[^;]*\bto\s+(?:public|anon|authenticated)\b/i,
  'unapproved player-facing permission '+key);
}
const executable=readdirSync(join(root,'backend/supabase/migrations'));
for(const filename of executable){
 assert.ok(!/20261113|20261115|20261118/.test(filename)||!filename.includes('party_event_'),
  'draft hidden Party Event migration mistakenly added to live migration path '+filename);
}
console.log('PARTY_EVENTS_V37_DRAFT_SQL_OK: 28 columns align, RLS/private grants, V45–V47 drafts hidden, V48 runtime OFF, source content aligned');
