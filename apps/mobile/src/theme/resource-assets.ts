import {ingredientIcons} from './ingredient-assets';
import {craftedItemIcons} from './crafted-item-assets';
import type {ImageSourcePropType} from 'react-native';
import {coreMaterialIconSourceById} from './core-material-assets';
import {hasConsumableArtwork} from './consumable-assets';
import {hasMiscItemArtwork} from './misc-item-assets';
import {hasAsterfallIngredientArtwork} from './asterfall-ingredient-assets';
import {hasAsterfallOreArtwork} from './asterfall-ore-assets';
import {hasAsterfallGatheringArtwork} from './asterfall-gathering-assets';
import {hasArcaneMaterialArtwork} from './arcane-material-assets';
import {hasRegionalResourceArtwork} from './regional-resource-assets';

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
  WHITEPINE_LOG:require('../../assets/items/resources/whitepine_log.png'),
  ICEFIN:require('../../assets/items/resources/icefin.png'),
  MEADOW_PERCH:require('../../assets/items/resources/meadow_perch.png'),
  ROOTSTREAM_TROUT:require('../../assets/items/resources/rootstream_trout.png'),
  CAVE_LOACH:require('../../assets/items/resources/cave_loach.png'),
  CROWN_CARP:require('../../assets/items/resources/crown_carp.png'),
  EMBERFIN:require('../../assets/items/resources/emberfin.png'),
  // Gathering tool blueprints use the existing parchment/script pixel art until
  // a dedicated blueprint sheet is produced. Rarity treatment stays item-driven.
  BP_ASTER_IRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_ASTER_IRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_IRONWOOD_ROD:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_OATHSTONE_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_OATHSTONE_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_OATHSCALE_ROD:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_FROSTIRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_FROSTIRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.png'),
  BP_RIMEGLASS_ROD:require('../../assets/ingredient-icons-v1/astral_script.png'),
};

export function resourceIconSource(itemId:string){return resourceIconSourceById[itemId];}
export function hasResourceArtwork(itemId:string){return hasConsumableArtwork(itemId)||hasMiscItemArtwork(itemId)||hasAsterfallIngredientArtwork(itemId)||hasAsterfallOreArtwork(itemId)||hasAsterfallGatheringArtwork(itemId)||hasArcaneMaterialArtwork(itemId)||hasRegionalResourceArtwork(itemId)||!!resourceIconSource(itemId);}
