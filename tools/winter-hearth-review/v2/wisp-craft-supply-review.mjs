/** Review-only supply projection. Historical filename retained for CI; no Wisp Glow drop. */
import {WINTER_HEARTH_LIGHT_RECIPES,WINTER_HEARTH_LIGHT_ID,winterHearthActive} from '../../frostfall-winter-hearth-2026-rules.mjs';
export const WINTER_HEARTH_REVIEW_ONLY_RELEASED=false;
const whole=n=>Number.isSafeInteger(n)&&n>=0;
export function winterHearthSupplyExpectation({smithingBatches,tailoringBatches}){
 if(!whole(smithingBatches)||!whole(tailoringBatches)||smithingBatches+tailoringBatches>500)throw new RangeError('Invalid batch counts');
 const n=smithingBatches+tailoringBatches;
 return {lights:n*5,COPPER_ORE:smithingBatches*8,MOSS_FIBER:tailoringBatches*8,DEWLEAF:n*4,WISP_DUST:n,baseGold:n*30,baseSeconds:n*40,baseSmithingXp:smithingBatches*35,baseTailoringXp:tailoringBatches*35,previewOnly:true,mayGrant:false};
}
export function winterHearthCraftQuote({skillId,skillLevel,availableResources,goldAvailable,batches,nowMs,eventReleased}){
 const reject=reason=>({ok:false,reason,previewOnly:true,mayCraft:false});
 if(eventReleased!==true||!winterHearthActive(nowMs))return reject('event-closed');
 if(!Object.hasOwn(WINTER_HEARTH_LIGHT_RECIPES,skillId))return reject('invalid-profession');
 const r=WINTER_HEARTH_LIGHT_RECIPES[skillId];
 if(!whole(skillLevel)||skillLevel<r.level)return reject('insufficient-skill-level');
 if(!whole(batches)||batches<1||batches>500)return reject('invalid-batch-count');
 if(!availableResources||!whole(goldAvailable))return reject('invalid-inventory');
 for(const i of r.inputs)if(!whole(availableResources[i.itemId])||availableResources[i.itemId]<i.quantity*batches)return reject('insufficient-'+i.itemId);
 if(goldAvailable<r.gold*batches)return reject('insufficient-gold');
 return {ok:true,itemId:WINTER_HEARTH_LIGHT_ID,skillId,outputCount:r.output.quantity*batches,resourceDebits:r.inputs.map(i=>({...i,quantity:i.quantity*batches})),baseGold:r.gold*batches,baseXp:r.xp*batches,baseSeconds:r.seconds*batches,previewOnly:true,mayCraft:false,mayGrant:false};
}
