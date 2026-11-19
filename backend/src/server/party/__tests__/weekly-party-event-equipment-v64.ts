import {
 PARTY_EVENT_EQUIPMENT_BRIDGE_V64_RELEASED,
 EQUIPMENT_V2_CURRENT_DRAFT_MAX_TIER_V64,
 planPartyEventEquipmentIssuanceV64,
 verifyPartyEventIssuedGearV64,
 type PartyEventItemIssuanceRequestV64,
 type PartyEventIssuerOutputV64,
} from '../weekly-party-event-equipment-v64';
import {
 PARTY_EVENT_GEAR_FAMILIES_V51,PARTY_EVENT_GEAR_PIECES_V51,
 partyEventGearForFamilyV51,
} from '../weekly-party-event-gear-v51';
import type {PartyChestTierV51} from '../weekly-party-event-chests-v51';

function ok(value:unknown,what:string):asserts value{
 if(!value)throw Error('party_event_equipment_v64_test:'+what);
}
function rejects(fn:()=>unknown,what:string){
 let failed=false;try{fn()}catch(e){failed=String(e).includes(what)}
 ok(failed,'reject_'+what);
}
const accountId='11111111-1111-4111-8111-111111111111';
const ownerCharacterId='22222222-2222-4222-8222-222222222222';
const eventStartsAtUtcMs=Date.UTC(2026,10,16);
const makeRequest=(piece=PARTY_EVENT_GEAR_PIECES_V51[0]!,tier:PartyChestTierV51=2):
 PartyEventItemIssuanceRequestV64=>({
 source:'trusted_party_reward_transaction',sourceKey:
 'party-event:'+eventStartsAtUtcMs+':'+accountId+':participation',
 accountId,ownerCharacterId,eventStartsAtUtcMs,piece,tier,
 classRestriction:null,rollPolicy:'equipment_v2_authoritative_quality_rarity_affixes',
 custodyPolicy:'same_account_transaction_or_rollback',
 sourceCatalogVersion:'party-event-gear-v51',
});
const request=makeRequest();
const output:PartyEventIssuerOutputV64={
 itemInstanceId:'33333333-3333-4333-8333-333333333333',
 pieceId:request.piece.id,setId:request.piece.setId,slot:request.piece.slot,
 family:request.piece.family,tier:request.tier,accountId,ownerCharacterId,
 eventStartsAtUtcMs,sourceKey:request.sourceKey,classRestriction:null,
 rarity:'rare',quality:67,exactStatSnapshotHash:'a'.repeat(64),
 exactItemReceiptVersion:'equipment-v2-event-audited-v1',
 canonicalLedgerValidated:true,sameTransactionCustodyCommitted:true,gemSockets:[],
};
ok(!PARTY_EVENT_EQUIPMENT_BRIDGE_V64_RELEASED,'hidden_default');
ok(EQUIPMENT_V2_CURRENT_DRAFT_MAX_TIER_V64===4,'draft_level_floor');
for(const family of PARTY_EVENT_GEAR_FAMILIES_V51){
 const pieces=partyEventGearForFamilyV51(family);
 ok(pieces.length===5,'five_pieces_'+family);
 for(const piece of pieces){
  const request=makeRequest(piece,3);
  const plan=planPartyEventEquipmentIssuanceV64(request);
  ok(!plan.readyForIssuance&&plan.blockers.includes('party_event_template_not_in_eq2_manifest')
   &&plan.blockers.includes('eq2_physical_custody_unverified'),
   'all_event_pieces_currently_blocked_'+piece.id);
 }
}
for(let tier=1;tier<=9;tier++){
 const plan=planPartyEventEquipmentIssuanceV64(makeRequest(
  request.piece,tier as PartyChestTierV51));
 ok(plan.blockers.includes('eq2_t5_to_t9_not_implemented')===(tier>4),
  'tier_gap_'+tier);
}
const verified=verifyPartyEventIssuedGearV64(request,output);
ok(verified.itemInstanceId===output.itemInstanceId&&
 verified.exactItemReceiptVersion===output.exactItemReceiptVersion,
 'frozen_identity_projection_only');
for(const [label,value] of Object.entries({
 ownerCharacterId:'44444444-4444-4444-8444-444444444444',
 accountId:'44444444-4444-4444-8444-444444444444',
 sourceKey:'party-event:untrusted:participation',
 tier:9,
 pieceId:'EQ2_FAKE_ITEM',
 setId:'PE_FAKE_SET',
 slot:'weapon',
 family:'lost_reliquary',
 rarity:'admin',
 quality:101,
 exactStatSnapshotHash:'not-a-sha',
 classRestriction:'TANK',
 canonicalLedgerValidated:false,
 sameTransactionCustodyCommitted:false,
 gemSockets:['unexpected'],
})){
 rejects(()=>verifyPartyEventIssuedGearV64(request,{
  ...output,[label]:value,
 } as PartyEventIssuerOutputV64),'forged_or_incomplete_item_receipt');
}
rejects(()=>planPartyEventEquipmentIssuanceV64({
 ...request,sourceKey:'party-event:'+eventStartsAtUtcMs+':'+accountId+':second-exchange',
}),'unverified_issuer_request');
rejects(()=>planPartyEventEquipmentIssuanceV64({
 ...request,ownerCharacterId:'not-uuid',
}),'unverified_issuer_request');
rejects(()=>planPartyEventEquipmentIssuanceV64({
 ...request,sourceCatalogVersion:'client' as 'party-event-gear-v51',
}),'unverified_issuer_request');
console.log('PARTY_EVENT_EQUIPMENT_V64_OK: 20 canonical pieces, all nine tiers, EQ2 T5–T9 gap, universal class, custody and forged-item denial');
