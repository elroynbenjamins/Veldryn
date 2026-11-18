/**
 * Party Events V35 — read-only staging schema readiness inspection.
 * NO migrations, schema writes, row data, or production modifications.
 * This audit must fail closed when hidden event tables are not installed.
 */
export const PARTY_EVENT_SCHEMA_V35_PROMOTED=false;
export const PARTY_EVENT_REQUIRED_COLUMNS_V35=[
 ['party_event_weeks_v11','party_id','uuid'],
 ['party_event_weeks_v11','event_starts_at','timestamptz'],
 ['party_event_weeks_v11','event_ends_at','timestamptz'],
 ['party_event_weeks_v11','family','text'],
 ['party_event_weeks_v11','active_stage','int2'],
 ['party_event_weeks_v11','status','text'],
 ['party_event_roster_v11','party_id','uuid'],
 ['party_event_roster_v11','event_starts_at','timestamptz'],
 ['party_event_roster_v11','account_id','uuid'],
 ['party_event_roster_v11','character_id','uuid'],
 ['party_event_receipts_v11','party_id','uuid'],
 ['party_event_receipts_v11','event_starts_at','timestamptz'],
 ['party_event_receipts_v11','account_id','uuid'],
 ['party_event_receipts_v11','action_id','text'],
 ['party_event_supply_orders_v16','party_id','uuid'],
 ['party_event_supply_orders_v16','event_starts_at','timestamptz'],
 ['party_event_supply_orders_v16','stage','int2'],
 ['party_event_supply_orders_v16','target_quantity','int4'],
 ['party_event_supply_orders_v16','donated_quantity','int4'],
 ['party_event_stages_v11','party_id','uuid'],
 ['party_event_stages_v11','event_starts_at','timestamptz'],
 ['party_event_stages_v11','stage','int2'],
 ['party_event_stages_v11','vote_choice','text'],
 ['party_event_stages_v11','vote_locked_at','timestamptz'],
 ['party_event_ballots_v17','party_id','uuid'],
 ['party_event_ballots_v17','event_starts_at','timestamptz'],
 ['party_event_ballots_v17','stage','int2'],
 ['party_event_ballots_v17','account_id','uuid'],
] as const;

export const PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35=`
with expected(table_name,column_name,expected_type) as (
 values
${PARTY_EVENT_REQUIRED_COLUMNS_V35.map(([table,col,type])=>
 "  ('"+table+"','"+col+"','"+type+"')").join(',\n')}
)
select e.table_name as "tableName",e.column_name as "columnName",
 e.expected_type as "expectedType",coalesce(t.typname,'') as "actualType",
 coalesce(c.relrowsecurity,false) as "rlsEnabled",
 case when c.oid is null then false
  else has_table_privilege('anon',c.oid,'SELECT') end as "anonCanRead",
 case when c.oid is null then false
  else has_table_privilege('authenticated',c.oid,'SELECT') end as "authenticatedCanRead"
from expected e
left join pg_catalog.pg_namespace n on n.nspname='private'
left join pg_catalog.pg_class c on c.relnamespace=n.oid
 and c.relname=e.table_name and c.relkind in ('r','p')
left join pg_catalog.pg_attribute a on a.attrelid=c.oid
 and a.attname=e.column_name and a.attnum>0 and not a.attisdropped
left join pg_catalog.pg_type t on t.oid=a.atttypid
order by e.table_name,e.column_name
` as const;

/** Default PostgreSQL PUBLIC EXECUTE grants count as exposed, even if RLS is on. */
export const PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35=`
select p.proname as "functionName" from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.proname like '%party_event%'
 and (
  has_function_privilege('anon',p.oid,'EXECUTE')
  or has_function_privilege('authenticated',p.oid,'EXECUTE')
 )
order by p.proname
` as const;
export interface PartyEventColumnAuditRowV35{
 readonly tableName:string;
 readonly columnName:string;
 readonly expectedType:string;
 readonly actualType:string;
 readonly rlsEnabled:boolean;
 readonly anonCanRead:boolean;
 readonly authenticatedCanRead:boolean;
}
export interface PartyEventUnsafeFunctionV35{readonly functionName:string;}
export interface TrustedPartySchemaInspectorV35{
 query(sql:typeof PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35):
  Promise<{rows:readonly PartyEventColumnAuditRowV35[]}>;
 query(sql:typeof PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35):
  Promise<{rows:readonly PartyEventUnsafeFunctionV35[]}>;
}
export interface PartyEventSchemaGateV35 {
 readonly ready:boolean;
 readonly missingOrMismatched:readonly string[];
 readonly unsafeGrants:readonly string[];
 readonly rolloutApproved:false;
}
export function evaluatePartyEventSchemaV35(
 columns:readonly PartyEventColumnAuditRowV35[],
 exposedFunctions:readonly PartyEventUnsafeFunctionV35[],
):PartyEventSchemaGateV35{
 const misses:string[]=[];
 const bad:string[]=[];
 const index=new Map<string,PartyEventColumnAuditRowV35>();
 for(const row of columns){
  const key=row.tableName+'.'+row.columnName;
  if(index.has(key)){misses.push('duplicate_audit_row:'+key);continue;}
  index.set(key,row);
 }
 for(const [table,col,type] of PARTY_EVENT_REQUIRED_COLUMNS_V35){
  const key=table+'.'+col,found=index.get(key);
  if(!found||found.expectedType!==type||found.actualType!==type)
   misses.push('column_missing_or_wrong_type:'+key+':'+type);
  if(found&&found.actualType===type){
   if(!found.rlsEnabled)bad.push('rls_disabled:'+table);
   if(found.anonCanRead||found.authenticatedCanRead)
    bad.push('player_table_access:'+table);
  }
 }
 if(columns.length!==PARTY_EVENT_REQUIRED_COLUMNS_V35.length)
  misses.push('unexpected_schema_audit_size');
 for(const entry of exposedFunctions){
  if(!entry||typeof entry.functionName!=='string'||!entry.functionName.includes('party_event'))
   bad.push('invalid_function_audit_row');
  else bad.push('public_function_execute:'+entry.functionName);
 }
 return {ready:misses.length===0&&bad.length===0,
  missingOrMismatched:[...new Set(misses)],
  unsafeGrants:[...new Set(bad)],rolloutApproved:false};
}
export async function inspectPrivatePartyEventSchemaV35(
 db:TrustedPartySchemaInspectorV35,
):Promise<PartyEventSchemaGateV35>{
 const [columns,exposures]=await Promise.all([
  db.query(PARTY_EVENT_SCHEMA_COLUMNS_SQL_V35),
  db.query(PARTY_EVENT_SCHEMA_FUNCTIONS_SQL_V35),
 ]);
 if(!columns||!Array.isArray(columns.rows)||!exposures
  ||!Array.isArray(exposures.rows))
  throw Error('party_event_v35_missing_schema_metadata');
 return evaluatePartyEventSchemaV35(columns.rows,exposures.rows);
}
