/** Review-only event cosmetic catalog. Each collection has immutable event-scoped IDs.
 * Server issuance must be driven by committed milestone receipts, never this preview.
 */
export const FROSTFALL_2026_GUILD_COSMETICS=Object.freeze([
 {id:'background_frostfall_winter_aurora_2026',kind:'background',name:"Winter's Aurora",milestone:50},
 {id:'banner_frostfall_standard_2026',kind:'banner',name:'Frostfall Standard',milestone:75},
 {id:'border_frostfall_frozen_majesty_2026',kind:'border',name:'Frozen Majesty',milestone:100},
 {id:'name_frostfall_aurora_2026',kind:'name_color',name:'Frostfall Aurora',milestone:100},
].map(row=>Object.freeze({...row,eventId:'EVT_ANNUAL_012_2026'})));
const KINDS=new Set(['background','banner','border','name_color']);
export function guildEventCosmeticsAtMilestones(catalog,eventId,earnedMilestones){
 if(!Array.isArray(catalog)||!Array.isArray(earnedMilestones)||typeof eventId!=='string'||!eventId)throw new TypeError('Invalid event cosmetic collection');
 const earned=new Set(earnedMilestones),ids=new Set();
 for(const row of catalog){
  if(!row||typeof row.id!=='string'||!row.id||typeof row.eventId!=='string'||!row.eventId||!KINDS.has(row.kind)||![25,50,75,100].includes(row.milestone)||ids.has(row.id))throw new TypeError('Invalid or duplicate event cosmetic definition');
  ids.add(row.id);
 }
 return Object.freeze(catalog.filter(row=>row.eventId===eventId&&earned.has(row.milestone)).map(row=>row.id));
}
