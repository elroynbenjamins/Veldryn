import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';
import {getNextPremiumReviewBackground} from './next-premium-background-review-assets';
import {getNextPremiumReviewFrame} from './next-premium-frame-review-assets';
import {getNextPremiumReviewPet} from './next-premium-pet-review-assets';
import {ABYSSAL_COLLECTION,ABYSSAL_IDS} from '../core/abyssal-showcase-layout';
import {PARADOX_COLLECTION,PARADOX_IDS} from '../core/paradox-showcase-layout';
import {getAbyssalReviewAssets} from './abyssal-integration-assets';
import {getParadoxReviewAssets} from './paradox-integration-assets';
/** Call only after the candidate appearance has passed the owning/public gate. */
export function newLuxeBackground(id?:string|null){
 if(id===ABYSSAL_IDS.background){const a=getAbyssalReviewAssets();return {name:ABYSSAL_COLLECTION.backgroundName,source:a.scene.background,variants:{wide:a.scene.background,square:a.backgroundSquare}};}
 if(id===PARADOX_IDS.background){const a=getParadoxReviewAssets();return {name:PARADOX_COLLECTION.backgroundName,source:a.scene.background,variants:{wide:a.scene.background,square:a.backgroundSquare}};}
 const set=NEXT_PREMIUM_SETS.find(s=>s.background===id);
 if(set){const wide=getNextPremiumReviewBackground(set.background,'wide'),square=getNextPremiumReviewBackground(set.background,'square');if(wide&&square)return {name:set.backgroundName,source:wide,variants:{wide,square}};}
 return undefined;
}
export function newLuxeBorder(id?:string|null){
 return id===ABYSSAL_IDS.border?getAbyssalReviewAssets().standardBorder:id===PARADOX_IDS.border?getParadoxReviewAssets().standardBorder:getNextPremiumReviewFrame(id??undefined,'standard');
}
export function newLuxePet(id?:string|null){
 return id===ABYSSAL_IDS.pet?getAbyssalReviewAssets().petRegular:id===PARADOX_IDS.pet?getParadoxReviewAssets().petRegular:getNextPremiumReviewPet(id??undefined)?.portrait;
}
