/**
 * Hidden Party Events V37 — staging release-readiness REPORT only.
 *
 * Revalidates the real game starter-gathering catalogue and rejects missing
 * private schema / unverified migration chain. It never approves deploying a
 * migration, enables a route, claims a reward or activates events.
 */
import type {PartyEventSchemaGateV35} from './party-event-schema-readiness-v35';
import {
 auditedGreenfieldsPartySuppliesV22,
 PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22,
} from './party-event-canonical-supplies-v22';

export const PARTY_EVENT_STAGING_V37_RELEASED=false;
export interface PartyEventStagingAssessmentV37 {
 readonly sourceAudit:typeof PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22;
 readonly sourcesVerified:boolean;
 readonly schemaVerified:boolean;
 readonly migrationContractVerified:boolean;
 readonly dryRunReady:boolean;
 readonly blockers:readonly string[];
 readonly deployAuthorized:false;
 readonly liveEventEnabled:false;
 readonly rewardClaimsEnabled:false;
}
export function assessHiddenPartyEventStagingV37(input:{
 schema:PartyEventSchemaGateV35;
 /** CI-only file-level verification, not authorization to run SQL. */
 migrationContractVerified:boolean;
}):PartyEventStagingAssessmentV37 {
 const blockers:string[]=[];
 const schema=input.schema;
 const schemaVerified=schema?.ready===true
  &&schema.rolloutApproved===false
  &&schema.missingOrMismatched.length===0
  &&schema.unsafeGrants.length===0;
 if(!schemaVerified)blockers.push('private_schema_missing_or_insecure');
 if(input.migrationContractVerified!==true)
  blockers.push('hidden_migration_contract_unverified');
 let sourcesVerified=false;
 try{
  const items=auditedGreenfieldsPartySuppliesV22();
  const approved=[
   ['GREENWOOD_LOG','wood'],['COPPER_ORE','ore'],['DEWLEAF','herb'],
  ] as const;
  sourcesVerified=items.length===approved.length
   &&approved.every(([itemId,category])=>
    items.filter(item=>item.itemId===itemId
     &&item.category===category&&item.unlocked===true
     &&item.tier==='common'&&Number.isSafeInteger(item.secondsPerUnit)
     &&item.secondsPerUnit>0).length===1);
 }catch{
  sourcesVerified=false;
 }
 if(!sourcesVerified)blockers.push('canonical_level1_sources_not_verified');
 return {
  sourceAudit:PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22,
  sourcesVerified,schemaVerified,
  migrationContractVerified:input.migrationContractVerified===true,
  dryRunReady:blockers.length===0,
  blockers,
  deployAuthorized:false,liveEventEnabled:false,rewardClaimsEnabled:false,
 };
}
