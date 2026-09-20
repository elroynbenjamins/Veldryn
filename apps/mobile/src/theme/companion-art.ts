import type {ImageSourcePropType} from 'react-native';
import {masterCompanionSourceById} from './master-roster-assets';
import {eventCompanionSourceById} from './event-collectible-assets';
import {eventCompanionV1SourceById} from './event-collectible-v1-assets';

export function companionArtSource(id:string):ImageSourcePropType|undefined{
  return masterCompanionSourceById.get(id)
    ??eventCompanionSourceById.get(id)
    ??eventCompanionV1SourceById.get(id);
}
