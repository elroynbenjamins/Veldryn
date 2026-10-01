import type {ImageSourcePropType} from 'react-native';
export interface CardBackgroundSources{wide:ImageSourcePropType;square:ImageSourcePropType;portrait?:ImageSourcePropType}
/** Separate high-resolution compositions; small originals remain thumbnail assets. */
export const guildBackgroundSources=new Map<string,CardBackgroundSources>([
 ['guild_plaza',{wide:require('../../assets/card-backgrounds/guild_plaza_wide_v2.png'),square:require('../../assets/card-backgrounds/guild_plaza_square.png'),portrait:require('../../assets/card-backgrounds/guild_plaza_portrait.png')}],
 ['forest_sanctum',{wide:require('../../assets/card-backgrounds/forest_sanctum_wide_v2.png'),square:require('../../assets/card-backgrounds/forest_sanctum_square.png'),portrait:require('../../assets/card-backgrounds/forest_sanctum_portrait.png')}],
]);
// Art reuse does not change personal cosmetic ownership or unlock rules.
export const personalBackgroundVariants=new Map<string,CardBackgroundSources>([
 ['bg_forest_sanctum',guildBackgroundSources.get('forest_sanctum')!],
 ['bg_harvestwake',{wide:require('../../assets/card-backgrounds/harvestwake_wide_v2.png'),square:require('../../assets/card-backgrounds/harvestwake_square_v2.png'),portrait:require('../../assets/card-backgrounds/harvestwake_portrait.png')}],
 ['bg_grand_storehouse',{wide:require('../../assets/card-backgrounds/grand_storehouse_wide_v2.png'),square:require('../../assets/card-backgrounds/grand_storehouse_square_v2.png'),portrait:require('../../assets/card-backgrounds/grand_storehouse_portrait.png')}],
 ['bg_kingdom_approach',{wide:require('../../assets/card-backgrounds/kingdom_approach_wide_v2.png'),square:require('../../assets/card-backgrounds/kingdom_approach_square_v2.png'),portrait:require('../../assets/card-backgrounds/kingdom_approach_portrait.png')}],
]);
