import {ABYSSAL_COLLECTION,ABYSSAL_IDS} from '../core/abyssal-showcase-layout';
import {PARADOX_COLLECTION,PARADOX_IDS} from '../core/paradox-showcase-layout';
import {getAbyssalReviewAssets} from './abyssal-integration-assets';
import {getParadoxReviewAssets} from './paradox-integration-assets';
/** Call only after the candidate appearance has passed the owning/public gate. */
export function newLuxeBackground(id?:string|null){
 if(id===ABYSSAL_IDS.background){const a=getAbyssalReviewAssets();return {name:ABYSSAL_COLLECTION.backgroundName,source:a.scene.background,variants:{wide:a.scene.background,square:a.backgroundSquare}};}
 if(id===PARADOX_IDS.background){const a=getParadoxReviewAssets();return {name:PARADOX_COLLECTION.backgroundName,source:a.scene.background,variants:{wide:a.scene.background,square:a.backgroundSquare}};}
 return undefined;
}
export function newLuxeBorder(id?:string|null){
 return id===ABYSSAL_IDS.border?getAbyssalReviewAssets().standardBorder:id===PARADOX_IDS.border?getParadoxReviewAssets().standardBorder:undefined;
}
export function newLuxePet(id?:string|null){
 return id===ABYSSAL_IDS.pet?getAbyssalReviewAssets().petRegular:id===PARADOX_IDS.pet?getParadoxReviewAssets().petRegular:undefined;
}
