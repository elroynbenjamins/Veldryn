import type {ImageSourcePropType} from 'react-native';
export type CosmeticGlow={source:ImageSourcePropType;sourceRect:readonly [number,number,number,number];periodMs:number;phaseMs:number;peakOpacity:number};
export type CosmeticMotionTrack={source:ImageSourcePropType;points:readonly (readonly [number,number])[];phase:number;width:number;maxDp:number;opacity:number;rotation:number;cycles:number};
export type CosmeticArt={borderId:string;effectId:string;border:ImageSourcePropType;matte:ImageSourcePropType;glows:readonly CosmeticGlow[];wisp:ImageSourcePropType;particle:ImageSourcePropType;staticEffect:ImageSourcePropType;motion:'drift'|'fall'|'rise';motionProfile:'gloamward'|'frostbound'|'amberglass'|'briarbound';effectPeriodMs:number;tracks:readonly CosmeticMotionTrack[]};
// Deliberately empty until the approved V3 binary assets and generated registry
// are imported together. Never turn missing assets into cosmetic entitlements.
export const PROFILE_COSMETIC_ART:readonly CosmeticArt[]=[];
export const cosmeticArtByBorder=new Map(PROFILE_COSMETIC_ART.map(a=>[a.borderId,a]));
export const cosmeticArtByEffect=new Map(PROFILE_COSMETIC_ART.map(a=>[a.effectId,a]));
