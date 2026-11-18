import {
 PARTY_EVENT_GEAR_SETS_V51,PARTY_EVENT_GEAR_PIECES_V51,
 PARTY_EVENT_GEAR_FAMILIES_V51,PARTY_EVENT_GEAR_V51_RELEASED,
 partyEventSetsForFamilyV51,partyEventGearForFamilyV51,
 assertPartyEventGearCatalogV51,
} from '../weekly-party-event-gear-v51';
import {
 PARTY_EVENT_CHESTS_V51,PARTY_EVENT_CHESTS_V51_RELEASED,
 PARTY_EVENT_CHEST_MAX_V51,PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51,
 previewVerifiedPartyChestsV51,partyChestGearChanceV51,
 resolvePartyChestGearDraftV51,quotePartyGearExchangeV51,
 type VerifiedPartyChestEvidenceV51,
} from '../weekly-party-event-chests-v51';
function ensure(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('party_event_chests_v51_test:'+label);
}
function rejects(fn:()=>unknown,message:string){
 let failed=false;
 try{fn();}catch(e){failed=String(e).includes(message);}
 ensure(failed,'expected_exception_'+message);
}
ensure(!PARTY_EVENT_GEAR_V51_RELEASED&&!PARTY_EVENT_CHESTS_V51_RELEASED,
 'two_release_gates_off');
ensure(assertPartyEventGearCatalogV51(),'catalog_contract');
ensure(PARTY_EVENT_GEAR_SETS_V51.length===8,'eight_sets');
ensure(PARTY_EVENT_GEAR_PIECES_V51.length===20,'twenty_pieces');
ensure(PARTY_EVENT_CHESTS_V51.length===PARTY_EVENT_CHEST_MAX_V51,
 'exactly_three_chests');
for(const family of PARTY_EVENT_GEAR_FAMILIES_V51){
 const sets=partyEventSetsForFamilyV51(family);
 const gear=partyEventGearForFamilyV51(family);
 ensure(sets.length===2&&gear.length===5,'five_per_event_family');
 ensure(sets.some(x=>x.size===3)&&sets.some(x=>x.size===2),
  'one_three_and_one_two');
 ensure(new Set(gear.map(x=>x.slot)).size===5,'universal_nonoverlap_slots');
 ensure(gear.every(x=>x.universal&&x.source==='party_event_chest_or_exchange'),
  'all_universal_and_event_exclusive');
 ensure(sets.every(x=>x.bonuses.every(y=>y.effects.every(effect=>
  effect.kind!=='stat'||(effect.valueBps>0&&effect.valueBps<=500)))),
 'bounded_initial_stat_hypotheses');
}
const week=Date.UTC(2026,10,16);
const accountId='11111111-1111-4111-8111-111111111111';
const base:VerifiedPartyChestEvidenceV51={
 accountId,eventStartsAtUtcMs:week,family:'nightfall_hunt',
 difficulty:'standard',personalPoints:15,
 contributedToPreparation:false,optionalPreparationGoalCompleted:false,
 verifiedFinaleVictory:false,eligibleGearTier:3,
};
ensure(previewVerifiedPartyChestsV51({...base,personalPoints:14}).length===0,
 'full_reward_floor');
let current=previewVerifiedPartyChestsV51(base);
ensure(current.length===1&&current[0]!.kind==='participation','one_earned');
ensure(current[0]!.claimable===false&&current[0]!.granted===false,
 'preview_cannot_grant');
ensure(current[0]!.gearChanceBps===1200,'participation_baseline_12pct');
current=previewVerifiedPartyChestsV51({...base,
 contributedToPreparation:true,optionalPreparationGoalCompleted:false});
ensure(current.length===1,'no_prep_chest_without_goal');
current=previewVerifiedPartyChestsV51({...base,verifiedFinaleVictory:true});
ensure(current.length===2&&current[1]!.kind==='finale',
 'successful_finale_is_independent');
current=previewVerifiedPartyChestsV51({...base,
 contributedToPreparation:true,optionalPreparationGoalCompleted:true,
 verifiedFinaleVictory:true});
