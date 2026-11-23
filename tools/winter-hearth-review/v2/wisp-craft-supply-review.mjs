/**
 * WINTER HEARTH 2026 — REVIEW ONLY.
 * Craft/Wisp success formulas, rarity economy and source integrity preview.
 * Never imported into any production action. Never generates live RNG,
 * Gold, XP, inventory changes, rare materials or item grants.
 */
import {
 WINTER_HEARTH_GOALS,WINTER_HEARTH_LIGHT_RECIPE,WINTER_HEARTH_WISP_ID,
 WINTER_HEARTH_LIGHT_ID,winterHearthActive
} from '../../frostfall-winter-hearth-2026-rules.mjs';

export const WISP_CANDIDATE_RATE_BPS=Object.freeze({fishing:500,woodcutting:200});
export const WINTER_HEARTH_REVIEW_ONLY_RELEASED=false;
const safeNonnegative=n=>Number.isSafeInteger(n)&&n>=0;

export function winterHearthSupplyExpectation({fishingActions,woodcuttingActions}) {
 if(!safeNonnegative(fishingActions)||!safeNonnegative(woodcuttingActions)) {
  throw new RangeError('Invalid action counts');
 }
 const expectedWispGlow = fishingActions * 0.05 + woodcuttingActions * 0.02;
 const batches = WINTER_HEARTH_GOALS.lights / WINTER_HEARTH_LIGHT_RECIPE.output.quantity;
 const deficit = Math.max(0,batches-expectedWispGlow);
 return Object.freeze({
  goalLights:WINTER_HEARTH_GOALS.lights,
  requiredBatches:batches,
  requiredWispGlow:batches,
  expectedWispGlow,
  expectedFinishedLights:expectedWispGlow * WINTER_HEARTH_LIGHT_RECIPE.output.quantity,
  wispDeficitExpected:deficit,
  expectedWispGlowFractionOfGuildGoal:expectedWispGlow/batches,
  oreRequired:WINTER_HEARTH_LIGHT_RECIPE.inputs.find(x=>x.itemId==='COPPER_ORE').quantity*batches,
  extraGreenwoodLogsRequired:WINTER_HEARTH_LIGHT_RECIPE.inputs.find(x=>x.itemId==='GREENWOOD_LOG').quantity*batches,
  goldSpentOnCrafts:WINTER_HEARTH_LIGHT_RECIPE.gold*batches,
  smithingXpEarnedIfAll500CraftsComplete:WINTER_HEARTH_LIGHT_RECIPE.xp*batches,
  craftSecondsIfAll500CraftsComplete:WINTER_HEARTH_LIGHT_RECIPE.seconds*batches,
  previewOnly:true,notProofOfSuccess:true,
  warning:'Historical guild quest actions are not verified fishing/woodcutting completion receipts; never use for live Wisp grant'
 });
}

export function winterHearthWispReceiptPreview({
 sourceKind,sourceReceiptId,success,nowMs,syntheticUniformRoll
}) {
 const no=(reason)=>Object.freeze({
  eligible:false,wouldDrop:false,reason,
  emittedItemId:null,issuedQuantity:0,
  previewOnly:true,mayGrant:false,authority:false
 });
 if(!WINTER_HEARTH_REVIEW_ONLY_RELEASED && !winterHearthActive(nowMs)) {
  return no('event-outside-window');
 }
 if(!winterHearthActive(nowMs))return no('event-outside-window');
 if(typeof sourceReceiptId!=='string' || !/^[A-Za-z0-9_-]{8,128}$/.test(sourceReceiptId)) {
  return no('no-server-source-receipt');
 }
 if(!Object.hasOwn(WISP_CANDIDATE_RATE_BPS,sourceKind))return no('unsupported-source');
 if(success!==true)return no('not-a-successful-server-action');
 if(!Number.isInteger(syntheticUniformRoll) || syntheticUniformRoll<0 || syntheticUniformRoll>=10000){
  return no('invalid-preview-roll');
 }
 const rateBps=WISP_CANDIDATE_RATE_BPS[sourceKind];
 const hit=syntheticUniformRoll<rateBps;
 return Object.freeze({
  eligible:true,wouldDrop:hit,sourceKind,sourceReceiptId,
  rateBps,emittedItemId:hit?WINTER_HEARTH_WISP_ID:null,
  issuedQuantity:0,previewOnly:true,mayGrant:false,authority:false,
  category:'PROPOSED_2026_FROSTFALL_GLOW_REVIEW'
 });
}

export function winterHearthCraftQuote({smithingLevel,availableResources,
 goldAvailable,batches,nowMs,eventReleased}) {
 const reject=reason=>Object.freeze({ok:false,reason,previewOnly:true,mayCraft:false});
 if(eventReleased!==true || !winterHearthActive(nowMs))return reject('event-closed');
 if(!Number.isSafeInteger(smithingLevel)||smithingLevel<WINTER_HEARTH_LIGHT_RECIPE.level){
  return reject('insufficient-smithing-level');
 }
 if(!Number.isSafeInteger(batches) || batches<1 || batches>500)return reject('invalid-batch-count');
 if(!availableResources || typeof availableResources!=='object')return reject('invalid-inventory');
 if(!safeNonnegative(goldAvailable))return reject('invalid-gold');
 for(const input of WINTER_HEARTH_LIGHT_RECIPE.inputs){
  if(!safeNonnegative(availableResources[input.itemId]))return reject('invalid-inventory');
  if(availableResources[input.itemId] < input.quantity*batches)return reject('insufficient-'+input.itemId);
 }
 if(goldAvailable<WINTER_HEARTH_LIGHT_RECIPE.gold*batches)return reject('insufficient-gold');
 return Object.freeze({
  ok:true,itemId:WINTER_HEARTH_LIGHT_ID,batches,
  outputCount:WINTER_HEARTH_LIGHT_RECIPE.output.quantity*batches,
  resourceDebits:Object.freeze(WINTER_HEARTH_LIGHT_RECIPE.inputs.map(x=>Object.freeze({
   itemId:x.itemId,quantity:x.quantity*batches
  }))),
  goldCost:WINTER_HEARTH_LIGHT_RECIPE.gold*batches,
  smithingXp:WINTER_HEARTH_LIGHT_RECIPE.xp*batches,
  durationSeconds:WINTER_HEARTH_LIGHT_RECIPE.seconds*batches,
  previewOnly:true,mayCraft:false,mayGrant:false,authority:false
 });
}
