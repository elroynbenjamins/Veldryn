import type {ImageSourcePropType} from 'react-native';
import {masterCompanionSourceById} from './master-roster-assets';
import {eventCompanionSourceById} from './event-collectible-assets';
import {eventCompanionV1SourceById} from './event-collectible-v1-assets';

/**
 * Canonical companion-art resolver.
 *
 * Permanent UNIT_001–UNIT_024 artwork comes from the master roster.
 * Annual EVT_UNIT_* artwork comes from the event pack. V1 aliases remain a
 * compatibility fallback only.
 */
export function companionArtSource(id:string):ImageSourcePropType|undefined{
  return masterCompanionSourceById.get(id)
    ??eventCompanionSourceById.get(id)
    ??eventCompanionV1SourceById.get(id);
}
