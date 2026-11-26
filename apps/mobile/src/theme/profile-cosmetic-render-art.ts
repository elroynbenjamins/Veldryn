import type {ImageSourcePropType} from 'react-native';
import {PROFILE_COSMETIC_ART,type CosmeticArt} from './profile-cosmetic-art-v1';
import {WAVE2_ART,WAVE2_PORTRAIT_ART} from './profile-cosmetic-wave2-assets';
import {wave2Ready} from '../core/profile-cosmetic-wave2';
/** Keep the pinned legacy V3 art registry intact. New art uses the same native
 * rendering layers, without borrowing reward art or creating a preview UI. */
export type Wave2CosmeticArt=Omit<CosmeticArt,'motionProfile'|'matte'>&{
 motionProfile:'tideborne'|'clockwork';matte?:ImageSourcePropType;
};
export type CosmeticRenderArt=CosmeticArt|Wave2CosmeticArt;
const readyWave2=WAVE2_ART.filter(row=>wave2Ready('border',row.borderId)&&wave2Ready('effect',row.effectId));
const art:readonly CosmeticRenderArt[]=[...PROFILE_COSMETIC_ART,...readyWave2];
export const cosmeticArtByBorder=new Map(art.map(row=>[row.borderId,row]));
export const cosmeticArtByEffect=new Map(art.map(row=>[row.effectId,row]));
export function wave2PortraitArtwork(id:string){
 return wave2Ready('icon',id)?WAVE2_PORTRAIT_ART[id]:undefined;
}
