/**
 * Party Events V41 — comprehensive private grant/definer inventory, read-only.
 *
 * V35 validates only 28 selected columns. A release audit must check EVERY
 * private Party Event relation/function, not infer safety from six tables.
 * Inventory is frozen from all 18 V11–V30 unpromoted migration drafts.
 * No DDL, event activation, data mutations, payouts or public route.
 */
export const PARTY_EVENT_SECURITY_SWEEP_V41_RELEASED=false;
export const PARTY_EVENT_PRIVATE_TABLES_V41=[
 "party_event_activity_credits_v14",
 "party_event_ballots_v17",
 "party_event_boss_candidates_v19",
 "party_event_boss_loadouts_v18",
 "party_event_boss_replay_attestations_v23",
 "party_event_claim_intents_v25",
 "party_event_claim_preflights_v25",
 "party_event_day8_reservations_v18",
 "party_event_finale_seals_v18",
 "party_event_gathering_activities_v13",
 "party_event_member_progress_v14",
 "party_event_paid_claim_inbox_v29",
 "party_event_paid_claim_receipts_v29",
 "party_event_receipts_v11",
 "party_event_reward_batches_v24",
 "party_event_reward_choices_v24",
 "party_event_reward_claim_quotes_v25",
 "party_event_reward_offers_v24",
 "party_event_reward_previews_v19",
 "party_event_roster_v11",
 "party_event_sources_v11",
 "party_event_special_credits_v15",
 "party_event_stage_seals_v17",
 "party_event_stage_transitions_v17",
 "party_event_stages_v11",
 "party_event_supply_catalogue_v16",
 "party_event_supply_donations_v16",
 "party_event_supply_orders_v16",
 "party_event_weeks_v11"
] as const;
export const PARTY_EVENT_PRIVATE_FUNCTIONS_V41=[
 "advance_party_event_stage_v17",
 "attest_party_event_boss_replay_v23",
 "cast_party_event_ballot_v17",
 "claim_party_event_reward_from_intent_v25",
 "claim_party_event_reward_v25",
 "credit_party_event_activity_v14",
 "credit_party_event_objective_v15",
 "donate_party_event_supply_v16",
 "freeze_party_event_supply_order_v16",
 "inspect_party_event_claim_lock_v30",
 "lock_party_event_reward_choice_v24",
 "party_event_append_only_v11",
 "party_event_boss_attestation_status_v23",
 "party_event_boss_candidate_status_v19",
 "party_event_boss_loadout_guard_v18",
 "party_event_claim_intents_inbox_v25",
 "party_event_claim_quote_inbox_v25",
 "party_event_day_eight_readiness_v18",
 "party_event_initial_week_guard_v17",
 "party_event_order_seal_guard_v17",
 "party_event_progress_immutable_v14",
 "party_event_reward_inbox_preview_v24",
 "party_event_reward_quote_v25",
 "party_event_reward_values_v25",
 "party_event_roster_guard_v11",
 "party_event_stage_guard_v11",
 "party_event_stage_readiness_v14",
 "party_event_stage_readiness_v15",
 "party_event_stage_readiness_v16",
 "party_event_stage_readiness_v17",
 "party_event_supply_order_guard_v16",
 "party_event_week_guard_v11",
 "prepare_party_event_claim_intent_v25",
 "prepare_party_event_claim_preflight_v25",
 "prepare_party_event_claim_quote_v25",
 "prepare_party_event_reward_offers_v24",
 "read_party_event_boss_replay_snapshot_v21",
 "read_party_event_paid_inbox_v29",
 "record_party_event_action_v11",
 "record_party_event_boss_candidate_v19",
 "record_party_event_canonical_action_v12",
 "record_party_event_idle_scout_v13",
 "reserve_party_event_day_eight_v18",
 "resolve_party_event_ballot_v17",
 "save_party_event_boss_loadout_v18",
 "seal_party_event_finale_v18",
 "seal_party_event_supplies_v17"
] as const;

export const PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41=`
select c.relname as "tableName",c.relrowsecurity as "rlsEnabled",
 ( has_table_privilege('anon',c.oid,'SELECT')
  or has_table_privilege('anon',c.oid,'INSERT')
  or has_table_privilege('anon',c.oid,'UPDATE')
  or has_table_privilege('anon',c.oid,'DELETE')
  or has_table_privilege('anon',c.oid,'TRUNCATE')
  or has_table_privilege('anon',c.oid,'REFERENCES')
  or has_table_privilege('anon',c.oid,'TRIGGER') ) as "anonCanTouch",
 ( has_table_privilege('authenticated',c.oid,'SELECT')
  or has_table_privilege('authenticated',c.oid,'INSERT')
  or has_table_privilege('authenticated',c.oid,'UPDATE')
  or has_table_privilege('authenticated',c.oid,'DELETE')
  or has_table_privilege('authenticated',c.oid,'TRUNCATE')
  or has_table_privilege('authenticated',c.oid,'REFERENCES')
  or has_table_privilege('authenticated',c.oid,'TRIGGER') ) as "authenticatedCanTouch"
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='private' and c.relkind in ('r','p')
 and c.relname like 'party_event_%'
order by c.relname
` as const;

