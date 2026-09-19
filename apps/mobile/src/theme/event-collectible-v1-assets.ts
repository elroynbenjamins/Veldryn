import type {ImageSourcePropType} from 'react-native';

// v1 used a different companion and seasonal-pet numbering scheme. These aliases
// keep its artwork compatible with the canonical v2 catalog IDs.
export const eventPetV1SourceById=new Map<string,ImageSourcePropType>([
  ['EVT_PET_001',require('../../assets/event_collectibles_v1/EVT_PET_001.png')],
  ['EVT_PET_002',require('../../assets/event_collectibles_v1/EVT_PET_002.png')],
  ['EVT_PET_003',require('../../assets/event_collectibles_v1/EVT_PET_003.png')],
  ['EVT_PET_004',require('../../assets/event_collectibles_v1/EVT_PET_004.png')],
  ['EVT_PET_005',require('../../assets/event_collectibles_v1/EVT_PET_005.png')],
  ['EVT_PET_006',require('../../assets/event_collectibles_v1/EVT_PET_006.png')],
  ['EVT_PET_007',require('../../assets/event_collectibles_v1/EVT_PET_007.png')],
  ['EVT_PET_008',require('../../assets/event_collectibles_v1/EVT_PET_008.png')],
  ['EVT_PET_011',require('../../assets/event_collectibles_v1/EVT_PET_011.png')],
  ['EVT_PET_012',require('../../assets/event_collectibles_v1/EVT_PET_012.png')],
  ['EVT_PET_014',require('../../assets/event_collectibles_v1/EVT_PET_014.png')],
  ['EVT_PET_015',require('../../assets/event_collectibles_v1/EVT_PET_015.png')],
  ['EVT_PET_016',require('../../assets/event_collectibles_v1/EVT_PET_016.png')],
  ['EVT_PET_017',require('../../assets/event_collectibles_v1/EVT_PET_017.png')],
  ['EVT_PET_018',require('../../assets/event_collectibles_v1/EVT_PET_018.png')],
  ['EVT_PET_019',require('../../assets/event_collectibles_v1/EVT_PET_019.png')],
]);

export const eventCompanionV1SourceById=new Map<string,ImageSourcePropType>([
  ['EVT_UNIT_002',require('../../assets/event_collectibles_v1/EVT_UNIT_002.png')],
  ['EVT_UNIT_003',require('../../assets/event_collectibles_v1/EVT_UNIT_003.png')],
  ['EVT_UNIT_004',require('../../assets/event_collectibles_v1/EVT_UNIT_004.png')],
  ['EVT_UNIT_006',require('../../assets/event_collectibles_v1/EVT_UNIT_006.png')],
  ['EVT_UNIT_008',require('../../assets/event_collectibles_v1/EVT_UNIT_008.png')],
  ['EVT_UNIT_009',require('../../assets/event_collectibles_v1/EVT_UNIT_009.png')],
  ['EVT_UNIT_010',require('../../assets/event_collectibles_v1/EVT_UNIT_010.png')],
]);
