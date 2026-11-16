import type {ImageSourcePropType} from 'react-native';
export const dungeonPreparationArt={
 rootbound:require('../../assets/coop-ui/illustrations/rootbound_gate_v2.jpg'),
 gloam:require('../../assets/card-backgrounds/veilbreak_wide_v2.webp'),
 frostfall:require('../../assets/card-backgrounds/frostfall_square_v2.webp'),
 bloomwake:require('../../assets/card-backgrounds/bloomwake_square_v2.webp'),
 heartbond:require('../../assets/card-backgrounds/heartbond_square_v2.webp'),
 starfall:require('../../assets/card-backgrounds/starfall_square_v2.webp'),
} satisfies Record<string,ImageSourcePropType>;
/** Keep seasonal artwork tied to the expedition identity even before its full
 * seasonal visual bundle has been added to the client catalog. */
export function seasonalDungeonArtwork(id:string,fallback?:ImageSourcePropType){
 const key=id.toUpperCase();
 if(key.includes('VEILBREAK'))return dungeonPreparationArt.gloam;
 if(key.includes('FROSTFALL'))return dungeonPreparationArt.frostfall;
 if(key.includes('BLOOMWAKE'))return dungeonPreparationArt.bloomwake;
 if(key.includes('HEARTBOND'))return dungeonPreparationArt.heartbond;
 if(key.includes('STARFALL'))return dungeonPreparationArt.starfall;
 return fallback;
}
