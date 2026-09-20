import type {ImageSourcePropType} from 'react-native';
import {eventPetSourceById} from './event-collectible-assets';
import {eventPetV1SourceById} from './event-collectible-v1-assets';
import {eventPetSourceById as legacyEventPetSourceById} from './event-pet-assets';

/**
 * Canonical pet-art resolver used by collection surfaces.
 *
 * Core PET_001–PET_033 artwork can be added as another map here once those
 * PNGs exist in the repository. Unknown/missing art deliberately returns
 * undefined so UI can render a stable fallback without inventing paths.
 */
export function petArtSource(id:string):ImageSourcePropType|undefined{
  return eventPetV1SourceById.get(id)
    ??eventPetSourceById.get(id)
    ??legacyEventPetSourceById.get(id);
}
