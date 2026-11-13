/**
 * Dungeon Marks Shop catalogue. Server validates IDs, while PostgreSQL owns
 * live prices, weekly caps, entitlements and the global release switch.
 * Only preverified account-bound SKUs can be enabled in the database; the
 * remainder stay preview-only until art and reward provenance are complete.
 */
export const DUNGEON_SHOP_LIVE_V1 = true as const;
export const DUNGEON_SHOP_CATALOG_VERSION = 'dungeon-marks-shop-v2-2026-11-11' as const;

export type DungeonShopRegion = 'Asterfall' | 'Sunscar' | 'Frostmarch';
export type DungeonShopCategory = 'supply' | 'companion' | 'icon' | 'border' | 'background' | 'pet';
export type DungeonShopBonusTarget =
  | 'craftingSpeed' | 'skillXp' | 'dropChance' | 'gatheringYield' | 'hp' | 'healingEffectiveness'
  | 'fishingSpeed' | 'defense' | 'actionSpeed';
export type DungeonShopGrant =
  | {kind:'material'; itemId:'TEMPERING_DUST'|'GEM_DUST'|'TEMPERING_CORE'; quantity:number; accountBound:true}
  | {kind:'account_resource'; field:'companionEssence'|'bondstones'; quantity:number}
  | {kind:'profile_collectible'; accountField:'unlockedProfileIconIds'|'unlockedProfileBorderIds'|'unlockedProfileBackgroundIds'|'unlockedCosmeticPetIds'; rewardId:string; rarity:'Rare'|'Epic'; bonus?:{target:DungeonShopBonusTarget; ownedBps:50; activeBps:200|300}};

export interface DungeonShopOfferV1 {
  readonly id:string;
  readonly name:string;
  readonly category:DungeonShopCategory;
  readonly marks:number;
  readonly grant:DungeonShopGrant;
  /** A full authenticated account clear from this region; no client-side flag. */
  readonly firstClearRegion?:DungeonShopRegion;
  /** Real UTC calendar-week purchases; permanent cosmetics omit this. */
  readonly perUtcWeek?:number;
  readonly permanent?:true;
}

/** Utility SKUs are intentionally capped and lower than real dungeon drops.
 * No finished equipment, high-grade gems, boss-unique materials or Gold. */
