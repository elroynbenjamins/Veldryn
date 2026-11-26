import type {ImageSourcePropType} from 'react-native';

type Slot='active'|'passive'|'bond';
const art:Readonly<Record<string,Readonly<Record<Slot,ImageSourcePropType>>>>={
 EVT_UNIT_012:{active:require('../../assets/event_collectibles/frostfall_festival/abilities/rimeshard_mark.png'),passive:require('../../assets/event_collectibles/frostfall_festival/abilities/aurora_pursuit.png'),bond:require('../../assets/event_collectibles/frostfall_festival/abilities/shattering_trail.png')},
 EVT_UNIT_013:{active:require('../../assets/event_collectibles/frostfall_festival/abilities/hearthguard_aegis.png'),passive:require('../../assets/event_collectibles/frostfall_festival/abilities/woolen_bulwark.png'),bond:require('../../assets/event_collectibles/frostfall_festival/abilities/hearthbound_vow.png')},
 EVT_UNIT_009:{active:require('../../assets/event_collectibles/frostfall_festival/abilities/frostbell_cycle.png'),passive:require('../../assets/event_collectibles/frostfall_festival/abilities/winter_cadence.png'),bond:require('../../assets/event_collectibles/frostfall_festival/abilities/grand_bell.png')},
};
export function frostfallCompanionAbilityArt(id:string,slot:Slot):ImageSourcePropType|undefined{return art[id]?.[slot];}
