import {
 WORLD_BOSS_CHESTS_V58_RELEASED,WORLD_BOSS_CHESTS_PER_ACCOUNT_EVENT_V58,
 WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58,
 WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58,WORLD_BOSS_GEAR_SLOTS_V58,
 WORLD_BOSS_GATHERING_SET_POLICY_V58,WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58,
 previewVerifiedWorldBossChestsV58,resolveWorldBossChestGearDraftV58,
 quoteWorldBossGearExchangeV58,type VerifiedWorldBossChestEvidenceV58,
} from '../world-boss-chests-v58';
function check(ok:unknown,message:string):asserts ok{
 if(!ok)throw Error('world_boss_chests_v58:'+message);
}
function throws(fn:()=>unknown,code:string){
 let failed=false;
 try{fn();}catch(e){failed=String(e).includes(code);}
 check(failed,'expected_'+code);
}
check(!WORLD_BOSS_CHESTS_V58_RELEASED,'hidden_gate');
check(WORLD_BOSS_CHESTS_PER_ACCOUNT_EVENT_V58===3,'three_chests');
check(WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58===100,'unchanged_one_percent');
check(WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58===10,'ten_pieces_per_boss');
check(WORLD_BOSS_GEAR_SLOTS_V58.length===10&&
 new Set(WORLD_BOSS_GEAR_SLOTS_V58).size===10,'ten_unique_slots');
const bosses=['hollowroot','sunscar','frostmarch'] as const;
check(WORLD_BOSS_GATHERING_SET_POLICY_V58.hollowroot.skill==='woodcutting',
 'forest_woodcutting');
check(WORLD_BOSS_GATHERING_SET_POLICY_V58.sunscar.skill==='mining',
 'desert_mining');
check(WORLD_BOSS_GATHERING_SET_POLICY_V58.frostmarch.skill==='fishing',
 'frost_fishing');
const e:VerifiedWorldBossChestEvidenceV58={
 eventId:'11111111-1111-4111-8111-111111111111',
 accountId:'22222222-2222-4222-8222-222222222222',
 bossId:'hollowroot',preparationGoalCompleted:true,
 personalCommittedDonations:1,committedAttempts:3,
 communityDamageGoalCompleted:true,personalProvenAttacks:3,
};
for(const bossId of bosses){
 const all=previewVerifiedWorldBossChestsV58({...e,bossId});
 check(all.length===3,'three_only_per_event_for_'+bossId);
 check(new Set(all.map(x=>x.chestId)).size===3,'unique_account_event_keys');
 check(all.every(x=>x.gearChanceBps===100&&x.gearPiecesInSet===10&&
  x.worldSigilsGrantedByThisChest===0&&x.claimable===false&&
  x.granted===false), 'no_sigils_double_credit_no_paid_preview');
 check(all.every(x=>x.gearSetSkill===WORLD_BOSS_GATHERING_SET_POLICY_V58[bossId].skill),
  'boss_gear_specialization_preserved');
}
check(previewVerifiedWorldBossChestsV58({...e,committedAttempts:2,personalProvenAttacks:2}).length===2,
 'not_all_three_attempts_done');
check(previewVerifiedWorldBossChestsV58({...e,
 preparationGoalCompleted:true,personalCommittedDonations:0}).length===2,
 'donation_qualified_personally');
check(previewVerifiedWorldBossChestsV58({...e,
 personalProvenAttacks:0}).length===2,
 'donation_only_cannot_claim_community_chest');
check(previewVerifiedWorldBossChestsV58({...e,
 preparationGoalCompleted:false,committedAttempts:0,
 communityDamageGoalCompleted:false,personalProvenAttacks:0}).length===0,
 'no_unearned_chests');
const chest=previewVerifiedWorldBossChestsV58(e)[0]!;
const unsuccessful=resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:100,slotRoll:0,ownedSlots:[],
});
check(!unsuccessful.gearDropped&&unsuccessful.selectedSlot===null,
 'one_percent_hit_roll_boundary');
let worldGearHits=0;
for(let roll=0;roll<10000;roll++){
 if(resolveWorldBossChestGearDraftV58(chest,{
  hitRoll:roll,slotRoll:0,ownedSlots:[],
 }).gearDropped)worldGearHits++;
}
check(worldGearHits===100,'exactly_one_percent_over_complete_roll_space');
const hit=resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:99,slotRoll:7000,ownedSlots:WORLD_BOSS_GEAR_SLOTS_V58.slice(0,9),
});
check(hit.gearDropped&&hit.selectedSlot==='ring','missing_slot_protection');
check(hit.gearGeneration===
 'keep_existing_world_boss_equipment_stats_tier_rarity_quality_and_rolls',
 'gathering_gear_stats_quality_rarity_unchanged');
const repeated=resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:0,slotRoll:0,ownedSlots:WORLD_BOSS_GEAR_SLOTS_V58,
});
check(repeated.selectedSlot==='helmet','after_collection_keep_rolled_duplicates');
throws(()=>resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:0,slotRoll:10000,ownedSlots:[],
}), 'invalid_server_roll');
throws(()=>resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:0,slotRoll:0,ownedSlots:['wings' as 'helmet'],
}), 'invalid_server_roll');
throws(()=>previewVerifiedWorldBossChestsV58({...e,committedAttempts:4}),
 'invalid_canonical_evidence');
const exchange=quoteWorldBossGearExchangeV58({
 bossId:'sunscar',slot:'amulet',worldSigilBalance:80,
 alreadyExchangedForEvent:false,ownedSlots:[],
});
check(exchange.exchangeAvailable&&exchange.collectionMissing&&
 exchange.cost===80&&exchange.usesExistingWorldSigils&&
 exchange.purchaseEnabled===false,'world_sigil_quote_not_spend');
check(!quoteWorldBossGearExchangeV58({
 bossId:'sunscar',slot:'amulet',worldSigilBalance:79,
 alreadyExchangedForEvent:false,ownedSlots:[],
}).exchangeAvailable,'insufficient_world_sigils');
check(!quoteWorldBossGearExchangeV58({
 bossId:'sunscar',slot:'amulet',worldSigilBalance:100,
 alreadyExchangedForEvent:true,ownedSlots:[],
}).exchangeAvailable,'one_world_exchange_per_event');
throws(()=>resolveWorldBossChestGearDraftV58({
 ...chest,guaranteed:{...chest.guaranteed,gold:999999},
},{hitRoll:0,slotRoll:0,ownedSlots:[]}),
 'invalid_server_roll');
throws(()=>resolveWorldBossChestGearDraftV58({
 ...chest,chestId:'world-boss:forged-source:donations_goal',
},{hitRoll:0,slotRoll:0,ownedSlots:[]}),
 'invalid_server_roll');
throws(()=>resolveWorldBossChestGearDraftV58(chest,{
 hitRoll:0,slotRoll:0,ownedSlots:['helmet','helmet'],
}), 'invalid_server_roll');
console.log('WORLD_BOSS_CHESTS_V58_OK: original 3x10 gathering sets, 1% intact, canonical 3 account chests, no duplicate World Sigils, fair missing-slot quotes');
