import type {GameState} from './types';
import {WINTER_HEARTH_GUILD_RELEASED} from './release-flags';

export const WINTER_HEARTH_2026_ID='EVT_ANNUAL_012_2026';
export const WINTER_HEARTH_2026_START_MS=Date.parse('2026-12-03T00:00:00.000Z');
export const WINTER_HEARTH_2026_END_MS=Date.parse('2026-12-27T00:00:00.000Z');
export const WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID='FROSTFALL_CHRISTMAS_LIGHTS_2026';
export const WINTER_HEARTH_LIGHT_RECIPE_IDS=['CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026','CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_TAILORING_2026'] as const;
export function isWinterHearthLightRecipe(id:string):boolean{return WINTER_HEARTH_LIGHT_RECIPE_IDS.some(recipe=>recipe===id);}
export function winterHearthContentVisible(state:Pick<GameState,'account'>):boolean{
 const event=state.account.liveEvent;
 return WINTER_HEARTH_GUILD_RELEASED&&event?.enabled===true&&event.eventId===WINTER_HEARTH_2026_ID;
}
export function winterHearthLightRecipeAvailable(state:GameState,nowMs:number):boolean{
 const event=state.account.liveEvent;
 if(!event||!winterHearthContentVisible(state))return false;
 return Number.isFinite(nowMs)&&nowMs>=Math.max(event.startsAtMs,WINTER_HEARTH_2026_START_MS)&&nowMs<Math.min(event.endsAtMs,WINTER_HEARTH_2026_END_MS);
}

export type WinterHearthStage=0|25|50|75|100;
export function winterHearthStageFromProgress(logs:number,lights:number):WinterHearthStage{
 if(!Number.isSafeInteger(logs)||!Number.isSafeInteger(lights)||logs<0||lights<0)return 0;
 for(const p of [100,75,50,25] as const)if(logs>=p*250&&lights>=p*25)return p;
 return 0;
}

/** Strictly exclude cycles finishing at or after the saved seasonal deadline.
 * The current runtime may shorten, but never extend, the original reservation.
 * A missing runtime after the season cannot erase legitimately earned cycles.
 */
export function winterHearthCraftSettlementWindow(input:{lastClaimAtMs:number;nowMs:number;offlineCapSeconds:number;savedEndMs?:number;runtimeEndMs?:number;released:boolean}){
 const {lastClaimAtMs,nowMs,offlineCapSeconds,savedEndMs,runtimeEndMs,released}=input;
 const endsAtMs=Math.min(WINTER_HEARTH_2026_END_MS,Number.isFinite(savedEndMs)?savedEndMs!:Infinity,Number.isFinite(runtimeEndMs)?runtimeEndMs!:Infinity);
 const expired=!released||nowMs>=endsAtMs;
 const settledAtMs=!released?lastClaimAtMs:Math.max(lastClaimAtMs,Math.min(nowMs,endsAtMs-1));
 return {expired,elapsedSeconds:Math.max(0,Math.min(offlineCapSeconds,(settledAtMs-lastClaimAtMs)/1000))};
}

/** Weekly craft allowance is shared across the account and both seasonal recipes.
 * A reservation belongs to its UTC start week; unfinished work stops at that
 * week's reset and is refunded. Inactive characters' reservations still count. */
export const WINTER_HEARTH_WEEKLY_LIGHT_CRAFT_CAP=250;
export const WINTER_HEARTH_LIGHTS_PER_BATCH=5;
const WEEK_MS=7*86400000;
const BATCH_CAP=WINTER_HEARTH_WEEKLY_LIGHT_CRAFT_CAP/WINTER_HEARTH_LIGHTS_PER_BATCH;
export function winterHearthCraftWeekStartMs(nowMs:number):number{
 const day=Math.floor(nowMs/86400000);
 return (day-((day+3)%7+7)%7)*86400000;
}
export function winterHearthCraftWeekEndMs(nowMs:number):number{return winterHearthCraftWeekStartMs(nowMs)+WEEK_MS;}
export function normalizeWinterHearthCraftLedger(value:unknown):Record<string,number>{
 const result:Record<string,number>={};
 if(!value||typeof value!=='object'||Array.isArray(value))return result;
 for(let week=winterHearthCraftWeekStartMs(WINTER_HEARTH_2026_START_MS);week<WINTER_HEARTH_2026_END_MS;week+=WEEK_MS){
  const count=(value as Record<string,unknown>)[String(week)];
  if(typeof count==='number'&&Number.isSafeInteger(count)&&count>0)result[String(week)]=Math.min(BATCH_CAP,count);
 }
 return result;
}
export function winterHearthCompletedBatchAllowance(state:GameState,startedAtMs:number):number{
 const key=String(winterHearthCraftWeekStartMs(startedAtMs));
 return BATCH_CAP-(normalizeWinterHearthCraftLedger(state.account.winterHearthCraftedBatchesByWeek)[key]??0);
}
export function winterHearthRemainingCraftBatches(state:GameState,nowMs:number):number{
 const week=winterHearthCraftWeekStartMs(nowMs);
 const activities=[state.activity,...(state.otherCharacters??[]).map(row=>row.activity)];
 const reserved=activities.reduce((count,activity)=>count+(activity?.kind==='processing'&&activity.processing&&isWinterHearthLightRecipe(activity.processing.recipeId)&&winterHearthCraftWeekStartMs(activity.startedAtMs)===week?activity.processing.remainingBatches:0),0);
 return Math.max(0,winterHearthCompletedBatchAllowance(state,nowMs)-reserved);
}
export function recordWinterHearthCompletedBatches(state:GameState,startedAtMs:number,batches:number):GameState{
 if(!batches)return state;
 const key=String(winterHearthCraftWeekStartMs(startedAtMs)),ledger=normalizeWinterHearthCraftLedger(state.account.winterHearthCraftedBatchesByWeek);
 if(!Number.isSafeInteger(batches)||batches<0||batches>winterHearthCompletedBatchAllowance(state,startedAtMs))throw new Error('Winter Hearth weekly crafting allowance exceeded.');
 return {...state,account:{...state.account,winterHearthCraftedBatchesByWeek:{...ledger,[key]:(ledger[key]??0)+batches}}};
}
