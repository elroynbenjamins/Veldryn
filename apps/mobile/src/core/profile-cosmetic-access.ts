import type {GameState} from './types';
import {PROFILE_ANIMATED_COSMETICS_RELEASED} from './release-flags';

export const PROFILE_COSMETICS_TESTER_ENTITLEMENT='profile_cosmetics_tester_v1';

export function profileCosmeticsTester(state:GameState){
 return state.account.entitlements?.[PROFILE_COSMETICS_TESTER_ENTITLEMENT]===true;
}
export function profileAnimatedCosmeticsEnabled(state:GameState){
 return PROFILE_ANIMATED_COSMETICS_RELEASED||profileCosmeticsTester(state);
}

import {wave2SetFor,wave2Owned,wave2HasEffect} from './profile-cosmetic-wave2';
/** New standard items follow actual ownership and certification, never tester status. */
export function profileAnimatedEffectCategoryEnabled(state:GameState){
 return profileAnimatedCosmeticsEnabled(state)||wave2HasEffect(state.account);
}
export function profileAnimatedPieceEnabled(state:GameState,kind:'border'|'effect',id:string){
 return wave2SetFor(kind,id)?wave2Owned(state.account,kind,id):profileAnimatedCosmeticsEnabled(state);
}
