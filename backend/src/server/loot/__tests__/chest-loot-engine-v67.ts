import {
 CHEST_LOOT_ENGINE_V67_RELEASED,CHEST_ROLL_MODULUS_V67,
 defineChestLootTableV67,resolveChestLootV67,deriveChestGroupRollsV67,
 type ChestLootTableV67,
} from '../chest-loot-engine-v67';
import {
 PARTY_EVENT_CHESTS_V51,partyChestGearChanceV51,partyChestLootTableV68,
 previewVerifiedPartyChestsV51,resolvePartyChestGearDraftV51,
 type VerifiedPartyChestEvidenceV51,
} from '../../party/weekly-party-event-chests-v51';
import {
 partyEventGearForFamilyV51,PARTY_EVENT_GEAR_FAMILIES_V51,
} from '../../party/weekly-party-event-gear-v51';
import {
 worldBossChestLootTableV68,previewVerifiedWorldBossChestsV58,
 resolveWorldBossChestGearDraftV58,WORLD_BOSS_GEAR_SLOTS_V58,
 type VerifiedWorldBossChestEvidenceV58,
} from '../../combat/world-boss-chests-v58';
function ok(value:unknown,reason:string):asserts value{
 if(!value)throw Error('chest_loot_v67_test:'+reason);
}
function rejects(fn:()=>unknown,reason:string){
 let caught=false;
 try{fn()}catch(e){caught=String(e).includes(reason)}
 ok(caught,'reject_'+reason);
}
ok(!CHEST_LOOT_ENGINE_V67_RELEASED,'unreleased');
ok(CHEST_ROLL_MODULUS_V67===10000,'one_roll_modulus');
const eventWeek=Date.UTC(2026,10,16),accountId='11111111-1111-4111-8111-111111111111';
const partyBase:VerifiedPartyChestEvidenceV51={
 accountId,eventStartsAtUtcMs:eventWeek,family:'broken_caravan',
 difficulty:'standard',personalPoints:60,contributedToPreparation:true,
 optionalPreparationGoalCompleted:true,verifiedFinaleVictory:true,eligibleGearTier:4,
};
const difficulties=['standard','veteran','heroic'] as const;
let parityChecks=0;
for(const family of PARTY_EVENT_GEAR_FAMILIES_V51){
 for(const difficulty of difficulties){
  const previews=previewVerifiedPartyChestsV51({
   ...partyBase,family,difficulty,
  });
  const expectedPieces=partyEventGearForFamilyV51(family);
  ok(previews.length===3&&expectedPieces.length===5,'legacy_party_catalog');
  for(const preview of previews){
   const table=partyChestLootTableV68({family,difficulty,kind:preview.kind});
   ok(table.groups.length===1&&table.groups[0]!.chanceBps===
    partyChestGearChanceV51(preview.kind,difficulty),
    'all_old_odds_stable');
   ok(table.groups[0]!.entries.map(x=>x.id).join('|')===
    expectedPieces.map(x=>x.id).join('|'),'piece_order_stable');
   const guar=Object.fromEntries(table.guarantees.map(x=>[x.id,x.quantity]));
   ok(guar.party_sigils===preview.guaranteed.partySigils&&
    guar.gold===preview.guaranteed.gold&&
    guar.gem_dust===preview.guaranteed.gemDust&&
    guar.companion_essence===preview.guaranteed.companionEssence,
    'party_guarantees_stable');
   for(const hitRoll of [0,table.groups[0]!.chanceBps-1,
    table.groups[0]!.chanceBps,9999]){
    for(const owned of [[],expectedPieces.slice(0,4).map(x=>x.id),
     expectedPieces.map(x=>x.id)]){
     const selectionRoll=9999;
     const legacy=resolvePartyChestGearDraftV51(preview,{
      gearRoll:hitRoll,pieceRoll:selectionRoll,ownedPieceIds:owned,
     });
     const generic=resolveChestLootV67(table,{
      rolls:[{groupId:'equipment',hitRoll,selectionRoll}],
      ownedDropIds:owned,
     });
     ok(legacy.piece?.id===(generic.groups[0]!.entryId??undefined)&&
      legacy.gearDropped===(generic.drops.length===1),
      'legacy_party_drop_exact_parity');
     parityChecks++;
    }
   }
  }
 }
}
const bosses=['hollowroot','sunscar','frostmarch'] as const;
const worldEvidence:VerifiedWorldBossChestEvidenceV58={
 eventId:'22222222-2222-4222-8222-222222222222',accountId,
 bossId:'hollowroot',preparationGoalCompleted:true,personalCommittedDonations:1,
 committedAttempts:3,communityDamageGoalCompleted:true,
 personalProvenAttacks:3,
};
for(const bossId of bosses){
 const previews=previewVerifiedWorldBossChestsV58({...worldEvidence,bossId});
 for(const preview of previews){
  const table=worldBossChestLootTableV68({bossId,kind:preview.kind});
  ok(table.groups[0]!.chanceBps===100&&
   table.groups[0]!.entries.length===10,'world_boss_one_percent_ten_items');
  const reward=Object.fromEntries(table.guarantees.map(x=>[x.id,x.quantity]));
  ok(reward.gold===preview.guaranteed.gold&&
   reward.gem_dust===preview.guaranteed.gemDust&&
   reward.companion_essence===preview.guaranteed.companionEssence&&
   reward.tempering_dust===preview.guaranteed.temperingDust,
   'world_boss_guarantees_untouched');
  for(const hitRoll of [0,99,100,9999]){
   for(const owned of [[],WORLD_BOSS_GEAR_SLOTS_V58.slice(0,9),
    WORLD_BOSS_GEAR_SLOTS_V58]){
    const slotRoll=9999;
    const legacy=resolveWorldBossChestGearDraftV58(preview,{
     hitRoll,slotRoll,ownedSlots:owned,
    });
    const generic=resolveChestLootV67(table,{
     rolls:[{groupId:'equipment',hitRoll,selectionRoll:slotRoll}],
     ownedDropIds:owned,
    });
    ok(legacy.selectedSlot===generic.groups[0]!.entryId,
     'world_boss_one_percent_slot_parity');
    parityChecks++;
   }
  }
 }
}
const future:ChestLootTableV67={
 tableId:'future_seasonal_event',version:'winter_rewards_v1',
 guarantees:[{id:'gold',quantity:1250},{id:'gift_token',quantity:2}],
 groups:[
  {id:'material',type:'material',chanceBps:10000,
   duplicatePolicy:'allow_duplicates',entries:[
    {id:'SEASONAL_ORE',weight:1},{id:'SEASONAL_WOOD',weight:3,quantity:5},
    {id:'SEASONAL_FISH',weight:6,quantity:2},
   ]},
  {id:'pet',type:'pet',chanceBps:500,
   duplicatePolicy:'unique_only',entries:[
    {id:'PET_SNOWFOX',weight:2},{id:'PET_MOONBEAR',weight:1},
   ]},
  {id:'cosmetic',type:'cosmetic',chanceBps:2500,
   duplicatePolicy:'prefer_unowned',entries:[
    {id:'LOOK_SCARF',weight:1},{id:'LOOK_CROWN',weight:1},
   ]},
 ],
};
const table=defineChestLootTableV67(future);
ok(Object.isFrozen(table)&&Object.isFrozen(table.groups)&&
 Object.isFrozen(table.groups[0]!.entries),'deep_frozen_table');