export const DUNGEON_SHOP_CATALOG_V1:readonly DungeonShopOfferV1[] = Object.freeze([
  {id:'dshop_tempering_satchel',name:'Delver Tempering Satchel',category:'supply',marks:120,perUtcWeek:2,grant:{kind:'material',itemId:'TEMPERING_DUST',quantity:10,accountBound:true}},
  {id:'dshop_gem_dust_cache',name:'Gem Dust Cache',category:'supply',marks:240,perUtcWeek:1,grant:{kind:'material',itemId:'GEM_DUST',quantity:8,accountBound:true}},
  {id:'dshop_tempering_core_cache',name:'Tempering Core Cache',category:'supply',marks:450,perUtcWeek:1,grant:{kind:'material',itemId:'TEMPERING_CORE',quantity:2,accountBound:true}},
  {id:'dshop_companion_essence',name:'Companion Essence Cache',category:'companion',marks:400,perUtcWeek:1,grant:{kind:'account_resource',field:'companionEssence',quantity:100}},
  {id:'dshop_bondstone',name:'Bondstone',category:'companion',marks:750,perUtcWeek:1,grant:{kind:'account_resource',field:'bondstones',quantity:1}},

  {id:'dshop_asterfall_icon',name:"Warden's Lantern",category:'icon',marks:500,firstClearRegion:'Asterfall',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileIconIds',rewardId:'dungeon:asterfall:wardens-lantern',rarity:'Rare'}},
  {id:'dshop_asterfall_border',name:'Briarbound Frame',category:'border',marks:950,firstClearRegion:'Asterfall',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBorderIds',rewardId:'dungeon:asterfall:briarbound-frame',rarity:'Epic',bonus:{target:'gatheringYield',ownedBps:50,activeBps:200}}},
  {id:'dshop_asterfall_background',name:'Rootbound Sanctuary',category:'background',marks:1500,firstClearRegion:'Asterfall',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBackgroundIds',rewardId:'dungeon:asterfall:rootbound-sanctuary',rarity:'Epic',bonus:{target:'hp',ownedBps:50,activeBps:200}}},
  {id:'dshop_asterfall_pet',name:'Oathroot Seedling',category:'pet',marks:3000,firstClearRegion:'Asterfall',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedCosmeticPetIds',rewardId:'DUNGEON_PET_ASTERFALL_001',rarity:'Epic',bonus:{target:'healingEffectiveness',ownedBps:50,activeBps:300}}},

  {id:'dshop_sunscar_icon',name:'Solar Vault Key',category:'icon',marks:500,firstClearRegion:'Sunscar',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileIconIds',rewardId:'dungeon:sunscar:solar-vault-key',rarity:'Rare'}},
  {id:'dshop_sunscar_border',name:'Amberglass Loop',category:'border',marks:950,firstClearRegion:'Sunscar',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBorderIds',rewardId:'dungeon:sunscar:amberglass-loop',rarity:'Epic',bonus:{target:'craftingSpeed',ownedBps:50,activeBps:200}}},
  {id:'dshop_sunscar_background',name:'Buried Observatory',category:'background',marks:1500,firstClearRegion:'Sunscar',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBackgroundIds',rewardId:'dungeon:sunscar:buried-observatory',rarity:'Epic',bonus:{target:'skillXp',ownedBps:50,activeBps:200}}},
  {id:'dshop_sunscar_pet',name:'Vaultscarab',category:'pet',marks:3000,firstClearRegion:'Sunscar',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedCosmeticPetIds',rewardId:'DUNGEON_PET_SUNSCAR_001',rarity:'Epic',bonus:{target:'dropChance',ownedBps:50,activeBps:300}}},

  {id:'dshop_frostmarch_icon',name:'Resonant Bell',category:'icon',marks:500,firstClearRegion:'Frostmarch',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileIconIds',rewardId:'dungeon:frostmarch:resonant-bell',rarity:'Rare'}},
  {id:'dshop_frostmarch_border',name:'Frostbound Chime',category:'border',marks:950,firstClearRegion:'Frostmarch',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBorderIds',rewardId:'dungeon:frostmarch:frostbound-chime',rarity:'Epic',bonus:{target:'fishingSpeed',ownedBps:50,activeBps:200}}},
  {id:'dshop_frostmarch_background',name:'Shiverlake Reflections',category:'background',marks:1500,firstClearRegion:'Frostmarch',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedProfileBackgroundIds',rewardId:'dungeon:frostmarch:shiverlake-reflections',rarity:'Epic',bonus:{target:'defense',ownedBps:50,activeBps:200}}},
  {id:'dshop_frostmarch_pet',name:'Choirbell Sprite',category:'pet',marks:3000,firstClearRegion:'Frostmarch',permanent:true,grant:{kind:'profile_collectible',accountField:'unlockedCosmeticPetIds',rewardId:'DUNGEON_PET_FROSTMARCH_001',rarity:'Epic',bonus:{target:'actionSpeed',ownedBps:50,activeBps:300}}},
] satisfies DungeonShopOfferV1[]);

export function dungeonShopOfferV1(itemId:string):DungeonShopOfferV1|undefined {
  return DUNGEON_SHOP_CATALOG_V1.find(offer=>offer.id===itemId);
}

/** ISO date of UTC Monday for a clock instant, independent of client timezone. */
export function dungeonShopUtcWeekKey(nowMs:number):string {
  if(!Number.isSafeInteger(nowMs)||nowMs<0)throw new Error('invalid_dungeon_shop_clock');
  const date=new Date(nowMs);
  date.setUTCHours(0,0,0,0);
  const day=date.getUTCDay();
  date.setUTCDate(date.getUTCDate()-(day===0?6:day-1));
  return date.toISOString().slice(0,10);
}

export interface DungeonShopAccountViewV1 {
  marks:number;
  clearedRegions:readonly DungeonShopRegion[];
  ownedRewardIds:readonly string[];
  /** Server-counted purchases of this offer within current UTC week, not client-supplied. */
  purchasesThisUtcWeek:Readonly<Record<string,number>>;
}
export type DungeonShopQuoteStatus='eligible'|'unknown_offer'|'region_locked'|'already_owned'|'weekly_limit'|'insufficient_marks';
export function dungeonShopQuoteV1(itemId:string,account:DungeonShopAccountViewV1,serverPrice?:number):{
  status:DungeonShopQuoteStatus; marks:number; price:number; remaining:number|null;
} {
  const offer=dungeonShopOfferV1(itemId);
  if(!offer)return {status:'unknown_offer',marks:account.marks,price:0,remaining:null};
  const price=serverPrice??offer.marks;
  if(!Number.isSafeInteger(price)||price<1||price>=1000000)throw new Error('invalid_server_shop_price');
  const purchased=account.purchasesThisUtcWeek[itemId]??0;
  const remaining=offer.perUtcWeek===undefined?null:Math.max(0,offer.perUtcWeek-purchased);
  const ownedId=offer.grant.kind==='profile_collectible'?offer.grant.rewardId:null;
  const status:DungeonShopQuoteStatus =
    offer.firstClearRegion&&!account.clearedRegions.includes(offer.firstClearRegion)?'region_locked':
    ownedId&&account.ownedRewardIds.includes(ownedId)?'already_owned':
    remaining!==null&&remaining===0?'weekly_limit':
    account.marks<price?'insufficient_marks':'eligible';
  return {status,marks:account.marks,price,remaining};
}

/** Database release settings and per-offer switches still gate all spending. */
export function dungeonShopPurchasesEnabledV1():boolean{return DUNGEON_SHOP_LIVE_V1}

export function validateDungeonShopCatalogV1():void {
  const ids=new Set<string>(),rewardIds=new Set<string>();
  for(const offer of DUNGEON_SHOP_CATALOG_V1){
    if(ids.has(offer.id)||!Number.isSafeInteger(offer.marks)||offer.marks<=0)throw new Error('invalid_dungeon_shop_catalogue');
    ids.add(offer.id);
    if(offer.permanent===true && offer.grant.kind!=='profile_collectible')throw new Error('permanent_offer_without_entitlement');
    if(offer.permanent===true && offer.perUtcWeek!==undefined)throw new Error('permanent_offer_weekly_limit');
    if(offer.perUtcWeek!==undefined&&(!Number.isSafeInteger(offer.perUtcWeek)||offer.perUtcWeek<1))throw new Error('invalid_dungeon_shop_limit');
    if(offer.grant.kind==='profile_collectible'){
      if(!offer.permanent||rewardIds.has(offer.grant.rewardId))throw new Error('duplicate_or_unbounded_dungeon_collectible');
      rewardIds.add(offer.grant.rewardId);
      if(offer.category==='icon'&&offer.grant.bonus)throw new Error('profile_icon_must_be_cosmetic');
      if(offer.grant.bonus?.ownedBps!==undefined&&offer.grant.bonus.ownedBps!==50)throw new Error('invalid_owned_bonus');
    }
  }
}
validateDungeonShopCatalogV1();
