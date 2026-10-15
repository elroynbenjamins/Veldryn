import type {ImageSourcePropType} from 'react-native';

/** Permanently retained released-event visuals. Veilbreak is the first release. */
export const eventPetSourceById=new Map<string,ImageSourcePropType>([
 ['EVT_PET_013',require('../../assets/event_collectibles/veilbreak/pets/EVT_PET_013_Gloomkin_runtime.webp')],
 ['EVT_PET_014',require('../../assets/event_collectibles/veilbreak/pets/EVT_PET_014_Lantern_Mimic_runtime.webp')],
]);
export const eventCompanionSourceById=new Map<string,ImageSourcePropType>([
 ['EVT_UNIT_007',require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_007_Veil_Hound_runtime.webp')],
 ['EVT_UNIT_008',require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_008_Hollow_Knightling_runtime.webp')],
 ['EVT_UNIT_011',require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_011_Lantern_Keeper_runtime.webp')],
]);
