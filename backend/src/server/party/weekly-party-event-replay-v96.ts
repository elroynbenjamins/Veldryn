/**
 * Veldryn Party Events V96 — TEST-ONLY deterministic Day 8 replay gate.
 *
 * This does NOT mint or sign a V87 victory/tier certificate and cannot
 * authorize a chest, wallet, inventory, inbox or activity-point mutation.
 * Both simulations must bind to the same privately verified frozen event
 * and equipped-copy revisions; any replay divergence fails closed.
 */
import type {CombatInput} from '../combat/types';
import type {VerifiedV2EquipmentEffectSource} from
 '../combat/v2/equipment-trait-engine-authority';
import {enemyV2SnapshotDigest} from '../combat/v2/enemy-engine-authority';
import {
 simulateFrozenPartyEventEquipmentV92,
 type FrozenPartyEventV92Witness,type VerifiedPartyEventV92Ports,
} from './weekly-party-event-eq2-traits-v92';
import {
 reviewPartyEventCombatResultV95,
 type PartyEventCombatReviewV95,
} from './weekly-party-event-result-audit-v95';

export const PARTY_EVENT_REPLAY_V96_RELEASED=false;
export const PARTY_EVENT_REPLAY_V96_VERSION='party-event-replay-v96' as const;

export interface NonpayingPartyEventReplayV96 {
 readonly version:typeof PARTY_EVENT_REPLAY_V96_VERSION;
 readonly status:'deterministic_qa_replay';
 readonly replayCount:2;
 readonly identicalReplay:true;
 readonly independentlyCertified:false;
 readonly claimable:false;
 readonly rewardGranted:false;
 readonly sourceDigest:string;
 readonly audit:PartyEventCombatReviewV95;
}

/** No HTTP/Edge handler calls this. The injected callback is a QA contract,
 * not a real independently authenticated DB witness. */
export function reviewFrozenPartyEventReplayV96(input:{
 readonly witness:FrozenPartyEventV92Witness;
 readonly combat:CombatInput;
 readonly sources:readonly VerifiedV2EquipmentEffectSource[];
 readonly ports:VerifiedPartyEventV92Ports;
},qaEnabled=false):NonpayingPartyEventReplayV96 {
 if(!qaEnabled||PARTY_EVENT_REPLAY_V96_RELEASED||
   process.env.NODE_ENV==='production')
  throw Error('party_event_v96_unreleased');
 if(!input||!input.witness||!input.combat||
   !Array.isArray(input.sources)||!input.ports)
  throw Error('party_event_v96_invalid_source');
 const frozenDigest=enemyV2SnapshotDigest({
  witness:input.witness,combat:input.combat,sources:input.sources,
 });
 const first=simulateFrozenPartyEventEquipmentV92(input,true);
 const firstAudit=reviewPartyEventCombatResultV95({...input,result:first},true);
 if(enemyV2SnapshotDigest({
  witness:input.witness,combat:input.combat,sources:input.sources,
 })!==frozenDigest)
  throw Error('party_event_v96_frozen_source_modified');
 const second=simulateFrozenPartyEventEquipmentV92(input,true);
 const secondAudit=reviewPartyEventCombatResultV95({...input,result:second},true);
 if(enemyV2SnapshotDigest({
  witness:input.witness,combat:input.combat,sources:input.sources,
 })!==frozenDigest||
   firstAudit.resultDigest!==secondAudit.resultDigest||
   firstAudit.reviewDigest!==secondAudit.reviewDigest)
  throw Error('party_event_v96_replay_diverged');
 return {
  version:PARTY_EVENT_REPLAY_V96_VERSION,
  status:'deterministic_qa_replay',
  replayCount:2,identicalReplay:true,
  independentlyCertified:false,claimable:false,rewardGranted:false,
  sourceDigest:frozenDigest,audit:firstAudit,
 };
}
