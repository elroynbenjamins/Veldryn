import type {ParadoxSceneAssets} from '../components/profile/ParadoxEternalPreview';
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

const BUNDLE={
 scene:{
  background:BACKGROUNDS.showcase,border:FRAMES.showcase,
  aeon:require('../../assets/ascendant/paradox/aeon_showcase.webp'),
  idleAtlas:require('../../assets/ascendant/paradox/aeon_idle_atlas.webp'),
  aura:require('../../assets/ascendant/paradox/paradox_aura.webp'),
  glint:require('../../assets/ascendant/paradox/paradox_glint.webp'),
 } satisfies ParadoxSceneAssets,
 standardBorder:FRAMES.standard,backgroundSquare:BACKGROUNDS.square,
 petRegular:require('../../assets/ascendant/paradox/aeon_96.webp') as ImageSourcePropType,
 petPortrait:require('../../assets/ascendant/paradox/aeon_512.webp') as ImageSourcePropType,
 badge:require('../../assets/ascendant/paradox/beyond_existence_64.webp') as ImageSourcePropType,
 badgePortrait:require('../../assets/ascendant/paradox/beyond_existence_256.webp') as ImageSourcePropType,
};
export function getParadoxReviewAssets(){return BUNDLE;}
