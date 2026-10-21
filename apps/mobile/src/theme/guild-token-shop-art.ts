import type {ImageSourcePropType} from 'react-native';
import {chatEmoteArtwork} from './chat-emote-assets';

/** Permanent Guild Token Shop artwork. These IDs are the server catalogue SKUs. */
export const guildTokenIcon:ImageSourcePropType=require('../../assets/guild-token-shop/guild-token.png');

const offerArt=new Map<string,ImageSourcePropType>([
 ['guild_pet_01',require('../../assets/guild-token-shop/pets/GUILD_PET_001_Stormwatch_Fox.png')],
 ['guild_pet_02',require('../../assets/guild-token-shop/pets/GUILD_PET_002_Oathwood_Wyrmling.png')],
 ['guild_companion_01',require('../../assets/guild-token-shop/companions/GUILD_UNIT_001_Stormwatch_Sentinel.png')],
 ['guild_companion_02',require('../../assets/guild-token-shop/companions/GUILD_UNIT_002_Oathbound_Seeker.png')],
 ['guild_companion_03',require('../../assets/guild-token-shop/companions/GUILD_UNIT_003_Dawncall_Herald.png')],
 ['border_silver',require('../../assets/profile-borders/guild-border-silver.png')],
 ['border_emerald',require('../../assets/profile-borders/guild-border-emerald.png')],
 ['border_royal',require('../../assets/profile-borders/guild-border-royal.png')],
 ['icon_guild',require('../../assets/profile-icons-v1/guild-stormwatch-crest.png')],
 ['emotes_fellowship',chatEmoteArtwork('pet_set_a_01')!],
 ['emotes_adventure',chatEmoteArtwork('pet_set_a_06')!],
 ['emotes_legends',chatEmoteArtwork('pet_set_b_01')!],
]);

export function guildTokenShopOfferArt(itemId:string):ImageSourcePropType|undefined{
 return offerArt.get(itemId);
}
