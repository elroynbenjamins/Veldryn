import type {ImageSourcePropType} from 'react-native';
import type {CelestialPreviewAssets} from '../components/profile/CelestialSovereignPreview';

/** Reserved candidate identifiers, not a server catalogue or entitlement grant.
 * Coordinate with the authoritative catalogue before enabling rendering. */
export const CELESTIAL_IDS={
 background:'ascendant-celestial-astral-sanctum',
 border:'ascendant-celestial-crown-of-the-cosmos',
 pet:'ascendant-celestial-aetherion',
 showcase:'ascendant-celestial-alignment',
 badge:'ascendant-celestial-sovereign-of-the-stars',
} as const;
export type CelestialAssetBundle={
 scene:CelestialPreviewAssets;
 backgroundSquare:ImageSourcePropType;
 petRegular:ImageSourcePropType;
 petPortrait:ImageSourcePropType;
 badge:ImageSourcePropType;
};
/** Fail closed until the binary overlay is committed. Do not use remote placeholders. */
export function getCelestialAssetBundle():CelestialAssetBundle|undefined{return undefined;}
/** Separate activation gate: asset presence must never unlock commerce or grant equipment. */
export function celestialVisualsEnabled():boolean{return false;}
export function celestialVisualSelection(backgroundId:string|undefined|null,borderId:string|undefined|null){
 return backgroundId===CELESTIAL_IDS.background&&borderId===CELESTIAL_IDS.border;
}
export function getEnabledCelestialAssets(){
 return celestialVisualsEnabled()?getCelestialAssetBundle():undefined;
}
