import type {ImageSourcePropType} from 'react-native';
import type {AbyssalSceneAssets} from '../components/profile/AbyssalMajestyPreview';
/** Review-only asset registry. Do not import from live wardrobe/profile renderers
 * until private grant, title/badge and mixed-piece rendering audits are complete. */
export type AbyssalAssetBundle={
 scene:AbyssalSceneAssets;standardBorder:ImageSourcePropType;backgroundSquare:ImageSourcePropType;
 petRegular:ImageSourcePropType;petPortrait:ImageSourcePropType;badge:ImageSourcePropType;badgePortrait:ImageSourcePropType;
};
const BUNDLE:AbyssalAssetBundle={
 scene:{
  background:require('../../assets/ascendant/abyssal/forgotten_abyss.webp'),
  border:require('../../assets/ascendant/abyssal/crown_of_the_depths.webp'),
  leviathan:require('../../assets/ascendant/abyssal/nhalzuun_showcase.webp'),
  idleAtlas:require('../../assets/ascendant/abyssal/nhalzuun_idle_atlas.webp'),
  tide:require('../../assets/ascendant/abyssal/abyssal_tide.webp'),
  mote:require('../../assets/ascendant/abyssal/abyssal_mote.webp'),
  aura:require('../../assets/ascendant/abyssal/abyssal_aura.webp'),
 },
 standardBorder:require('../../assets/ascendant/abyssal/crown_of_the_depths_standard.webp'),
 backgroundSquare:require('../../assets/ascendant/abyssal/forgotten_abyss_square.webp'),
 petRegular:require('../../assets/ascendant/abyssal/nhalzuun_96.webp'),
 petPortrait:require('../../assets/ascendant/abyssal/nhalzuun_512.webp'),
 badge:require('../../assets/ascendant/abyssal/monarch_of_the_deep_64.webp'),
 badgePortrait:require('../../assets/ascendant/abyssal/monarch_of_the_deep_256.webp'),
};
export function getAbyssalReviewAssets():AbyssalAssetBundle{return BUNDLE;}
