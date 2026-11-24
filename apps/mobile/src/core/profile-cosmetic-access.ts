import type {GameState} from './types';
import {PROFILE_ANIMATED_COSMETICS_RELEASED} from './release-flags';

export const PROFILE_COSMETICS_TESTER_ENTITLEMENT='profile_cosmetics_tester_v1';

export function profileCosmeticsTester(state:GameState){
 return state.account.entitlements?.[PROFILE_COSMETICS_TESTER_ENTITLEMENT]===true;
}
export function profileAnimatedCosmeticsEnabled(state:GameState){
 return PROFILE_ANIMATED_COSMETICS_RELEASED||profileCosmeticsTester(state);
}
