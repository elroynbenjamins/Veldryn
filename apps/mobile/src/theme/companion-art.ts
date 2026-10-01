import type {ImageSourcePropType} from 'react-native';
import {masterCompanionSourceById} from './master-roster-assets';
import {eventCompanionSourceById} from './event-collectible-assets-active';
import {companionPortraits} from './upgraded-artwork';

/**
 * Canonical companion-art resolver.
 *
 * Permanent UNIT_001–UNIT_024 artwork comes from the master roster.
 * Annual EVT_UNIT_* artwork comes from the event pack.
 */
export function companionArtSource(id:string):ImageSourcePropType|undefined{
  return companionPortraits.get(id)
    ??masterCompanionSourceById.get(id)
    ??eventCompanionSourceById.get(id);
}