const result=resolveChestLootV67(table,{
 rolls:[
  {groupId:'material',hitRoll:0,selectionRoll:2},
  {groupId:'pet',hitRoll:499,selectionRoll:0},
  {groupId:'cosmetic',hitRoll:2499,selectionRoll:0},
 ],
 ownedDropIds:['PET_SNOWFOX','PET_MOONBEAR','LOOK_SCARF'],
});
ok(result.guarantees.length===2&&result.drops.length===2&&
 result.drops[0]!.entryId==='SEASONAL_WOOD'&&
 result.drops[0]!.quantity===5&&
 result.drops[1]!.entryId==='LOOK_CROWN'&&
 result.drops[1]!.quantity===1&&
 result.groups[1]!.hit&&result.groups[1]!.entryId===null,
 'future_multiple_independent_pools_and_unique_exhaustion');
const miss=resolveChestLootV67(table,{
 rolls:[
  {groupId:'material',hitRoll:0,selectionRoll:0},
  {groupId:'pet',hitRoll:500,selectionRoll:0},
  {groupId:'cosmetic',hitRoll:2500,selectionRoll:0},
 ],
 ownedDropIds:[],
});
ok(miss.drops.length===1&&miss.drops[0]!.entryId==='SEASONAL_ORE',
 'exact_chance_boundary_and_no_reroll');
