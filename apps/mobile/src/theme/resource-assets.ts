import {ingredientIcons} from './ingredient-assets';
import {craftedItemIcons} from './crafted-item-assets';
import type {ImageSourcePropType} from 'react-native';
import {coreMaterialIconSourceById} from './core-material-assets';
import {hasRegionalResourceArtwork} from './regional-resource-assets';
import {hasRemainingItemArtwork} from './remaining-item-assets';
import {hasRuntimeItemArtwork} from './runtime-item-assets';

/** Canonical gathering yields with production-ready transparent pixel artwork. */
export const resourceIconSourceById:Readonly<Partial<Record<string,ImageSourcePropType>>>={
  ...coreMaterialIconSourceById,
  ...craftedItemIcons,
  ...ingredientIcons,
  COPPER_ORE:require('../../assets/items/resources/copper_ore.png'),
  ASTER_IRON_ORE:require('../../assets/items/resources/aster_iron_ore.png'),
  OATHSTONE_ORE:require('../../assets/items/resources/oathstone_ore.png'),
  ECHO_QUARTZ:require('../../assets/items/resources/echo_quartz.png'),
  GREENWOOD_LOG:require('../../assets/items/resources/greenwood_log.png'),
  IRONWOOD_LOG:require('../../assets/items/resources/ironwood_log.png'),
  CROWNWOOD_LOG:require('../../assets/items/resources/crownwood_log.png'),
  SILVERFIN:require('../../assets/items/resources/silverfin.png'),
  RIVER_EEL:require('../../assets/items/resources/river_eel.png'),
  OATHSCALE_PIKE:require('../../assets/items/resources/oathscale_pike.png'),
};

export function resourceIconSource(itemId:string){return resourceIconSourceById[itemId];}
export function hasResourceArtwork(itemId:string){return hasRuntimeItemArtwork(itemId)||hasRegionalResourceArtwork(itemId)||!!resourceIconSource(itemId);}
