/** Hidden Party Events V44 — canonical node IDs must match the draft V13 allowlist. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261113064500_party_event_idle_scout_sources_v13.sql',
 import.meta.url),'utf8');
const packet=readFileSync(new URL(
 '../online/party-event-canonical-source-packet-v44.ts',import.meta.url),'utf8');
const content=readFileSync(new URL(
 '../online/party-event-canonical-supplies-v22.ts',import.meta.url),'utf8');
const expected=[
 ['GREENWOOD_TREE','woodcutting'],
 ['GREENFIELDS_COPPER_OUTCROP','mining'],
 ['DEWLEAF_PATCH','herbalism'],
];
assert.match(migration,/skill in \('mining','woodcutting','fishing','herbalism'\)/);
for(const [node,skill] of expected){
 assert.ok(migration.includes("('"+node+"','"+skill+"')"),
  node+' must have an explicit server-authorized v13 Stage 1 source');
 assert.ok(packet.includes("'"+node+"'"),
  node+' must remain part of the V44 runtime packet allowlist');
 assert.ok(content.includes("nodeId:'"+node+"'"),
  node+' must remain part of the verified V22 Level 1 starter catalogue');
}
assert.match(packet,/PARTY_EVENT_SOURCE_PACKET_V44_RELEASED=false/);
assert.match(packet,/writesAuthorized:false as const,eventPointsGranted:0 as const,rewardsGranted:false as const/);
assert.doesNotMatch(packet,/insert into|supabase\.rpc\(|service_role_key|fetch\(/i);
console.log('PARTY_EVENTS_V44_ALIGNMENT_OK: all three Level 1 sources, hidden SQL/online parity and zero release writes');
