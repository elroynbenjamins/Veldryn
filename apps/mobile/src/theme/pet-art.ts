import type {ImageSourcePropType} from 'react-native';
import {masterPetSourceById} from './master-roster-assets';
import {eventPetSourceById} from './event-collectible-assets-active';

/**
 * Canonical pet-art resolver used by collection surfaces.
 *
 * Master PET_001–PET_033 artwork is canonical. Event artwork remains available
 * for the separate annual event collection.
 */
export function petArtSource(id:string):ImageSourcePropType|undefined{
  return masterPetSourceById.get(id)
    ??eventPetSourceById.get(id);
}
