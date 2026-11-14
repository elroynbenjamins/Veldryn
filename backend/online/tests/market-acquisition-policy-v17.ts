import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {draftCraftedGearInstance} from '../../../apps/mobile/src/core/crafted-gear-instances';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import type {CraftedGearInstance,GameState} from '../../../apps/mobile/src/core/types';
import {
 MARKET_ACQUISITION_RELEASED_V17,
 MARKET_EQUIPMENT_LEVEL_FLOORS_V17,MARKET_RARITY_LEVEL_PREMIUM_V17,
 previewMarketAcquisitionV17,type MarketTrustedCharacterSnapshotV17,
} from '../market-acquisition-policy-v17';

assert.equal(MARKET_ACQUISITION_RELEASED_V17,false);
assert.deepEqual(MARKET_EQUIPMENT_LEVEL_FLOORS_V17,{T1:6,T2:18,T3:30,T4:52});
assert.deepEqual(MARKET_RARITY_LEVEL_PREMIUM_V17,{
 common:0,uncommon:0,rare:2,epic:4,legendary:6,mythic:8,
});
const base=createCharacter(newGame(0),'IRONWARDEN','Market Buyer');
const accountId='market-v17-test-account';
const state:GameState={
 ...base,account:{...base.account,longTermAccountScopeId:accountId},
 character:{...base.character!,level:99,xp:characterTotalXpAtLevel(1)},
};
const source=JSON.stringify(state);
const snap:MarketTrustedCharacterSnapshotV17={
 accountId,activeCharacterId:state.character!.id,state,
};
const equip=(tier:string,rarity:CraftedGearInstance['rarity']='common')=>{
 const recipe=V33_EQUIPMENT_RECIPES.find(r=>
  r.v33EquipmentTier===tier&&r.classId==='IRONWARDEN'&&r.v33Path==='Foundation');
 assert(recipe,'Expected a known Forge equipment recipe for '+tier);
 const draft=draftCraftedGearInstance({
  itemId:recipe.output.itemId,ownerCharacterId:'seller-character',
  jobId:'market-v17-proof',createdAtMs:1234,roll:.51,
 });
 return {assetKind:'equipment' as const,itemId:recipe.output.itemId,quantity:1,
  exactReceipt:{...draft,rarity}};
};
const withLevel=(level:number,which:GameState=state):MarketTrustedCharacterSnapshotV17=>({
 accountId,activeCharacterId:which.character!.id,
 state:{...which,character:{...which.character!,level:99,
  xp:characterTotalXpAtLevel(level)}},
});
const thresholds=[['T1',6],['T2',18],['T3',30],['T4',52]] as const;
for(const [tier,floor] of thresholds){
 const offer=equip(tier);
 const realRequired=Math.max(floor,itemDef(offer.itemId).requiredLevel??0);
 assert(realRequired>=floor,'Market-only level is a minimum, not a gear-item override');
 const blocked=previewMarketAcquisitionV17(withLevel(realRequired-1),offer,'purchase');
 assert.equal(blocked.reason,'market_level_required');
 assert.equal(blocked.characterLevel,realRequired-1);
 assert.equal(blocked.requiredCharacterLevel,realRequired);
 assert.equal(blocked.meetsLevelRequirement,false);
 const eligible=previewMarketAcquisitionV17(withLevel(realRequired),offer,'purchase');
 assert.equal(eligible.reason,'market_disabled');
 assert.equal(eligible.meetsLevelRequirement,true);
 assert.equal(eligible.canTradeNow,false,'No hidden preview may enable trading');
 assert.equal(eligible.requiredCharacterLevel,realRequired);
}
const extraExamples=[
 ['T2','rare',20],['T3','epic',34],['T4','legendary',58],
 ['T4','mythic',60],
] as const;
for(const [tier,rarity,minimum] of extraExamples){
 const offer=equip(tier,rarity);
 const floor=MARKET_EQUIPMENT_LEVEL_FLOORS_V17[tier];
 const required=Math.max(floor,itemDef(offer.itemId).requiredLevel??0)
  +MARKET_RARITY_LEVEL_PREMIUM_V17[rarity];
 assert(required>=minimum,'Exact item requirements can exceed Market floor but not lower it');
 const under=previewMarketAcquisitionV17(withLevel(required-1),offer,'purchase');
 const ready=previewMarketAcquisitionV17(withLevel(required),offer,'purchase');
 assert.equal(under.requiredCharacterLevel,required);
 assert.equal(under.reason,'market_level_required');
 assert.equal(ready.requiredCharacterLevel,required);
 assert.equal(ready.reason,'market_disabled');
}
assert.equal(previewMarketAcquisitionV17(withLevel(100),equip('T5'),'purchase').reason,
 'market_tier_not_approved','T5 released gear is NOT an approved market tier');
