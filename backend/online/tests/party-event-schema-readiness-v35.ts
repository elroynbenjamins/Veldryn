import {
 PARTY_EVENT_SCHEMA_V35_PROMOTED,
 PARTY_EVENT_REQUIRED_COLUMNS_V35,
 PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35,
 PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35,
 evaluatePartyEventSchemaV35,
} from '../party-event-schema-readiness-v35';
import type {PartyEventColumnAuditRowV35} from '../party-event-schema-readiness-v35';
function check(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_v35_test_'+label);
}
const sample:PartyEventColumnAuditRowV35[]=PARTY_EVENT_REQUIRED_COLUMNS_V35.map(
 ([tableName,columnName,type])=>({
  tableName,columnName,expectedType:type,actualType:type,
  rlsEnabled:true,anonCanRead:false,authenticatedCanRead:false,
 }));
check(PARTY_EVENT_SCHEMA_V35_PROMOTED===false,'unreleased');
check(PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35.includes("n.nspname='private'")
 &&PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35.includes('pg_catalog.pg_attribute')
 &&PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35.includes('has_table_privilege'),
 'read_only_pg_catalog');
check(PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35.includes("like '%party_event%'")
 &&PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35.includes('has_function_privilege'),
 'function_grant_audit');
check(!/\b(insert|update|delete|truncate|alter|create|drop|grant|revoke)\s+(into|from|on|table|schema|function)\b/i.test(
 PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35+PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35),'no_sql_writes');
const accepted=evaluatePartyEventSchemaV35(sample,[]);
check(accepted.ready===true&&accepted.rolloutApproved===false,
 'structural_gate_not_release_approval');
const empty=evaluatePartyEventSchemaV35([],[]);
check(!empty.ready&&empty.missingOrMismatched.length>0,
 'staging_missing_event_schema_fails_closed');
const missing=evaluatePartyEventSchemaV35(sample.slice(1),[]);
check(!missing.ready,'missing_column_denied');
const wrong=evaluatePartyEventSchemaV35(sample.map((row,i)=>i?row:
 {...row,actualType:'text'}),[]);
check(!wrong.ready,'wrong_type_denied');
const noRls=evaluatePartyEventSchemaV35(sample.map((row,i)=>i?row:
 {...row,rlsEnabled:false}),[]);
check(!noRls.ready&&noRls.unsafeGrants.some(x=>x.includes('rls_disabled')),
 'rls_off_denied');
const grants=evaluatePartyEventSchemaV35(sample.map((row,i)=>i?row:
 {...row,authenticatedCanRead:true}),[]);
check(!grants.ready,'authenticated_private_table_select_denied');
const functions=evaluatePartyEventSchemaV35(sample,[{functionName:'read_party_event_paid_inbox_v29'}]);
check(!functions.ready&&functions.unsafeGrants.some(x=>x.includes('public_function_execute')),
 'private_function_public_execute_denied');
const duplicates=evaluatePartyEventSchemaV35([...sample,sample[0]!],[]);
check(!duplicates.ready,'duplicated_metadata_denied');
check(accepted.missingOrMismatched.length===0&&accepted.unsafeGrants.length===0,
 'passing_fixture_clean');
console.log('PARTY_EVENTS_V35_SCHEMA_OK: read-only catalogue, strict types, RLS, anon grants, function exposure and missing-schema block');
