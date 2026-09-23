import type {ImageSourcePropType} from 'react-native';

// All first-crafted sheets share a fixed 5 x 2 production grid. Keeping this
// registry in one place makes a new set a single asset entry instead of a new
// renderer implementation.
export const equipmentSheetBySet:Record<string,ImageSourcePropType>={
  ironwarden_recruit:require('../../assets/equipment-ui/ironwarden-recruit-icon-sheet.png'),
  wallkeeper_initiate:require('../../assets/equipment-ui/wallkeeper-initiate-icon-sheet.png'),
  chainwatch_novice:require('../../assets/equipment-ui/chainwatch-novice-icon-sheet.png'),
  sunlamp_acolyte:require('../../assets/equipment-ui/sunlamp-acolyte-icon-sheet.png'),
  trailbow_scout:require('../../assets/equipment-ui/trailbow-scout-icon-sheet.png'),
  breaksteel_marauder:require('../../assets/equipment-ui/breaksteel-marauder-icon-sheet.png'),
  runespark_adept:require('../../assets/equipment-ui/runespark-adept-icon-sheet.png'),
  twinstep_initiate:require('../../assets/equipment-ui/twinstep-initiate-icon-sheet.png'),
  earthseal_disciple:require('../../assets/equipment-ui/earthseal-disciple-icon-sheet.png'),
  'harvestwake-harvest-defender':require('../../assets/equipment-ui/event-harvestwake-harvest-defender-icon-sheet.png'),
  'harvestwake-granary-bastion':require('../../assets/equipment-ui/event-harvestwake-granary-bastion-icon-sheet.png'),
  'harvestwake-autumn-warden':require('../../assets/equipment-ui/event-harvestwake-autumn-warden-icon-sheet.png'),
  'harvestwake-hearthkeeper':require('../../assets/equipment-ui/event-harvestwake-hearthkeeper-icon-sheet.png'),
  'harvestwake-field-ranger':require('../../assets/equipment-ui/event-harvestwake-field-ranger-icon-sheet.png'),
  'harvestwake-reapers-guard':require('../../assets/equipment-ui/event-harvestwake-reapers-guard-icon-sheet.png'),
  'harvestwake-amber-brewer':require('../../assets/equipment-ui/event-harvestwake-amber-brewer-icon-sheet.png'),
  'harvestwake-harvest-blade':require('../../assets/equipment-ui/event-harvestwake-harvest-blade-icon-sheet.png'),
  'harvestwake-granary-keeper':require('../../assets/equipment-ui/event-harvestwake-granary-keeper-icon-sheet.png'),
  'echo-surge':require('../../assets/equipment-ui/event-echo-surge-icon-sheet.png'),
  'gatherers-week':require('../../assets/equipment-ui/event-gatherers-week-icon-sheet.png'),
  'guild-rally':require('../../assets/equipment-ui/event-guild-rally-icon-sheet.png'),
  'monster-hunt':require('../../assets/equipment-ui/event-monster-hunt-icon-sheet.png'),
  'coop-festival':require('../../assets/equipment-ui/event-coop-festival-icon-sheet.png'),
  'market-fair':require('../../assets/equipment-ui/event-market-fair-icon-sheet.png'),
  'anniversary-of-veldryn':require('../../assets/equipment-ui/event-anniversary-of-veldryn-icon-sheet.png'),
  'winters-bell':require('../../assets/equipment-ui/event-winters-bell-icon-sheet.png'),
};

export const equipmentArtworkSetByItemId:Partial<Record<string,string>>={};