assert.equal(previewMarketAcquisitionV17(withLevel(100),equip('T6'),'purchase').reason,
 'market_tier_not_approved');

const resource=(itemId:string)=>({assetKind:'resource' as const,itemId,quantity:5});
assert.equal(previewMarketAcquisitionV17(withLevel(19),resource('DUNEWOOD'),'purchase').reason,
 'market_level_required');
const dune=previewMarketAcquisitionV17(withLevel(20),resource('DUNEWOOD'),'purchase');
assert.equal(dune.requiredCharacterLevel,20);
assert.equal(dune.reason,'market_item_policy_unapproved');
assert.equal(dune.canTradeNow,false);
assert.equal(previewMarketAcquisitionV17(withLevel(20),resource('SUNSTONE_ORE'),'purchase').reason,
 'market_item_policy_unapproved');
assert.equal(previewMarketAcquisitionV17(withLevel(30),resource('FROSTIRON'),'purchase').reason,
 'market_level_required');
assert.equal(previewMarketAcquisitionV17(withLevel(99),resource('FROSTIRON'),'purchase').reason,
 'market_item_policy_unapproved');
assert.equal(previewMarketAcquisitionV17(withLevel(99),resource('RIMEGLASS'),'purchase').reason,
 'market_item_policy_unapproved','No tier inferred from sale prices or recipes');
assert.equal(previewMarketAcquisitionV17(withLevel(99),resource('NOT_A_REAL_ITEM'),'purchase').reason,
 'market_item_unrecognized');
assert.equal(previewMarketAcquisitionV17(withLevel(99),resource('HOLY_WATER'),'purchase').reason,
 'market_item_restricted');
assert.equal(previewMarketAcquisitionV17(withLevel(99),
 {...equip('T1'),exactReceipt:null},'purchase').reason,'market_gear_receipt_invalid');
assert.equal(previewMarketAcquisitionV17(withLevel(99),
 {...equip('T1'),quantity:2},'purchase').reason,'market_item_restricted');
const spoofed=equip('T1');
assert.equal(previewMarketAcquisitionV17(withLevel(99),
 {...spoofed,exactReceipt:{...spoofed.exactReceipt,rarity:'not_real' as 'mythic'}},
 'purchase').reason,'market_gear_receipt_invalid');

const alt=createCharacter(newGame(0),'IRONWARDEN','Low-level alt');
const parked=alt.character!;
const withAlt:GameState={...state,otherCharacters:[{
 character:{...parked,xp:characterTotalXpAtLevel(5),level:99},
 inventory:alt.inventory,overflow:alt.overflow,activity:null,
 skills:alt.skills,quests:alt.quests,currentRegionId:alt.currentRegionId,
}]};
assert.equal(previewMarketAcquisitionV17(withLevel(60,withAlt),equip('T4','mythic'),
 'purchase',parked.id).reason,'market_active_character_required',
 'A high-level main cannot buy for a lower-level alternate character');
const deliver=previewMarketAcquisitionV17(withLevel(60,withAlt),
 equip('T4','mythic'),'delivery',parked.id);
assert.equal(deliver.reason,'market_level_required',
 'Purchased copies must not be claimable by low-level alternates');
assert.equal(deliver.characterLevel,5);
assert.equal(previewMarketAcquisitionV17(withLevel(60,withAlt),
 equip('T4'),'delivery','other-account-character').reason,
 'market_character_not_owned');
assert.equal(previewMarketAcquisitionV17(withLevel(100),
 equip('T1'),'purchase','some-other-character').reason,
 'market_active_character_required');
const wrongClass=createCharacter(newGame(0),'BASTION','Wrong class');
const changed:GameState={...state,character:{...wrongClass.character!,
 id:state.character!.id,xp:characterTotalXpAtLevel(90)}};
assert.equal(previewMarketAcquisitionV17(withLevel(90,changed),
 equip('T1'),'purchase').reason,'market_class_required');
assert.equal(previewMarketAcquisitionV17({...snap,accountId:'attacker'},
 equip('T1'),'purchase').reason,'market_state_unverified');
assert.equal(previewMarketAcquisitionV17({...snap,activeCharacterId:'other'},
 equip('T1'),'purchase').reason,'market_state_unverified');
assert.equal(previewMarketAcquisitionV17({...snap,state:{
 ...state,character:{...state.character!,level:99,xp:-1},
}},equip('T1'),'purchase').reason,'market_character_xp_invalid');
assert.equal(previewMarketAcquisitionV17({...snap,state:{
 ...state,character:{...state.character!,level:99,xp:1.5},
}},equip('T1'),'purchase').reason,'market_character_xp_invalid');
assert.equal(previewMarketAcquisitionV17(withLevel(1),equip('T1'),'purchase').characterLevel,1);
assert.equal(JSON.stringify(state),source,'Preview must never mutate game state or Forge records');
console.log('market_v17_hidden_acquisition_policy_passed');
