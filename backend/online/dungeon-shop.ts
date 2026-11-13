import {
  DUNGEON_SHOP_CATALOG_V1,
  DUNGEON_SHOP_CATALOG_VERSION,
  dungeonShopQuoteV1,
  dungeonShopPurchasesEnabledV1,
  dungeonShopUtcWeekKey,
  type DungeonShopRegion,
  type DungeonShopAccountViewV1,
} from '../src/server/expeditions/dungeon-shop-catalog-v1';
import {GameplayError,type GameplayServices} from './gameplay';

type Services=Pick<GameplayServices,'rpc'>;
export interface DungeonShopServerAccountSnapshot {
 marks:number;
 clearedRegions:DungeonShopRegion[];
 ownedRewardIds:string[];
 purchasesThisUtcWeek:Record<string,number>;
 releasedPrices:Record<string,number>;
 shopEnabled:boolean;
}
const category=(offer:typeof DUNGEON_SHOP_CATALOG_V1[number])=>
 offer.grant.kind==='material'?offer.grant.quantity+' × '+offer.grant.itemId.replace(/_/g,' '):
 offer.grant.kind==='account_resource'?offer.grant.quantity+' '+(offer.grant.field==='bondstones'?'Bondstones':'Companion Essence'):
 offer.grant.bonus?'+ '+(offer.grant.bonus.activeBps/100).toFixed(2)+'% '+offer.grant.bonus.target+' equipped; +'+(offer.grant.bonus.ownedBps/100).toFixed(2)+'% owned':'Profile icon · visual only';

function sanitizedSnapshot(raw:unknown):DungeonShopAccountViewV1 & Pick<DungeonShopServerAccountSnapshot,'releasedPrices'|'shopEnabled'>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new GameplayError('invalid_dungeon_shop_snapshot');
 const s=raw as Record<string,unknown>;
 if(!Number.isSafeInteger(s.marks)||Number(s.marks)<0||!Array.isArray(s.clearedRegions)||!Array.isArray(s.ownedRewardIds)||!s.purchasesThisUtcWeek||typeof s.purchasesThisUtcWeek!=='object')throw new GameplayError('invalid_dungeon_shop_snapshot');
 const regions=['Asterfall','Sunscar','Frostmarch'] as const;
 if(s.clearedRegions.some(v=>!regions.includes(v as DungeonShopRegion))||s.ownedRewardIds.some(v=>typeof v!=='string'))throw new GameplayError('invalid_dungeon_shop_snapshot');
 const purchases=s.purchasesThisUtcWeek as Record<string,unknown>;
 if(Object.entries(purchases).some(([key,value])=>!/^dshop_[a-z0-9_]{1,80}$/.test(key)||!Number.isSafeInteger(value)||Number(value)<0))throw new GameplayError('invalid_dungeon_shop_snapshot');
 if(typeof s.shopEnabled!=='boolean'||!s.releasedPrices||typeof s.releasedPrices!=='object'||Array.isArray(s.releasedPrices))throw new GameplayError('invalid_dungeon_shop_snapshot');
 const released=s.releasedPrices as Record<string,unknown>;
 if(Object.entries(released).some(([key,value])=>!DUNGEON_SHOP_CATALOG_V1.some(offer=>offer.id===key)||!Number.isSafeInteger(value)||Number(value)<1||Number(value)>=1000000))throw new GameplayError('invalid_dungeon_shop_snapshot');
 return {marks:Number(s.marks),clearedRegions:s.clearedRegions as DungeonShopRegion[],ownedRewardIds:s.ownedRewardIds as string[],purchasesThisUtcWeek:purchases as Record<string,number>,releasedPrices:released as Record<string,number>,shopEnabled:s.shopEnabled};
}
function nextUtcMonday(nowMs:number):string{
 const week=dungeonShopUtcWeekKey(nowMs);
 return new Date(Date.parse(week+'T00:00:00.000Z')+7*24*60*60*1000).toISOString();
}
/** Authenticated co-op Edge route backed by service_role-only atomic RPCs.
 * DB global switch and per-offer flags control actual purchases. */
export function makeDungeonShopController(services:Services){
 return {
  async snapshot(accountId:string,nowMs=Date.now()){
   if(!dungeonShopPurchasesEnabledV1())return {
    currency:'expedition_mark' as const,
    catalogueVersion:DUNGEON_SHOP_CATALOG_VERSION,balance:0,shopEnabled:false,
    nextUtcWeekReset:nextUtcMonday(nowMs),
    offers:DUNGEON_SHOP_CATALOG_V1.map(offer=>({
     id:offer.id,name:offer.name,category:offer.category,marks:offer.marks,
     summary:category(offer),status:'unreleased' as const,
     rarity:offer.grant.kind==='profile_collectible'?offer.grant.rarity:undefined,
     region:offer.firstClearRegion,owned:false,remainingThisUtcWeek:offer.perUtcWeek??null,
     lockReason:'Shop preview only — no purchases are available.',
    })),
   };
   const account=sanitizedSnapshot(await services.rpc<DungeonShopServerAccountSnapshot>('dungeon_shop_snapshot_server_v1',{p_account_id:accountId}));
   return {
    currency:'expedition_mark' as const,
    catalogueVersion:DUNGEON_SHOP_CATALOG_VERSION,
    balance:account.marks,
    shopEnabled:account.shopEnabled,
    nextUtcWeekReset:nextUtcMonday(nowMs),
    offers:DUNGEON_SHOP_CATALOG_V1.map(offer=>{
     const published=account.shopEnabled&&account.releasedPrices[offer.id]!==undefined;
     const price=account.releasedPrices[offer.id]??offer.marks;
     const quote=dungeonShopQuoteV1(offer.id,account,price);
     const owned=offer.grant.kind==='profile_collectible'&&account.ownedRewardIds.includes(offer.grant.rewardId);
     return {
      id:offer.id,name:offer.name,category:offer.category,marks:price,
      summary:category(offer),status:published?quote.status:'unreleased' as const,rarity:offer.grant.kind==='profile_collectible'?offer.grant.rarity:undefined,
      region:offer.firstClearRegion,remainingThisUtcWeek:quote.remaining,
      owned,
      lockReason:!published?'Not yet released — no Marks can be spent on this offer.':quote.status==='region_locked'?'Clear a '+offer.firstClearRegion+' dungeon first.':undefined,
     };
    }),
   };
  },
  async purchase(accountId:string,offerId:string,requestId:string){
   if(!dungeonShopPurchasesEnabledV1())throw new GameplayError('dungeon_shop_unreleased',403);
   if(!/^dshop_[a-z0-9_]{1,80}$/.test(offerId)||!DUNGEON_SHOP_CATALOG_V1.some(v=>v.id===offerId)||!/^[A-Za-z0-9_-]{8,128}$/.test(requestId))throw new GameplayError('invalid_dungeon_shop_request');
   return services.rpc<{status:'purchased'|'already_owned';balance:number}>('dungeon_shop_purchase_server_v1',{p_account_id:accountId,p_item_id:offerId,p_request_id:requestId});
  },
 };
}
