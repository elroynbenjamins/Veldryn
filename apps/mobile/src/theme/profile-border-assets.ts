import type {ImageSourcePropType} from 'react-native';
import {EVENT_DECORATIONS} from './event-decoration-assets-active';
import {dungeonShopBorderArt} from './dungeon-shop-art';

export const profileBorderSourceById=new Map<string,ImageSourcePropType>([
  ['frame_amber_vine',require('../../assets/profile-borders/frame_amber_vine.webp')],
  ['frame_wheat_crown',require('../../assets/profile-borders/frame_wheat_crown.webp')],
  ['frame_gloamward',require('../../assets/profile-borders/frame_gloamward.png')],
  ['guild-border-silver',require('../../assets/profile-borders/guild-border-silver.png')],
  ['guild-border-emerald',require('../../assets/profile-borders/guild-border-emerald.png')],
  ['guild-border-royal',require('../../assets/profile-borders/guild-border-royal.png')],
  ...Object.entries(dungeonShopBorderArt),
  ...EVENT_DECORATIONS.map(({borderId,border}):[string,ImageSourcePropType]=>[borderId,border]),
]);
