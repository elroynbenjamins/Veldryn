import type {GameState} from './types';
import {WINTER_HEARTH_GUILD_RELEASED} from './release-flags';

export const WINTER_HEARTH_2026_ID='EVT_ANNUAL_012_2026';
export const WINTER_HEARTH_2026_START_MS=Date.parse('2026-12-03T00:00:00.000Z');
export const WINTER_HEARTH_2026_END_MS=Date.parse('2026-12-27T00:00:00.000Z');
export const WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID='FROSTFALL_CHRISTMAS_LIGHTS_2026';
export const WINTER_HEARTH_LIGHT_RECIPE_IDS=['CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026','CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_TAILORING_2026'] as const;
export function isWinterHearthLightRecipe(id:string):boolean{return WINTER_HEARTH_LIGHT_RECIPE_IDS.some(recipe=>recipe===id);}
export function winterHearthLightRecipeAvailable(state:GameState,nowMs:number):boolean{
 const event=state.account.liveEvent;
 return WINTER_HEARTH_GUILD_RELEASED&&event?.enabled===true&&event.eventId===WINTER_HEARTH_2026_ID&&
  Number.isFinite(nowMs)&&nowMs>=Math.max(event.startsAtMs,WINTER_HEARTH_2026_START_MS)&&nowMs<Math.min(event.endsAtMs,WINTER_HEARTH_2026_END_MS);
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