const secret=new Uint8Array(32).fill(17);
const sourceKey='seasonal-event:11111111-1111-4111-8111-111111111111:reward';
const a=deriveChestGroupRollsV67({table,sourceKey,secret});
const b=deriveChestGroupRollsV67({table,sourceKey,secret});
const c=deriveChestGroupRollsV67({
 table:defineChestLootTableV67({...future,version:'winter_rewards_v2'}),
 sourceKey,secret,
});
ok(JSON.stringify(a)===JSON.stringify(b),'replay_derived_entropy_stable');
ok(a.length===3&&a.every(x=>x.hitRoll>=0&&x.hitRoll<10000&&
 x.selectionRoll>=0&&x.selectionRoll<10000),'independent_group_roll_range');
ok(JSON.stringify(a)!==JSON.stringify(c),'version_domains_entropy');
const afterOwnership=deriveChestGroupRollsV67({
 table,sourceKey,secret,ownedDropIds:['PET_SNOWFOX','LOOK_SCARF'],
});
ok(afterOwnership[1]!.selectionRoll<1&&
 afterOwnership[2]!.selectionRoll<1,
 'unbiased_future_selection_exact_missing_set_weight');
const materialRange=defineChestLootTableV67({...future,
 groups:[{...future.groups[0]!,entries:[
  {id:'A',weight:1},{id:'B',weight:2},
 ]}],
});
const materialDraws=deriveChestGroupRollsV67({
 table:materialRange,sourceKey,secret,
});
ok(materialDraws[0]!.selectionRoll<3,
 'future_weighted_HMAC_rejection_samples_exact_1_to_3');

rejects(()=>resolveChestLootV67(table,{
 rolls:[{groupId:'material',hitRoll:0,selectionRoll:0}],
 ownedDropIds:[],
}),'invalid_server_context');
rejects(()=>resolveChestLootV67(table,{
 rolls:[
  {groupId:'material',hitRoll:-1,selectionRoll:0},
  {groupId:'pet',hitRoll:0,selectionRoll:0},
  {groupId:'cosmetic',hitRoll:0,selectionRoll:0},
 ],
 ownedDropIds:[],
}),'invalid_roll');
rejects(()=>defineChestLootTableV67({...future,
 groups:[{...future.groups[0]!,chanceBps:10001}],
}),'invalid_group');
rejects(()=>defineChestLootTableV67({...future,
 groups:[{...future.groups[0]!,entries:[
  {id:'A',weight:9000},{id:'B',weight:9000},
 ]}],
}),'weight_budget_exceeded');
rejects(()=>defineChestLootTableV67({...future,
 groups:[future.groups[0]!,future.groups[0]!],
}),'invalid_group');
rejects(()=>defineChestLootTableV67({...future,
 groups:[{...future.groups[0]!,entries:[
  {id:'BAD_ZERO',weight:1,quantity:0},
 ]}],
}),'invalid_drop_quantity');
rejects(()=>defineChestLootTableV67({...future,
 groups:[{...future.groups[1]!,entries:[
  {id:'BAD_PET_BULK',weight:1,quantity:2},
 ]}],
}),'invalid_drop_quantity');
rejects(()=>deriveChestGroupRollsV67({table,sourceKey,
 secret:new Uint8Array(4)}),'invalid_server_entropy_contract');
console.log('CHEST_LOOT_V67_V68_OK: '+parityChecks+
 ' exact legacy parity scenarios; 12–29% Party / 1% World preserved; future weighted independent pools; unique/missing policy; immutable source version and domain-separated entropy');
