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
}
const category=(offer:typeof DUNGEON_SHOP_CATALOG_V1[number])=>
 offer.grant.kind==='material'?offer.grant.quantity+' × '+offer.grant.itemId.replace(/_/g,' '):
 offer.grant.kind==='account_resource'?offer.grant.quantity+' '+(offer.grant.field==='bondstones'?'Bondstones':'Companion Essence'):
 offer.grant.bonus?'+ '+(offer.grant.bonus.activeBps/100).toFixed(2)+'% '+offer.grant.bonus.target+' equipped; +'+(offer.grant.bonus.ownedBps/100).toFixed(2)+'% owned':'Profile icon · visual only';

function sanitizedSnapshot(raw:unknown):DungeonShopAccountViewV1{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new GameplayError('invalid_dungeon_shop_snapshot');
 const s=raw as Record<string,unknown>;
 if(!Number.isSafeInteger(s.marks)||Number(s.marks)<0||!Array.isArray(s.clearedRegions)||!Array.isArray(s.ownedRewardIds)||!s.purchasesThisUtcWeek||typeof s.purchasesThisUtcWeek!=='object')throw new GameplayError('invalid_dungeon_shop_snapshot');
 const regions=['Asterfall','Sunscar','Frostmarch'] as const;
 if(s.clearedRegions.some(v=>!regions.includes(v as DungeonShopRegion))||s.ownedRewardIds.some(v=>typeof v!=='string'))throw new GameplayError('invalid_dungeon_shop_snapshot');
 const purchases=s.purchasesThisUtcWeek as Record<string,unknown>;
 if(Object.entries(purchases).some(([key,value])=>!/^dshop_[a-z0-9_]{1,80}$/.test(key)||!Number.isSafeInteger(value)||Number(value)<0))throw new GameplayError('invalid_dungeon_shop_snapshot');
 return {marks:Number(s.marks),clearedRegions:s.clearedRegions as DungeonShopRegion[],ownedRewardIds:s.ownedRewardIds as string[],purchasesThisUtcWeek:purchases as Record<string,number>};
}
function nextUtcMonday(nowMs:number):string{
 const week=dungeonShopUtcWeekKey(nowMs);
 return new Date(Date.parse(week+'T00:00:00.000Z')+7*24*60*60*1000).toISOString();
}
/** Hidden server controller. Only the authenticated co-op router can call it.
 * A new database migration must be installed before GET; mutations are still
 * blocked even if the database contains an enabled offer, until release. */
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
    shopEnabled:dungeonShopPurchasesEnabledV1(),
    nextUtcWeekReset:nextUtcMonday(nowMs),
    offers:DUNGEON_SHOP_CATALOG_V1.map(offer=>{
     const quote=dungeonShopQuoteV1(offer.id,account);
     return {
      id:offer.id,name:offer.name,category:offer.category,marks:offer.marks,
      summary:category(offer),status:quote.status,rarity:offer.grant.kind==='profile_collectible'?offer.grant.rarity:undefined,
      region:offer.firstClearRegion,remainingThisUtcWeek:quote.remaining,
      owned:quote.status==='already_owned',
      lockReason:quote.status==='region_locked'?'Clear a '+offer.firstClearRegion+' dungeon first.':undefined,
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
