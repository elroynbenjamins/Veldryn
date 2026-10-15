import type {ImageSourcePropType} from 'react-native';
export const dungeonPreparationArt={
 rootbound:require('../../assets/coop-ui/illustrations/rootbound_gate_v2.jpg'),
 gloam:require('../../assets/card-backgrounds/veilbreak_wide_v2.webp'),
} satisfies Record<string,ImageSourcePropType>;
export function seasonalDungeonArtwork(id:string,fallback?:ImageSourcePropType){return id.includes('VEILBREAK')?dungeonPreparationArt.gloam:fallback;}
