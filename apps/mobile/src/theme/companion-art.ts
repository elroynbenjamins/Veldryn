import type {ImageSourcePropType} from 'react-native';
import {masterCompanionSourceById} from './master-roster-assets';
import {eventCompanionSourceById} from './event-collectible-assets-active';
import {companionPortraits} from './upgraded-artwork';

const guildCompanionSourceById=new Map<string,ImageSourcePropType>([
 ['GUILD_UNIT_001',require('../../assets/guild-token-shop/companions/GUILD_UNIT_001_Stormwatch_Sentinel.png')],
 ['GUILD_UNIT_002',require('../../assets/guild-token-shop/companions/GUILD_UNIT_002_Oathbound_Seeker.png')],
 ['GUILD_UNIT_003',require('../../assets/guild-token-shop/companions/GUILD_UNIT_003_Dawncall_Herald.png')],
]);

/**
 * Canonical companion-art resolver.
 *
 * Permanent UNIT_001–UNIT_024 artwork comes from the master roster.
 * Annual EVT_UNIT_* artwork comes from the event pack.
 */
export function companionArtSource(id:string):ImageSourcePropType|undefined{
  return companionPortraits.get(id)
    ??masterCompanionSourceById.get(id)
    ??eventCompanionSourceById.get(id)
    ??guildCompanionSourceById.get(id);
}
