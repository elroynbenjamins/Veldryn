import {coopClient,coopRequestId} from './coop-client';
import type {DungeonMarksShopSnapshot} from '../core/dungeon-marks-shop-types';

/** The Expedition Quartermaster and Dungeon Marks Shop are one system.
 * Route purchases through the authenticated co-op Edge service and its
 * persisted command journal — never call the disabled legacy Supabase RPC. */
export async function loadExpeditionShop():Promise<DungeonMarksShopSnapshot>{
 return coopClient.dungeonMarksShop();
}

export async function buyExpeditionShopOffer(itemId:string):Promise<'purchased'|'already_owned'>{
 const receipt=await coopClient.purchaseDungeonMarksShop(itemId,coopRequestId());
 return receipt.status;
}
