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
  TRAVEL_RATION:require('../../assets/food-v2/travel_ration.png'),
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
  BP_ASTER_IRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_ASTER_IRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_IRONWOOD_ROD:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_OATHSTONE_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_OATHSTONE_HATCHET:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_OATHSCALE_ROD:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_FROSTIRON_PICKAXE:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_FROSTIRON_HATCHET:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  BP_RIMEGLASS_ROD:require('../../assets/ingredient-icons-v1/astral_script_icon.webp'),
  // High-resolution overrides for the legacy herb atlas and embedded water sprite.
  DEWLEAF:require('../../assets/ingredient-icons-v1/dewleaf.png'),
  RIVER_MINT:require('../../assets/ingredient-icons-v1/river_mint_runtime.webp'),
  IRONBLOOM:require('../../assets/ingredient-icons-v1/ironbloom_runtime.webp'),
  CAVELICHEN:require('../../assets/ingredient-icons-v1/cavelichen.png'),
  CROWN_SAGE:require('../../assets/ingredient-icons-v1/crown_sage.webp'),
  OATHBLOSSOM:require('../../assets/ingredient-icons-v1/oathblossom.webp'),
  SUNSCALE:require('../../assets/ingredient-icons-v1/sunscale.png'),
  FROSTBLOOM:require('../../assets/ingredient-icons-v1/frostbloom.png'),
  ASHEN_MYRRH:require('../../assets/ingredient-icons-v1/ashen_myrrh.webp'),
  HOLY_WATER:require('../../assets/ingredient-icons-v1/holy_water.png'),
  // High-resolution overrides for the legacy potion and arcane-material atlases.
  DEWLEAF_DRAUGHT:require('../../assets/ingredient-icons-v1/dewleaf_draught.png'),
  RIVERHEART_DRAUGHT:require('../../assets/ingredient-icons-v1/riverheart_draught.png'),
  OATHBLOOM_DRAUGHT:require('../../assets/ingredient-icons-v1/oathbloom_draught.png'),
  VIGOR_TONIC:require('../../assets/ingredient-icons-v1/vigor_tonic.png'),
  GREATER_VIGOR_TONIC:require('../../assets/ingredient-icons-v1/greater_vigor_tonic.png'),
  OATH_VIGOR_TONIC:require('../../assets/ingredient-icons-v1/oath_vigor_tonic.png'),
  WARD_TONIC:require('../../assets/ingredient-icons-v1/ward_tonic.png'),
  GREATER_WARD_TONIC:require('../../assets/ingredient-icons-v1/greater_ward_tonic.png'),
  OATH_WARD_TONIC:require('../../assets/ingredient-icons-v1/oath_ward_tonic.png'),
  ASTRAL_SCRIPT:require('../../assets/ingredient-icons-v1/astral_script.png'),
  RUNEBOUND_CORE:require('../../assets/ingredient-icons-v1/runebound_core.png'),
  // The regional atlas cell was clipping the venom bottle at small sizes.
  SCORPION_VENOM:require('../../assets/ingredient-icons-v1/scorpion_venom.png'),
};

export function resourceIconSource(itemId:string){return resourceIconSourceById[itemId];}
export function hasResourceArtwork(itemId:string){return hasConsumableArtwork(itemId)||hasMiscItemArtwork(itemId)||hasAsterfallIngredientArtwork(itemId)||hasAsterfallOreArtwork(itemId)||hasAsterfallGatheringArtwork(itemId)||hasArcaneMaterialArtwork(itemId)||hasRegionalResourceArtwork(itemId)||!!resourceIconSource(itemId);}
