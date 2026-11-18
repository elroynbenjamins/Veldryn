import {
 PARTY_EVENT_SECURITY_SWEEP_V41_RELEASED,
 PARTY_EVENT_PRIVATE_TABLES_V41,PARTY_EVENT_PRIVATE_FUNCTIONS_V41,
 PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41,PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41,
 evaluatePartyEventSecuritySweepV41,inspectPartyEventSecuritySweepV41,
 type PartyEventPrivateTableAuditV41,type PartyEventPrivateFunctionAuditV41,
} from '../party-event-security-sweep-v41';
function check(x:unknown,label:string):asserts x {
 if(!x)throw Error('party_event_v41_test_'+label);
}
const tables:PartyEventPrivateTableAuditV41[]=PARTY_EVENT_PRIVATE_TABLES_V41.map(tableName=>({
 tableName,rlsEnabled:true,anonCanTouch:false,authenticatedCanTouch:false,
}));
const functions:PartyEventPrivateFunctionAuditV41[]=PARTY_EVENT_PRIVATE_FUNCTIONS_V41.map(functionName=>({
 functionName,securityDefiner:true,settings:['search_path=""'],
 anonCanExecute:false,authenticatedCanExecute:false,
}));
function denied(t:readonly PartyEventPrivateTableAuditV41[],
 f:readonly PartyEventPrivateFunctionAuditV41[],part:string){
 const result=evaluatePartyEventSecuritySweepV41(t,f);
 check(result.safe===false&&result.problems.some(x=>x.includes(part)),
  'denied_'+part);
}
async function run(){
 check(PARTY_EVENT_SECURITY_SWEEP_V41_RELEASED===false,'not_released');
 check(tables.length===29&&functions.length===47,'complete_draft_inventory');
 check(PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41.includes("n.nspname='private'")
  &&PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41.includes("'UPDATE'")
  &&PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41.includes("'TRUNCATE'")
  &&PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41.includes('p.proconfig')
  &&PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41.includes('p.prosecdef'),
  'all_privilege_classes_audited');
 check(!/\b(insert|update|delete|alter|create|drop|grant|revoke)\s+(into|from|on|table|schema|function)\b/i.test(
  PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41+PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41),
  'no_writes_in_audit');
 const valid=evaluatePartyEventSecuritySweepV41(tables,functions);
 check(valid.safe&&valid.problems.length===0&&valid.relationCount===29&&valid.functionCount===47,
  'full_secure_inventory');
 check(!valid.migrationAuthorized&&!valid.playerAccessEnabled&&!valid.payoutAuthorized,'no_grants_even_on_pass');
 denied(tables.slice(1),functions,'missing_relation:');
 denied([...tables,tables[0]!],functions,'duplicate_relation:');
 denied([{...tables[0]!,rlsEnabled:false},...tables.slice(1)],functions,'rls_not_enabled:');
 denied([{...tables[0]!,authenticatedCanTouch:true},...tables.slice(1)],functions,'player_relation_privilege:');
 denied([{...tables[0]!,anonCanTouch:true},...tables.slice(1)],functions,'player_relation_privilege:');
 denied([{...tables[0]!,tableName:'unapproved_party_event_table'},...tables.slice(1)],functions,'unreviewed_relation:');
 denied(tables,functions.slice(1),'missing_function:');
 denied(tables,[...functions,functions[0]!],'duplicate_function:');
 denied(tables,[{...functions[0]!,anonCanExecute:true},...functions.slice(1)],'player_function_execute:');
 denied(tables,[{...functions[0]!,securityDefiner:false},...functions.slice(1)],'definer_missing_empty_search_path:');
 denied(tables,[{...functions[0]!,settings:['search_path=public']},...functions.slice(1)],'definer_missing_empty_search_path:');
 denied(tables,[{...functions[0]!,settings:[]},...functions.slice(1)],'definer_missing_empty_search_path:');
 denied(tables,[{...functions[0]!,functionName:'unapproved_party_event_function'},...functions.slice(1)],'unreviewed_function:');
 function query(sql:typeof PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41):Promise<{rows:readonly PartyEventPrivateTableAuditV41[]}>;
 function query(sql:typeof PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41):Promise<{rows:readonly PartyEventPrivateFunctionAuditV41[]}>;
 async function query(sql:typeof PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41|typeof PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41):
  Promise<{rows:readonly PartyEventPrivateTableAuditV41[]}|{rows:readonly PartyEventPrivateFunctionAuditV41[]}>{
  if(sql===PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41)return {rows:tables};
  if(sql===PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41)return {rows:functions};
  throw Error('unexpected audit query');
 }
 const db={query};
 const loaded=await inspectPartyEventSecuritySweepV41(db);
 check(loaded.safe,'trusted_readonly_inspection');
 console.log('PARTY_EVENTS_V41_SECURITY_OK: 29 private tables, 47 definer functions, full grant sweeps, no player exposure or payout approval');
}
void run().catch(e=>{console.error(e);process.exitCode=1;});
