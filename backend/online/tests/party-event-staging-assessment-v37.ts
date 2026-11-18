import {
 assessHiddenPartyEventStagingV37, PARTY_EVENT_STAGING_V37_RELEASED,
} from '../party-event-staging-assessment-v37';
import type {PartyEventSchemaGateV35} from '../party-event-schema-readiness-v35';
function check(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_v37_test_'+label);
}
const base:PartyEventSchemaGateV35={
 ready:true,missingOrMismatched:[],unsafeGrants:[],rolloutApproved:false,
};
check(PARTY_EVENT_STAGING_V37_RELEASED===false,'feature_off');
const simulatedReady=assessHiddenPartyEventStagingV37({
 schema:base,migrationContractVerified:true,
});
check(simulatedReady.sourcesVerified,'real_greenfields_starter_sources');
check(simulatedReady.schemaVerified&&simulatedReady.dryRunReady,
 'structurally_ready_fixture');
check(simulatedReady.sourceAudit==='greenfields-verified-gathering-v22',
 'canonical_source_version');
check(simulatedReady.deployAuthorized===false
 &&simulatedReady.liveEventEnabled===false
 &&simulatedReady.rewardClaimsEnabled===false,
 'still_cannot_deploy_or_pay');
const missing=assessHiddenPartyEventStagingV37({
 schema:{...base,ready:false,missingOrMismatched:['party_event_weeks_v11.party_id']},
 migrationContractVerified:true,
});
check(!missing.dryRunReady
 &&missing.blockers.includes('private_schema_missing_or_insecure'),
 'staging_private_tables_absent_blocks');
const unsafe=assessHiddenPartyEventStagingV37({
 schema:{...base,unsafeGrants:['anon_execute:claim']},
 migrationContractVerified:true,
});
check(!unsafe.dryRunReady,'private_function_public_access_blocks');
const unverified=assessHiddenPartyEventStagingV37({
 schema:base,migrationContractVerified:false,
});
check(!unverified.dryRunReady
 &&unverified.blockers.includes('hidden_migration_contract_unverified'),
 'missing_immutable_migration_review_blocks');
check(unverified.deployAuthorized===false&&missing.deployAuthorized===false
 &&unsafe.rewardClaimsEnabled===false,'never_returns_permission');
console.log('PARTY_EVENTS_V37_STAGING_OK: Level 1 real gathering, schema, migration review and no authorization');
