import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sql=load('docs/roadmap/leaderboards-party-guild-final-archives-v1-proposal.sql');
const fixture=load('backend/supabase/tests/leaderboards_final_party_guild_archive_fixture.sql');
for(const required of [
  'CREATE TABLE IF NOT EXISTS private.rankings_final_mode_settlement_receipts_v1',
  'CREATE TABLE IF NOT EXISTS private.rankings_final_mode_archives_v1',
  'CREATE TABLE IF NOT EXISTS private.rankings_final_mode_gates_v1',
  'ENABLE ROW LEVEL SECURITY',
  'REVOKE ALL ON TABLE private.rankings_final_mode_settlement_receipts_v1',
  'REVOKE ALL ON FUNCTION public.rankings_final_mode_seal_server_v1',
  'REVOKE ALL ON FUNCTION public.rankings_final_mode_history_server_v1',
  'GRANT EXECUTE ON FUNCTION public.rankings_final_mode_seal_server_v1',
  'TO service_role',
  'source_receipt_id uuid NOT NULL REFERENCES private.rankings_final_mode_settlement_receipts_v1(id)',
  'receipt.event_key=p_event_key',
  'receipt.metric=p_metric',
  'receipt.bracket=p_bracket',
  'receipt.event_ends_at=p_ends_at',
  'receipt.finalized_at=p_finalized_at',
  'receipt.entries_digest=pg_catalog.md5(p_entries::text)',
  'COMPETITIVE_FINAL_RECEIPT_NOT_REGISTERED',
  'CREATE TRIGGER rankings_archive_immutable_v1',
  'CREATE TRIGGER rankings_receipt_immutable_v1',
  'FINAL_RANKING_RECORD_IMMUTABLE',
  "VALUES('party_event',false),('guild_pve',false)",
]){
  assert.ok(sql.includes(required),'Missing final-mode history safeguard: '+required);
}
assert.equal(sql.match(/^BEGIN;$/gm)?.length,1,'one proposal start');
assert.equal(sql.match(/^COMMIT;$/gm)?.length,1,'one proposal end');
for(const test of [
  'FINAL_RECEIPTS_CLIENT_WRITABLE',
  'PROVISIONAL_PARTY_RESULT_WAS_SEALED',
  'FORGED_PARTY_RESULT_WAS_SEALED',
  'PARTY_FINAL_ARCHIVE_OVERWRITTEN',
  'DUPLICATE_PARTY_SETTLEMENT_ACCEPTED',
  'PUBLISHED_ARCHIVE_MUTATION_ACCEPTED',
  'CERTIFIED_RECEIPT_DELETION_ACCEPTED',
  'CERTIFIED_RECEIPT_TAMPER_ACCEPTED',
  'GUILD_PVE_FINAL_HISTORY_READ_INVALID',
]){
  assert.ok(fixture.includes(test),'Missing rollback-only staging test: '+test);
}
assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public.rankings_final_mode_seal_server_v1/g)||[]).length,1);
assert.ok(!sql.includes('GRANT INSERT ON TABLE private.rankings_final_mode_settlement_receipts_v1 TO authenticated'));
console.log('Party Event/Guild PvE final-score receipt attestation and immutability contracts PASS');
