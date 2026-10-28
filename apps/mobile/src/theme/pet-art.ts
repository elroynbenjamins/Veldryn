import type {ImageSourcePropType} from 'react-native';
import {masterPetSourceById} from './master-roster-assets';
import {eventPetSourceById} from './event-collectible-assets-active';

const guildPetSourceById=new Map<string,ImageSourcePropType>([
 ['GUILD_PET_001',require('../../assets/guild-token-shop/pets/GUILD_PET_001_Stormwatch_Fox.png')],
 ['GUILD_PET_002',require('../../assets/guild-token-shop/pets/GUILD_PET_002_Oathwood_Wyrmling.png')],
]);

/**
 * Canonical pet-art resolver used by collection surfaces.
 *
 * Master PET_001–PET_033 artwork is canonical. Event artwork remains available
 * for the separate annual event collection.
 */
export function petArtSource(id:string):ImageSourcePropType|undefined{
  return masterPetSourceById.get(id)
    ??eventPetSourceById.get(id)
    ??guildPetSourceById.get(id);
}

/**
 * Portrait-grade sources for the expanded Collections pet detail.
 * Keep the 96px runtime roster on the grid and other compact surfaces.
 * Guild masters already exist in the art-review catalog; permanent PET_001–033
 * do not yet have high-resolution masters in this repository.
 */
const guildPetPortraitSourceById=new Map<string,ImageSourcePropType>([
 ['GUILD_PET_001',require('../../art-review/guild-token-shop-v1/GUILD_PET_001-stormwatch-fox-source.png')],
 ['GUILD_PET_002',require('../../art-review/guild-token-shop-v1/GUILD_PET_002-oathwood-wyrmling-source.png')],
]);

export function petDetailArtSource(id:string):ImageSourcePropType|undefined{
 return eventPetSourceById.get(id)??guildPetPortraitSourceById.get(id);
}
