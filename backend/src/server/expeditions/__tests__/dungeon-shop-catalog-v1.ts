import {strict as assert} from 'node:assert';
import {
  DUNGEON_SHOP_CATALOG_V1,
  DUNGEON_SHOP_CATALOG_VERSION,
  dungeonShopOfferV1,
  dungeonShopQuoteV1,
  dungeonShopPurchasesEnabledV1,
  dungeonShopUtcWeekKey,
  validateDungeonShopCatalogV1,
  type DungeonShopAccountViewV1,
} from '../dungeon-shop-catalog-v1';

validateDungeonShopCatalogV1();
assert.equal(DUNGEON_SHOP_CATALOG_VERSION,'dungeon-marks-shop-v2-2026-11-11');
assert.equal(dungeonShopPurchasesEnabledV1(),true,'The DB global gate and per-SKU enabled flags authorize releases, not the client');
assert.equal(DUNGEON_SHOP_CATALOG_V1.length,17);
assert.equal(DUNGEON_SHOP_CATALOG_V1.filter(row=>row.permanent).length,12);
assert.equal(DUNGEON_SHOP_CATALOG_V1.filter(row=>row.perUtcWeek!==undefined).length,5);
assert.equal(new Set(DUNGEON_SHOP_CATALOG_V1.map(row=>row.id)).size,17);
assert.equal(new Set(DUNGEON_SHOP_CATALOG_V1.filter(row=>row.grant.kind==='profile_collectible').map(row=>row.grant.kind==='profile_collectible'?row.grant.rewardId:'')).size,12);
for(const region of ['Asterfall','Sunscar','Frostmarch']){
  const set=DUNGEON_SHOP_CATALOG_V1.filter(row=>row.firstClearRegion===region);
  assert.deepEqual(set.map(row=>row.marks),[500,950,1500,3000]);
  assert.equal(set.reduce((sum,row)=>sum+row.marks,0),5950);
  assert.deepEqual(set.map(row=>row.category),['icon','border','background','pet']);
  assert.equal(set.every(row=>row.permanent),true);
}
for(const offer of DUNGEON_SHOP_CATALOG_V1){
  if(offer.grant.kind==='profile_collectible'){
    if(offer.category==='icon')assert.equal(offer.grant.bonus,undefined);
    else{
      assert.equal(offer.grant.bonus?.ownedBps,50);
      assert.equal(offer.grant.bonus?.activeBps,offer.category==='pet'?300:200);
    }
  }else{
    assert.ok(offer.perUtcWeek!==undefined&&offer.perUtcWeek<=2,'No uncapped consumable spam');
    if(offer.grant.kind==='material')assert.equal(offer.grant.accountBound,true);
  }
}
const initial:DungeonShopAccountViewV1={
  marks:4000,clearedRegions:['Sunscar'],ownedRewardIds:[],purchasesThisUtcWeek:{},
};
assert.equal(dungeonShopQuoteV1('dshop_sunscar_pet',initial).status,'eligible');
assert.equal(dungeonShopQuoteV1('dshop_asterfall_icon',initial).status,'region_locked');
assert.equal(dungeonShopQuoteV1('dshop_asterfall_pet',{...initial,clearedRegions:['Asterfall'],marks:3000}).status,'eligible');
assert.equal(dungeonShopOfferV1('dshop_asterfall_pet')?.grant.kind,'profile_collectible');
assert.equal(dungeonShopQuoteV1('dshop_frostmarch_pet',initial).status,'region_locked');
assert.equal(dungeonShopQuoteV1('dshop_sunscar_pet',{...initial,ownedRewardIds:['DUNGEON_PET_SUNSCAR_001']}).status,'already_owned');
assert.equal(dungeonShopQuoteV1('dshop_sunscar_pet',{...initial,marks:1000}).status,'insufficient_marks');
assert.equal(dungeonShopQuoteV1('dshop_bondstone',{...initial,marks:500}).status,'insufficient_marks');
assert.equal(dungeonShopQuoteV1('dshop_bondstone',{...initial,marks:500},499).status,'eligible');
assert.equal(dungeonShopQuoteV1('dshop_bondstone',initial,900).price,900);
assert.throws(()=>dungeonShopQuoteV1('dshop_bondstone',initial,-1),/invalid_server_shop_price/);
assert.equal(dungeonShopQuoteV1('dshop_tempering_satchel',{...initial,purchasesThisUtcWeek:{dshop_tempering_satchel:1}}).remaining,1);
assert.equal(dungeonShopQuoteV1('dshop_tempering_satchel',{...initial,purchasesThisUtcWeek:{dshop_tempering_satchel:2}}).status,'weekly_limit');
assert.equal(dungeonShopQuoteV1('not_real',initial).status,'unknown_offer');
assert.equal(dungeonShopOfferV1('dshop_bondstone')?.marks,750);
assert.equal(dungeonShopUtcWeekKey(Date.UTC(2026,10,8,23,59)),'2026-11-02');
assert.equal(dungeonShopUtcWeekKey(Date.UTC(2026,10,9,0,0)),'2026-11-09');
assert.equal(dungeonShopUtcWeekKey(Date.UTC(2026,10,15,23,59)),'2026-11-09');
assert.equal(dungeonShopUtcWeekKey(Date.UTC(2026,10,16,0,0)),'2026-11-16');
assert.throws(()=>dungeonShopUtcWeekKey(NaN),/invalid_dungeon_shop_clock/);
console.log('Dungeon Marks Shop V1 hidden-catalogue tests passed');
