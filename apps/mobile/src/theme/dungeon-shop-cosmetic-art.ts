import type {ImageSourcePropType} from 'react-native';
import {profileIconArtwork} from './profile-icon-assets';
import {profileBorderSourceById} from './profile-border-assets';
import {profileBackgroundPreviewById} from './profile-background-assets';

/** Catalogue SKU -> permanent account reward ID.
 * Use the same resolved artwork in the shop, profile gallery and showcase. */
const DUNGEON_SHOP_COSMETIC_REWARDS:Readonly<Record<string,{kind:'icon'|'border'|'background';rewardId:string}>>={
 dshop_asterfall_icon:{kind:'icon',rewardId:'dungeon:asterfall:wardens-lantern'},
 dshop_sunscar_icon:{kind:'icon',rewardId:'dungeon:sunscar:solar-vault-key'},
 dshop_frostmarch_icon:{kind:'icon',rewardId:'dungeon:frostmarch:resonant-bell'},
 dshop_asterfall_border:{kind:'border',rewardId:'dungeon:asterfall:briarbound-frame'},
 dshop_sunscar_border:{kind:'border',rewardId:'dungeon:sunscar:amberglass-loop'},
 dshop_frostmarch_border:{kind:'border',rewardId:'dungeon:frostmarch:frostbound-chime'},
 dshop_asterfall_background:{kind:'background',rewardId:'dungeon:asterfall:rootbound-sanctuary'},
 dshop_sunscar_background:{kind:'background',rewardId:'dungeon:sunscar:buried-observatory'},
 dshop_frostmarch_background:{kind:'background',rewardId:'dungeon:frostmarch:shiverlake-reflections'},
};
export function dungeonShopCosmeticOfferArt(offerId:string):ImageSourcePropType|undefined{
 const reward=DUNGEON_SHOP_COSMETIC_REWARDS[offerId];
 if(!reward)return undefined;
 return reward.kind==='icon'?profileIconArtwork(reward.rewardId)
  :reward.kind==='border'?profileBorderSourceById.get(reward.rewardId)
  :profileBackgroundPreviewById.get(reward.rewardId)?.source;
}
