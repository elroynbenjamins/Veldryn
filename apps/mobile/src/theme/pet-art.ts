import type {ImageSourcePropType} from 'react-native';
import {masterPetSourceById} from './master-roster-assets';
import {eventPetSourceById} from './event-collectible-assets-active';

const guildPetSourceById=new Map<string,ImageSourcePropType>([
 ['GUILD_PET_001',require('../../assets/guild-token-shop/pets/GUILD_PET_001_Stormwatch_Fox.png')],
 ['GUILD_PET_002',require('../../assets/guild-token-shop/pets/GUILD_PET_002_Oathwood_Wyrmling.png')],
]);

/**
 * Canonical pet-art resolver used by collection surfaces.
 *
 * Master PET_001–PET_033 artwork is canonical. Event artwork remains available
 * for the separate annual event collection.
 */
export function petArtSource(id:string):ImageSourcePropType|undefined{
  return masterPetSourceById.get(id)
    ??eventPetSourceById.get(id)
    ??guildPetSourceById.get(id);
}

/**
 * Portrait-grade sources for expanded Collections detail.
 * Compact surfaces use optimized 256px runtime exports; full 1254px masters
 * are retained in art-review/pet-remaster/masters.
 */
const guildPetPortraitSourceById=new Map<string,ImageSourcePropType>([
 ['GUILD_PET_001',require('../../art-review/guild-token-shop-v1/GUILD_PET_001-stormwatch-fox-source.png')],
 ['GUILD_PET_002',require('../../art-review/guild-token-shop-v1/GUILD_PET_002-oathwood-wyrmling-source.png')],
]);

const masterPetPortraitSourceById=new Map<string,ImageSourcePropType>([
 ['PET_001',require('../../assets/master_roster/pets/portraits_512/PET_001_Pebblemole.png')],
 ['PET_002',require('../../assets/master_roster/pets/portraits_512/PET_002_Cinderchip.png')],
 ['PET_003',require('../../assets/master_roster/pets/portraits_512/PET_003_Twiglet.png')],
 ['PET_004',require('../../assets/master_roster/pets/portraits_512/PET_004_Mossback_Pup.png')],
 ['PET_005',require('../../assets/master_roster/pets/portraits_512/PET_005_Silverfin.png')],
 ['PET_006',require('../../assets/master_roster/pets/portraits_512/PET_006_Lantern_Carp_Fry.png')],
 ['PET_007',require('../../assets/master_roster/pets/portraits_512/PET_007_Briarbud.png')],
 ['PET_008',require('../../assets/master_roster/pets/portraits_512/PET_008_Gloamcap.png')],
 ['PET_009',require('../../assets/master_roster/pets/portraits_512/PET_009_Tusklet.png')],
 ['PET_010',require('../../assets/master_roster/pets/portraits_512/PET_010_Redfeather_Chick.png')],
 ['PET_011',require('../../assets/master_roster/pets/portraits_512/PET_011_Forge_Spark.png')],
 ['PET_012',require('../../assets/master_roster/pets/portraits_512/PET_012_Mini_Wretch.png')],
 ['PET_013',require('../../assets/master_roster/pets/portraits_512/PET_013_Mapwing.png')],
 ['PET_014',require('../../assets/master_roster/pets/portraits_512/PET_014_Pack_Mimic.png')],
 ['PET_015',require('../../assets/master_roster/pets/portraits_512/PET_015_Coinmouse.png')],
 ['PET_016',require('../../assets/master_roster/pets/portraits_512/PET_016_Echo_Wisp.png')],
 ['PET_017',require('../../assets/master_roster/pets/portraits_512/PET_017_Campfox.png')],
 ['PET_018',require('../../assets/master_roster/pets/portraits_512/PET_018_Oathling.png')],
 ['PET_019',require('../../assets/master_roster/pets/portraits_512/PET_019_Duneling.png')],
 ['PET_020',require('../../assets/master_roster/pets/portraits_512/PET_020_Mirage_Minnow.png')],
 ['PET_021',require('../../assets/master_roster/pets/portraits_512/PET_021_Sunscarab.png')],
 ['PET_022',require('../../assets/master_roster/pets/portraits_512/PET_022_Tiny_Sphinx.png')],
 ['PET_023',require('../../assets/master_roster/pets/portraits_512/PET_023_Tyrant_Larva.png')],
 ['PET_024',require('../../assets/master_roster/pets/portraits_512/PET_024_Snowpuff_Hare.png')],
 ['PET_025',require('../../assets/master_roster/pets/portraits_512/PET_025_Rimecap.png')],
 ['PET_026',require('../../assets/master_roster/pets/portraits_512/PET_026_Bellfin_Fry.png')],
 ['PET_027',require('../../assets/master_roster/pets/portraits_512/PET_027_Choir_Pebble.png')],
 ['PET_028',require('../../assets/master_roster/pets/portraits_512/PET_028_Wyrmling_Flake.png')],
 ['PET_029',require('../../assets/master_roster/pets/portraits_512/PET_029_Coalbug.png')],
 ['PET_030',require('../../assets/master_roster/pets/portraits_512/PET_030_Sootling.png')],
 ['PET_031',require('../../assets/master_roster/pets/portraits_512/PET_031_Ember_Eel_Fry.png')],
 ['PET_032',require('../../assets/master_roster/pets/portraits_512/PET_032_Forge_Imp.png')],
 ['PET_033',require('../../assets/master_roster/pets/portraits_512/PET_033_Cinder_Crownling.png')],
]);

export function petDetailArtSource(id:string):ImageSourcePropType|undefined{
 return masterPetPortraitSourceById.get(id)??eventPetSourceById.get(id)??guildPetPortraitSourceById.get(id);
}
