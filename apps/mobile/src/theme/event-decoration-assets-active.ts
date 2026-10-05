import type {ImageSourcePropType} from 'react-native';

/** Released event decoration pack. Future event decorations stay source-only. */
export const EVENT_DECORATIONS:readonly {event:string;borderId:string;border:ImageSourcePropType;badge:ImageSourcePropType}[]=[
 {event:'Harvestwake',borderId:'frame_harvestwake_festival',
  border:require('../../assets/events-startup-v1/borders/frame_harvestwake_festival.webp'),
  badge:require('../../assets/events/harvestwake/badge.webp')},
];