export const PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41=`
select p.proname as "functionName",p.prosecdef as "securityDefiner",
 coalesce(p.proconfig,array[]::text[]) as "settings",
 has_function_privilege('anon',p.oid,'EXECUTE') as "anonCanExecute",
 has_function_privilege('authenticated',p.oid,'EXECUTE') as "authenticatedCanExecute"
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.proname like '%party_event%'
order by p.proname
` as const;

export interface PartyEventPrivateTableAuditV41{
 readonly tableName:string;readonly rlsEnabled:boolean;
 readonly anonCanTouch:boolean;readonly authenticatedCanTouch:boolean;
}
export interface PartyEventPrivateFunctionAuditV41{
 readonly functionName:string;readonly securityDefiner:boolean;
 readonly settings:readonly string[];
 readonly anonCanExecute:boolean;readonly authenticatedCanExecute:boolean;
}
export interface PartyEventSecuritySweepV41{
 readonly safe:boolean;
 readonly relationCount:number;readonly functionCount:number;
 readonly problems:readonly string[];
 readonly migrationAuthorized:false;
 readonly playerAccessEnabled:false;
 readonly payoutAuthorized:false;
}
export interface TrustedPrivatePartySecuritySqlV41{
 query(sql:typeof PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41):
  Promise<{rows:readonly PartyEventPrivateTableAuditV41[]}>;
 query(sql:typeof PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41):
  Promise<{rows:readonly PartyEventPrivateFunctionAuditV41[]}>;
}

/** Inspect exact inventory and ALL player privileges, not just SELECT. */
export function evaluatePartyEventSecuritySweepV41(
 tables:readonly PartyEventPrivateTableAuditV41[],
 functions:readonly PartyEventPrivateFunctionAuditV41[],
):PartyEventSecuritySweepV41{
 const issues:string[]=[];
 const expectedTables=new Set<string>(PARTY_EVENT_PRIVATE_TABLES_V41);
 const expectedFunctions=new Set<string>(PARTY_EVENT_PRIVATE_FUNCTIONS_V41);
 const seenTables=new Set<string>(),seenFunctions=new Set<string>();
 for(const table of tables){
  if(!table||typeof table.tableName!=='string'){
   issues.push('invalid_private_relation_metadata');continue;
  }
  const name=table.tableName;
  if(seenTables.has(name))issues.push('duplicate_relation:'+name);
  seenTables.add(name);
  if(!expectedTables.has(name))issues.push('unreviewed_relation:'+name);
  if(table.rlsEnabled!==true)issues.push('rls_not_enabled:'+name);
  if(table.anonCanTouch!==false||table.authenticatedCanTouch!==false)
   issues.push('player_relation_privilege:'+name);
 }
 for(const name of expectedTables)if(!seenTables.has(name))issues.push('missing_relation:'+name);
 for(const fn of functions){
  if(!fn||typeof fn.functionName!=='string'){
   issues.push('invalid_private_function_metadata');continue;
  }
  const name=fn.functionName;
  if(seenFunctions.has(name))issues.push('duplicate_function:'+name);
  seenFunctions.add(name);
  if(!expectedFunctions.has(name))issues.push('unreviewed_function:'+name);
  if(fn.anonCanExecute!==false||fn.authenticatedCanExecute!==false)
   issues.push('player_function_execute:'+name);
  // PostgreSQL stores SET search_path='' as search_path="" in proconfig.
  if(fn.securityDefiner!==true||!Array.isArray(fn.settings)||
   !fn.settings.some(value=>value==='search_path=""'||value==='search_path='))
   issues.push('definer_missing_empty_search_path:'+name);
 }
 for(const name of expectedFunctions)if(!seenFunctions.has(name))
  issues.push('missing_function:'+name);
 return {
  safe:issues.length===0,relationCount:tables.length,functionCount:functions.length,
  problems:[...new Set(issues)],
  migrationAuthorized:false,playerAccessEnabled:false,payoutAuthorized:false,
 };
}
export async function inspectPartyEventSecuritySweepV41(
 db:TrustedPrivatePartySecuritySqlV41,
):Promise<PartyEventSecuritySweepV41>{
 const [tables,functions]=await Promise.all([
  db.query(PARTY_EVENT_TABLE_PRIVILEGES_SQL_V41),
  db.query(PARTY_EVENT_FUNCTION_PRIVILEGES_SQL_V41),
 ]);
 if(!tables||!Array.isArray(tables.rows)||!functions||!Array.isArray(functions.rows))
  throw Error('party_event_v41_missing_security_metadata');
 return evaluatePartyEventSecuritySweepV41(tables.rows,functions.rows);
}
