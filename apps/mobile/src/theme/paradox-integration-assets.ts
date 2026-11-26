import type {ImageSourcePropType} from 'react-native';
/** Verified uploaded frames, isolated from the production cosmetic registry. */
const FRAMES={
 showcase:require('../../assets/ascendant/paradox/fractured_eternity.webp') as ImageSourcePropType,
 standard:require('../../assets/ascendant/paradox/fractured_eternity_standard.webp') as ImageSourcePropType,
};
export function getParadoxReviewFrames(){return FRAMES;}

const BACKGROUNDS={
 showcase:require('../../assets/ascendant/paradox/beyond_the_veil.webp') as ImageSourcePropType,
 square:require('../../assets/ascendant/paradox/beyond_the_veil_square.webp') as ImageSourcePropType,
};
export function getParadoxReviewBackgrounds(){return BACKGROUNDS;}
