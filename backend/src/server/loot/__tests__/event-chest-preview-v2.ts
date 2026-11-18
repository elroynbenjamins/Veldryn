import {
 EVENT_CHEST_REWARD_PANEL_V2_RELEASED,
 previewPartyEventTreasurePanelV2,previewWorldBossTreasurePanelV2,
} from '../event-chest-preview-v2';
function expect(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('event_chest_preview_v2:'+label);
}
expect(!EVENT_CHEST_REWARD_PANEL_V2_RELEASED,'never_live');
const start=Date.UTC(2026,10,16);
const evidence={
 accountId:'11111111-1111-4111-8111-111111111111',
 eventStartsAtUtcMs:start,
 family:'broken_wards' as const,difficulty:'standard' as const,
 personalPoints:15,contributedToPreparation:false,
 optionalPreparationGoalCompleted:false,verifiedFinaleVictory:true,
 eligibleGearTier:3 as const,
};
const party=previewPartyEventTreasurePanelV2({
 evidence,ownedPieceIds:['PE_RUNEBOUND_VIGIL_BOOTS'],
 trustedPartySigilsBalance:32,
});
expect(party.mode==='preview_only'&&party.context==='party_event',
 'nonpaying_panel');
expect(party.chests.length===3&&party.totalPossibleChests===3,
 'all_3_chest_cards_visible');
expect(party.chests[0]!.unlocked&&!party.chests[1]!.unlocked&&
 party.chests[2]!.unlocked,'preparation_still_locked');
expect(party.chests.map(x=>x.gearChancePercent).join(',')==='12,16,24',
 'exact_player_chest_odds');
expect(party.chests.every(x=>!x.showOpenButton&&!x.showClaimButton),
 'chest_buttons_hidden_until_entitlements');
expect(party.sets.length===2&&party.totalCollectiblePieces===5,
 'two_sets_five_pieces');
expect(party.sets.find(x=>x.size===3)!.collected===1,
 'missing_piece_collection_progress');
expect(party.sets.every(x=>x.bonuses.every(b=>!b.activeIfEquipped)),
 'do_not_claim_set_effects_active_based_on_collection');
expect(party.targetedExchangeCost===60&&!party.exchangeButtonEnabled&&
 party.day8RewardChoicesRemainSeparate,'exchange_and_choice_preserved');
const world=previewWorldBossTreasurePanelV2({
 evidence:{
  eventId:'22222222-2222-4222-8222-222222222222',
  accountId:evidence.accountId,bossId:'frostmarch',
  preparationGoalCompleted:true,personalCommittedDonations:1,
  committedAttempts:2,communityDamageGoalCompleted:true,
  personalProvenAttacks:2,
 },
 ownedGatheringGearSlots:['helmet','cape'],trustedWorldSigilsBalance:90,
});
expect(world.chests.length===3&&world.chests[0]!.unlocked&&
 !world.chests[1]!.unlocked&&world.chests[2]!.unlocked,
 'pending_third_attempt_displayed');
expect(world.chests.every(x=>x.gearChancePercent===1&&
 !x.showOpenButton&&!x.showClaimButton),'original_boss_1_percent_and_no_claim');
expect(world.pieces.length===10&&world.totalCollectiblePieces===10&&
 world.pieces.filter(x=>x.owned).length===2,'ten_piece_gathering_collection');
expect(world.gatheringSkill==='fishing'&&world.existingBossEquipmentUnchanged,
 'rimewarden_fishing_gear_unchanged');
expect(world.targetedExchangeCost===80&&!world.exchangeButtonEnabled&&
 world.worldSigilsBalance===90,'world_sigil_quote_no_purchase');
console.log('EVENT_CHEST_REWARD_PANEL_V2_OK: three visible cards, collection progress, exact odds, two Party sets, 10-slot world gear, no live actions');
