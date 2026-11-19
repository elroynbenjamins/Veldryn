/**
 * V77 hidden adapter: a single locked canonical Party Event settlement proof
 * to a V69 chest source. This module performs NO database or reward writes.
 *
 * readCanonicalSource(tx, accountId, sourceKey) in V70 must load the complete
 * V61 proof from the SAME SERIALIZABLE connection (not a caller JSON body).
 * The exact account+week+chest source identity is checked independently.
 */
import {
 deriveVerifiedPartyChestEvidenceV61,
 type PrivatePartyRewardProofV61,
} from './weekly-party-event-proof-v61';
import {
 partyChestLootTableV68,previewVerifiedPartyChestsV51,
} from './weekly-party-event-chests-v51';
import type {TrustedChestSourceV69} from '../loot/chest-reward-settlement-v69';

export const PARTY_EVENT_CHEST_SOURCE_V77_RELEASED=false;
export const PARTY_EVENT_CHEST_SOURCE_V77_VERSION='party-event-chest-source-v77' as const;

/** Only call with a DB-fetched, account-bound and settled V61 proof. */
export function resolveTrustedPartyChestSourceV77(input:{
 readonly authenticatedAccountId:string;
 readonly sourceKey:string;
 readonly proof:PrivatePartyRewardProofV61;
}):TrustedChestSourceV69{
 if(!input||typeof input.authenticatedAccountId!=='string'||
  typeof input.sourceKey!=='string')
  throw Error('party_event_v77_invalid_trusted_claim');
 // V61 checks frozen party/account/week identity, canonical V14 activity,
 // donation/finale receipt, roster and server-snapshot tier.
 const evidence=deriveVerifiedPartyChestEvidenceV61(
  input.proof,input.authenticatedAccountId,
 );
 const earned=previewVerifiedPartyChestsV51(evidence);
 const chest=earned.find(item=>item.chestId===input.sourceKey);
 if(!chest)
  throw Error('party_event_v77_unearned_or_foreign_chest');
 if(input.proof.roster.accountId!==evidence.accountId||
  input.proof.roster.eventStartsAtUtcMs!==evidence.eventStartsAtUtcMs)
  throw Error('party_event_v77_roster_identity_mismatch');
 return {
  sourceKey:chest.chestId,
  accountId:evidence.accountId,
  proofVersion:'party-event-proof-v61',
  earned:true,
  // This is a planned character destination. The V69 settler freezes null
  // mode/destination on a gear miss, or the verified character on a hit.
  recipientCharacterId:input.proof.roster.frozenCharacterId,
  equipmentDeliveryMode:'character',
  lootTable:partyChestLootTableV68({
   kind:chest.kind,family:evidence.family,difficulty:evidence.difficulty,
  }),
 };
}
