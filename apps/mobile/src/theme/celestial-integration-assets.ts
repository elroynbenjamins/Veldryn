import type {ImageSourcePropType} from 'react-native';
import type {CelestialPreviewAssets} from '../components/profile/CelestialSovereignPreview';
import {CELESTIAL_IDS} from '../core/ascendant-cosmetics';
export {CELESTIAL_IDS} from '../core/ascendant-cosmetics';

const background=require('../../assets/ascendant/celestial/celestial_background_wide.webp') as ImageSourcePropType;
const petRegular=require('../../assets/ascendant/celestial/aetherion_runtime.webp') as ImageSourcePropType;

const scene:CelestialPreviewAssets={
 background,
 border:require('../../assets/ascendant/celestial/celestial_border.webp'),
 petShowcase:require('../../assets/ascendant/celestial/celestial_pet_showcase.webp'),
 smoothPoseAtlas:require('../../assets/ascendant/celestial/aetherion_smooth_pose_atlas.webp'),
 orrery:require('../../assets/ascendant/celestial/celestial_orrery.webp'),
 star:require('../../assets/ascendant/celestial/celestial_star.webp'),
 corona:require('../../assets/ascendant/celestial/celestial_corona.webp'),
 fallbackGlow:require('../../assets/ascendant/celestial/celestial_fallback_glow.webp'),
};

export type CelestialAssetBundle={
 scene:CelestialPreviewAssets;
 backgroundSquare:ImageSourcePropType;
 petRegular:ImageSourcePropType;
 petPortrait:ImageSourcePropType;
 badge:ImageSourcePropType;
};

const BUNDLE:CelestialAssetBundle={
 scene,
 // The reviewed art is authored wide. CardBackground cover-crops it on square surfaces.
 backgroundSquare:background,
 petRegular,
 // Regular Aetherion artwork is intentionally used outside the dedicated showcase.
 petPortrait:petRegular,
 badge:require('../../assets/ascendant/celestial/sovereign_badge_64.webp'),
};

export function getCelestialAssetBundle():CelestialAssetBundle{return BUNDLE;}

export function celestialVisualSelection(backgroundId:string|undefined|null,borderId:string|undefined|null){
 return backgroundId===CELESTIAL_IDS.background&&borderId===CELESTIAL_IDS.border;
}
/** Rendering availability is intentionally independent from wardrobe discovery.
 * Other players must be able to see a granted member's ultra-luxe profile. */
export function getEnabledCelestialAssets(){return BUNDLE;}
