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
  COPPER_ORE:require('../../assets/items/resources/copper_ore.webp'),
  ASTER_IRON_ORE:require('../../assets/items/resources/aster_iron_ore.webp'),
  OATHSTONE_ORE:require('../../assets/items/resources/oathstone_ore.webp'),
  ECHO_QUARTZ:require('../../assets/items/resources/echo_quartz.webp'),
  GREENWOOD_LOG:require('../../assets/items/resources/greenwood_log.webp'),
  IRONWOOD_LOG:require('../../assets/items/resources/ironwood_log.webp'),
  CROWNWOOD_LOG:require('../../assets/items/resources/crownwood_log.webp'),
  SILVERFIN:require('../../assets/items/resources/silverfin.webp'),
  RIVER_EEL:require('../../assets/items/resources/river_eel.webp'),
  OATHSCALE_PIKE:require('../../assets/items/resources/oathscale_pike.webp'),
  WHITEPINE_LOG:require('../../assets/items/resources/whitepine_log.webp'),
  ICEFIN:require('../../assets/items/resources/icefin.webp'),
  MEADOW_PERCH:require('../../assets/items/resources/meadow_perch.webp'),
  ROOTSTREAM_TROUT:require('../../assets/items/resources/rootstream_trout.webp'),
  CAVE_LOACH:require('../../assets/items/resources/cave_loach.webp'),
  CROWN_CARP:require('../../assets/items/resources/crown_carp.webp'),
  EMBERFIN:require('../../assets/items/resources/emberfin.webp'),
  // Gathering tool blueprints use the existing parchment/script pixel art until
  // a dedicated blueprint sheet is produced. Rarity treatment stays item-driven.
  BP_ASTER_IRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_ASTER_IRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_IRONWOOD_ROD:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_OATHSTONE_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_OATHSTONE_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_OATHSCALE_ROD:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_FROSTIRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_FROSTIRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script.webp'),
  BP_RIMEGLASS_ROD:require('../../assets/ingredient-icons-v1/astral_script.webp'),
};

export function resourceIconSource(itemId:string){return resourceIconSourceById[itemId];}
export function hasResourceArtwork(itemId:string){return hasConsumableArtwork(itemId)||hasMiscItemArtwork(itemId)||hasAsterfallIngredientArtwork(itemId)||hasAsterfallOreArtwork(itemId)||hasAsterfallGatheringArtwork(itemId)||hasArcaneMaterialArtwork(itemId)||hasRegionalResourceArtwork(itemId)||!!resourceIconSource(itemId);}
