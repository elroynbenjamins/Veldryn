import {random01} from './rng';

/** Seasonal, review-gated drop policy. This module is deterministic and has no inventory writes. */
export const WINTER_HEARTH_2026_ID='EVT_ANNUAL_012_2026';
export const WINTER_HEARTH_2026_START_MS=Date.parse('2026-12-03T00:00:00.000Z');
export const WINTER_HEARTH_2026_END_MS=Date.parse('2026-12-27T00:00:00.000Z');
export const WINTER_HEARTH_WISP_ITEM_ID='FROSTFALL_WISP_GLOW_2026';
export const WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID='FROSTFALL_CHRISTMAS_LIGHTS_2026';

/** Every verified fishing catch has an independent 5% Wisp Glow chance.
 * Every verified woodcutting action has an independent 2% chance.
 * Mining, herbs, exploration, combat and crafting never award this drop.
 * Spawn only during a server-issued active event window; no time travel/offline
 * post-event earning. The global power/drop-luck multipliers do not affect this
 * seasonal supply drop until separately approved.
 */
export function frostfallWispDrops(input:{
 released:boolean;guildMember:boolean;eventEnabled:boolean;
 eventId:string|undefined;eventStartsAtMs:number;eventEndsAtMs:number;
 skillId:string;seed:string;actionTimesMs:readonly number[];
}):number{
 if(!input.released||!input.guildMember||!input.eventEnabled
  ||input.eventId!==WINTER_HEARTH_2026_ID
  ||!Number.isFinite(input.eventStartsAtMs)||!Number.isFinite(input.eventEndsAtMs)
  ||typeof input.seed!=='string'||!input.seed||input.actionTimesMs.length>100_000)return 0;
 const chance=input.skillId==='fishing'?.05:input.skillId==='woodcutting'?.02:0;
 if(chance<=0)return 0;
 const starts=Math.max(input.eventStartsAtMs,WINTER_HEARTH_2026_START_MS);
 const ends=Math.min(input.eventEndsAtMs,WINTER_HEARTH_2026_END_MS);
 if(ends<=starts)return 0;
 let count=0;
 for(let index=0;index<input.actionTimesMs.length;index++){
  const at=input.actionTimesMs[index];
  if(!Number.isFinite(at)||at<starts||at>=ends)continue;
  if(random01(input.seed,index)<chance)count++;
 }
 return count;
}
