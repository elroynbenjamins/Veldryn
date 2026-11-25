import type {ImageSourcePropType} from 'react-native';
import type {DraconicSceneAssets} from '../components/profile/DraconicDominionPreview';
export type DraconicAssetBundle={scene:DraconicSceneAssets;standardBorder:ImageSourcePropType;backgroundSquare:ImageSourcePropType;petRegular:ImageSourcePropType;petPortrait:ImageSourcePropType;badge:ImageSourcePropType};
const BUNDLE:DraconicAssetBundle={
 scene:{
  background:require('../../assets/ascendant/draconic/dominion_of_ash.webp'),
  border:require('../../assets/ascendant/draconic/throne_of_embers.webp'),
  dragon:require('../../assets/ascendant/draconic/vharaxis_showcase.webp'),
  smoothPoseAtlas:require('../../assets/ascendant/draconic/vharaxis_smooth_pose_atlas.webp'),
  flames:require('../../assets/ascendant/draconic/awakening_flames.webp'),
  ember:require('../../assets/ascendant/draconic/ember.webp'),
  fallbackGlow:require('../../assets/ascendant/draconic/fallback_glow.webp'),
 },
 standardBorder:require('../../assets/ascendant/draconic/throne_of_embers_standard.webp'),
 backgroundSquare:require('../../assets/ascendant/draconic/dominion_of_ash_square.webp'),
 petRegular:require('../../assets/ascendant/draconic/vharaxis_96.webp'),
 petPortrait:require('../../assets/ascendant/draconic/vharaxis_512.webp'),
 badge:require('../../assets/ascendant/draconic/dragon_sovereign_64.webp'),
};
/** Art may render for everybody; discovery and equip are account-owned only. */
export function getDraconicAssets():DraconicAssetBundle|undefined{return BUNDLE;}
