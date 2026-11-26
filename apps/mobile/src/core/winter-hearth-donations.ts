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

/** Quick choices are quantities, not a change to the server weekly caps. */
export function winterHearthQuickDonation(track:WinterHearthTrack,choice:'preset'|'Half'|'Max',maximum:number):number{
 if(!Number.isSafeInteger(maximum)||maximum<1)return 0;
 const cap=Math.min(maximum,track==='logs'?2500:250);
 return choice==='Max'?cap:choice==='Half'?Math.max(1,Math.floor(cap/2)):Math.min(cap,track==='logs'?250:50);
}
export function winterHearthValidQuantity(text:string,maximum:number):boolean{
 const quantity=Number(text);
 return /^[1-9][0-9]*$/.test(text)&&Number.isSafeInteger(quantity)&&Number.isSafeInteger(maximum)&&quantity<=maximum;
}

/** Validate the complete committed receipt against the persisted request.
 * Replay repeats the original receipt, never a second payout.
 */
export function winterHearthReceiptMatches(input:unknown,request:{guildId:string;itemId:string;quantity:number;weekStartUtc:string}):boolean{
 if(!input||typeof input!=='object')return false;
 const r=input as Record<string,unknown>;
 const track=winterHearthDonationTrack(request.itemId);
 const whole=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(!track||!whole(request.quantity,1,track==='logs'?2500:250)||r.guildId!==request.guildId||r.itemId!==request.itemId||r.quantity!==request.quantity||r.weekStartUtc!==request.weekStartUtc||r.track!==track||typeof r.alreadyProcessed!=='boolean'||typeof r.newPermanentColor!=='boolean'||!whole(r.logs,0,25000)||!whole(r.lights,0,2500)||!whole(r.newGuildGold,0,110000)||!Array.isArray(r.newMilestones))return false;
 const gold:Record<number,number>={25:10000,50:20000,75:30000,100:50000};
 const milestones=r.newMilestones;
 if(milestones.some((p,i)=>typeof p!=='number'||!Object.prototype.hasOwnProperty.call(gold,p)||(i>0&&p<=milestones[i-1])||Number(r.logs)<p*250||Number(r.lights)<p*25))return false;
 return r.newGuildGold===milestones.reduce((sum,p)=>sum+gold[p],0)&&r.newPermanentColor===milestones.includes(100);
}
