import type {ImageSourcePropType} from 'react-native';

/** Only visuals for the currently released event belong in the mobile bundle. */
export const eventPetSourceById=new Map<string,ImageSourcePropType>([
 ['EVT_PET_011',require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_011_Pumpkin_Piglet.png')],
 ['EVT_PET_012',require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_012_Golden_Sheafling.png')],
]);
export const eventCompanionSourceById=new Map<string,ImageSourcePropType>([
 ['EVT_UNIT_006',require('../../assets/event_collectibles/harvestwake/companions/EVT_UNIT_006_Harvest_Guardian.png')],
]);
