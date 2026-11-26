import type {ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';
type Art=Readonly<{badge:ImageSourcePropType;badgeLarge:ImageSourcePropType;particle:ImageSourcePropType;glow:ImageSourcePropType;haze:ImageSourcePropType}>;
const sets:ReadonlyMap<string,Art>=new Map([
 [NEXT_PREMIUM_SETS[0].id,{badge:require('../../assets/ascendant/sakura/blossom_crest_64.webp'),badgeLarge:require('../../assets/ascendant/sakura/blossom_crest_256.webp'),particle:require('../../assets/ascendant/sakura/petal.webp'),glow:require('../../assets/ascendant/sakura/crest_glow.webp'),haze:require('../../assets/ascendant/sakura/ambient_haze.webp')}],
 [NEXT_PREMIUM_SETS[1].id,{badge:require('../../assets/ascendant/stormforged/wolf_crest_64.webp'),badgeLarge:require('../../assets/ascendant/stormforged/wolf_crest_256.webp'),particle:require('../../assets/ascendant/stormforged/lightning_arc.webp'),glow:require('../../assets/ascendant/stormforged/crest_glow.webp'),haze:require('../../assets/ascendant/stormforged/ambient_haze.webp')}],
]);
/** Isolated artwork only; does not determine ownership or discovery. */
export function getNextPremiumReviewDecoration(id:string|undefined){return id?sets.get(id):undefined;}
