import type {ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';
type PetArt=Readonly<{portrait:ImageSourcePropType;icon:ImageSourcePropType;showcase:ImageSourcePropType;atlas:ImageSourcePropType}>;
/** Review-only exact-ID assets. Never use a missing candidate to confer ownership. */
const pets:ReadonlyMap<string,PetArt>=new Map([
 [NEXT_PREMIUM_SETS[0].pet,{portrait:require('../../assets/ascendant/sakura/spirit_fox_512.webp'),icon:require('../../assets/ascendant/sakura/spirit_fox_96.webp'),showcase:require('../../assets/ascendant/sakura/spirit_fox_showcase.webp'),atlas:require('../../assets/ascendant/sakura/spirit_fox_idle_atlas.webp')}],
 [NEXT_PREMIUM_SETS[1].pet,{portrait:require('../../assets/ascendant/stormforged/direwolf_512.webp'),icon:require('../../assets/ascendant/stormforged/direwolf_96.webp'),showcase:require('../../assets/ascendant/stormforged/direwolf_showcase.webp'),atlas:require('../../assets/ascendant/stormforged/direwolf_idle_atlas.webp')}],
]);
export function getNextPremiumReviewPet(id:string|undefined):PetArt|undefined{
 return id?pets.get(id):undefined;
}
