import type {ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';

/** Artwork candidates only. Do not import from production registries or derive ownership.
 * Separate 16:9 standard art avoids stretching the showcase aperture.
 * No fallback to ordinary frame art: an unknown candidate resolves to undefined.
 */
const frames:ReadonlyMap<string,Readonly<{showcase:ImageSourcePropType;standard:ImageSourcePropType}>>=new Map([
 [NEXT_PREMIUM_SETS[0].border,{showcase:require('../../assets/ascendant/sakura/blossom_crown_v2.webp'),standard:require('../../assets/ascendant/sakura/blossom_crown_v2_standard.webp')}],
 [NEXT_PREMIUM_SETS[1].border,{showcase:require('../../assets/ascendant/stormforged/steel_crown.webp'),standard:require('../../assets/ascendant/stormforged/steel_crown_standard.webp')}],
]);
export function getNextPremiumReviewFrame(id:string|undefined,mode:'showcase'|'standard'){
 return id?frames.get(id)?.[mode]:undefined;
}
