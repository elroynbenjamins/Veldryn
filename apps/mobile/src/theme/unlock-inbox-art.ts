import type {ImageSourcePropType} from 'react-native';
import type {UnlockInboxEntry} from '../core/unlock-inbox';
import {profileBackgroundPreviewById} from './profile-background-assets';
import {profileBorderSourceById} from './profile-border-assets';
import {profileIconArtwork} from './profile-icon-assets';
import {petArtSource} from './pet-art';
import {chatEmoteArtwork} from './chat-emote-assets';
import {guildTokenShopOfferArt} from './guild-token-shop-art';
import {guildBannerSourceByKey,guildBorderSourceByKey,guildNameplateSourceByKey} from './guild-customization-assets';

/** Present the earned reward itself, never a substitute cosmetic's artwork.
 * Inbox records retain their canonical kind:id keys across save migrations.
 */
export function unlockInboxArtwork(row:Pick<UnlockInboxEntry,'kind'|'key'>):ImageSourcePropType|undefined{
 const prefix=row.kind+':';
 if(!row.key.startsWith(prefix))return undefined;
 const id=row.key.slice(prefix.length);
 if(!id)return undefined;
 switch(row.kind){
  case 'profile_icon':return profileIconArtwork(id);
  case 'background':return profileBackgroundPreviewById.get(id)?.source;
  case 'border':return profileBorderSourceById.get(id);
  case 'pet':return petArtSource(id);
  case 'emote':return chatEmoteArtwork(id);
  case 'guild_cosmetic':
   // Guild unlocks can be registered as shop SKUs, profile decorations or emotes.
   return guildTokenShopOfferArt(id)??guildBannerSourceByKey.get(id)??guildBorderSourceByKey.get(id)??guildNameplateSourceByKey.get(id)??profileBorderSourceById.get(id)??profileIconArtwork(id)??chatEmoteArtwork(id);
  case 'title':
   // Titles have names but no unique bitmap assets.
   return undefined;
 }
}
