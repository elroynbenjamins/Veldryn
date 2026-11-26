import {DRACONIC_IDS} from '../core/draconic-showcase-layout';
import {getDraconicAssets} from './draconic-integration-assets';
const draconic=getDraconicAssets();
import type {ImageSourcePropType} from 'react-native';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from './celestial-integration-assets';
const celestial=getEnabledCelestialAssets();
export interface CardBackgroundSources{wide:ImageSourcePropType;square:ImageSourcePropType;portrait?:ImageSourcePropType}
/** Separate high-resolution compositions; small originals remain thumbnail assets. */
export const guildBackgroundSources=new Map<string,CardBackgroundSources>([
 ['guild_plaza',{wide:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),square:require('../../assets/card-backgrounds/guild_plaza_square.webp'),portrait:require('../../assets/card-backgrounds/guild_plaza_portrait.webp')}],
 ['forest_sanctum',{wide:require('../../assets/card-backgrounds/forest_sanctum_wide_v2.webp'),square:require('../../assets/card-backgrounds/forest_sanctum_square.webp'),portrait:require('../../assets/card-backgrounds/forest_sanctum_portrait.webp')}],
]);
const winterAurora=require('../../assets/events/frostfall/winter-hearth/background_frostfall_winter_aurora_2026.webp');
guildBackgroundSources.set('background_frostfall_winter_aurora_2026',{wide:winterAurora,square:winterAurora,portrait:winterAurora});
// Art reuse does not change personal cosmetic ownership or unlock rules.
export const personalBackgroundVariants=new Map<string,CardBackgroundSources>([
 ...(draconic?[[DRACONIC_IDS.background,{wide:draconic.scene.background,square:draconic.backgroundSquare}] as [string,CardBackgroundSources]]:[]),
 ...(celestial?[[CELESTIAL_IDS.background,{wide:celestial.scene.background,square:celestial.backgroundSquare}] as [string,CardBackgroundSources]]:[]),
 ['bg_forest_sanctum',guildBackgroundSources.get('forest_sanctum')!],
 ['bg_harvestwake',{wide:require('../../assets/card-backgrounds/harvestwake_wide_v2.webp'),square:require('../../assets/card-backgrounds/harvestwake_square_v2.webp'),portrait:require('../../assets/card-backgrounds/harvestwake_portrait.webp')}],
 ['bg_grand_storehouse',{wide:require('../../assets/card-backgrounds/grand_storehouse_wide_v2.webp'),square:require('../../assets/card-backgrounds/grand_storehouse_square_v2.webp'),portrait:require('../../assets/card-backgrounds/grand_storehouse_portrait.webp')}],
 ['bg_kingdom_approach',{wide:require('../../assets/card-backgrounds/kingdom_approach_wide_v2.webp'),square:require('../../assets/card-backgrounds/kingdom_approach_square_v2.webp'),portrait:require('../../assets/card-backgrounds/kingdom_approach_portrait.webp')}],
]);
