import type {ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';
/** Isolated review assets, not a production ownership or discovery registry.
 * Missing artwork deliberately returns undefined rather than another set's art. */
const backgrounds:ReadonlyMap<string,Readonly<{wide:ImageSourcePropType;square:ImageSourcePropType}>>=new Map([
 [NEXT_PREMIUM_SETS[0].background,{wide:require('../../assets/ascendant/sakura/petal_sanctuary.webp'),square:require('../../assets/ascendant/sakura/petal_sanctuary_square.webp')}],
]);
export function getNextPremiumReviewBackground(id:string|undefined,mode:'wide'|'square'){
 return id?backgrounds.get(id)?.[mode]:undefined;
}
