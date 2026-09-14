import type {ImageSourcePropType} from 'react-native';
import {EVENT_DECORATIONS} from './event-decoration-assets';

export const profileBorderSourceById=new Map<string,ImageSourcePropType>([
  ['frame_amber_vine',require('../../assets/profile-borders/frame_amber_vine.png')],
  ['frame_wheat_crown',require('../../assets/profile-borders/frame_wheat_crown.png')],
  ...EVENT_DECORATIONS.map(({borderId,border}):[string,ImageSourcePropType]=>[borderId,border]),
]);
