import type {GameState} from './types';
import {WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID} from './winter-hearth-2026';

export const WINTER_HEARTH_LOG_IDS=['GREENWOOD_LOG','IRONWOOD_LOG','CROWNWOOD_LOG','DUNEWOOD','WHITEPINE_LOG','CINDERWOOD_LOG'] as const;
export const WINTER_HEARTH_DONATION_IDS=[...WINTER_HEARTH_LOG_IDS,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID] as const;
export type WinterHearthTrack='logs'|'lights';
export function winterHearthDonationTrack(itemId:string):WinterHearthTrack|null{
 return itemId===WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID?'lights':WINTER_HEARTH_LOG_IDS.some(id=>id===itemId)?'logs':null;
}
export function winterHearthUnlockedStock(state:Pick<GameState,'inventory'|'settings'>,itemId:string):number{
 if(!winterHearthDonationTrack(itemId)||state.settings.lockedItemIds?.includes(itemId))return 0;
 return state.inventory.stacks.reduce((sum,row)=>row.itemId===itemId&&!(row as {locked?:boolean}).locked&&Number.isSafeInteger(row.quantity)&&row.quantity>0?sum+row.quantity:sum,0);
}
export function winterHearthMaxDonation(stock:number,weeklyRemaining:number,goalRemaining:number):number{
 return [stock,weeklyRemaining,goalRemaining].every(Number.isSafeInteger)?Math.max(0,Math.min(stock,weeklyRemaining,goalRemaining,2500)):0;
}
