import type {ImageSourcePropType} from 'react-native';

/** Visual catalog only. Rewards and activation are defined by live-events. */
export const EVENT_DECORATIONS:readonly {event:string;borderId:string;border:ImageSourcePropType;badge:ImageSourcePropType}[]=[
  {event:'Harvestwake',borderId:'frame_harvestwake_festival',
    border:require('../../assets/events-startup-v1/borders/frame_harvestwake_festival.png'),
    badge:require('../../assets/events-startup-v1/badges/badge_harvestwake.png')},
  {event:"Winter's Bell",borderId:'frame_winters_bell_festival',
    border:require('../../assets/events-startup-v1/borders/frame_winters_bell_festival.png'),
    badge:require('../../assets/events-startup-v1/badges/badge_winters_bell.png')},
  {event:'Anniversary of Veldryn',borderId:'frame_firstlight_festival',
    border:require('../../assets/events-startup-v1/borders/frame_firstlight_festival.png'),
    badge:require('../../assets/events-startup-v1/badges/badge_firstlight.png')},
];