ensure(current.length===3,'all_three_chests');
ensure(new Set(current.map(x=>x.chestId)).size===3,'unique_account_week_sources');
ensure(current.reduce((sum,chest)=>sum+chest.guaranteed.partySigils,0)===34,
 '34_sigils_for_full_clear');
ensure(current.map(x=>x.gearChanceBps).join(',')==='1200,1600,2400',
 'base_chest_chances');
for(const chest of current){
 const chance=partyChestGearChanceV51(chest.kind,'heroic');
 ensure(chance>chest.gearChanceBps,'difficulty_only_lifts_drop_chance');
}
ensure(current.every(x=>x.eligibleGearTier===3),
 'character_tier_is_not_event_difficulty');
const first=current[0]!;
const miss=resolvePartyChestGearDraftV51(first,{
 gearRoll:1200,pieceRoll:0,ownedPieceIds:[],
});
ensure(!miss.gearDropped&&miss.piece===null,'do_not_reroll_missed_gear');
const pieces=partyEventGearForFamilyV51(base.family);
const hit=resolvePartyChestGearDraftV51(first,{
 gearRoll:0,pieceRoll:9999,ownedPieceIds:pieces.slice(0,4).map(x=>x.id),
});
ensure(hit.gearDropped&&hit.piece?.id===pieces[4]!.id,
 'new_piece_preferred_when_only_one_missing');
ensure(hit.gearTier===3&&hit.affixes==='defer_to_equipment_2_0_server_roller',
 'equipment_2_0_resolves_rolls_not_chest');
const allOwned=resolvePartyChestGearDraftV51(first,{
 gearRoll:0,pieceRoll:0,ownedPieceIds:pieces.map(x=>x.id),
});
ensure(allOwned.gearDropped&&allOwned.piece?.id===pieces[0]!.id,
 'after_collection_repeat_quality_chase');
rejects(()=>resolvePartyChestGearDraftV51(first,{
 gearRoll:-1,pieceRoll:0,ownedPieceIds:[]}),
 'invalid_server_roll');
rejects(()=>resolvePartyChestGearDraftV51(first,{
 gearRoll:0,pieceRoll:10000,ownedPieceIds:[]}),
 'invalid_server_roll');
rejects(()=>previewVerifiedPartyChestsV51({...base,eligibleGearTier:10 as 3}),
 'invalid_trusted_evidence');
rejects(()=>previewVerifiedPartyChestsV51({...base,
 eventStartsAtUtcMs:week+86400000}), 'invalid_trusted_evidence');
const quote=quotePartyGearExchangeV51({
 family:base.family,requestedPieceId:pieces[4]!.id,trustedBalance:60,
 alreadyExchangedThisEvent:false,ownedPieceIds:pieces.slice(0,4).map(x=>x.id),
});
ensure(quote.available&&quote.collectionMissing&&quote.partySigilsCost===60
 &&!quote.buyEnabled,'sixty_sigil_missing_piece_preview');
ensure(!quotePartyGearExchangeV51({
 family:base.family,requestedPieceId:pieces[4]!.id,trustedBalance:59,
 alreadyExchangedThisEvent:false,ownedPieceIds:[],
}).available,'insufficient_currency');
ensure(!quotePartyGearExchangeV51({
 family:base.family,requestedPieceId:pieces[4]!.id,trustedBalance:1000,
 alreadyExchangedThisEvent:true,ownedPieceIds:[],
}).available,'one_exchange_per_week');
rejects(()=>quotePartyGearExchangeV51({
 family:'broken_caravan',requestedPieceId:pieces[4]!.id,trustedBalance:1000,
 alreadyExchangedThisEvent:false,ownedPieceIds:[],
}), 'piece_not_in_current_family');
console.log('PARTY_EVENT_CHESTS_V51_OK: 8 sets / 20 universal pieces, three locked chest sources, fair missing-piece rolls, 60-Sigil quotes, Equipment 2.0 deferred');
