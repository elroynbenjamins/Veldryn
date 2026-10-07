import type {ImageSourcePropType} from 'react-native';
export const dungeonPreparationArt={
 rootbound:require('../../assets/dungeon-preparation-v2/rootbound-vault.jpg'),
 gloam:require('../../assets/dungeon-preparation-v2/gloam-breach.jpg'),
} satisfies Record<string,ImageSourcePropType>;
export function seasonalDungeonArtwork(id:string,fallback?:ImageSourcePropType){return id.includes('VEILBREAK')?dungeonPreparationArt.gloam:fallback;}
