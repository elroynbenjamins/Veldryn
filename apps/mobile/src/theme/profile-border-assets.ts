import type {ImageSourcePropType} from 'react-native';
import {EVENT_DECORATIONS} from './event-decoration-assets-active';

export const profileBorderSourceById=new Map<string,ImageSourcePropType>([
  ['frame_amber_vine',require('../../assets/profile-borders/frame_amber_vine.webp')],
  ['frame_wheat_crown',require('../../assets/profile-borders/frame_wheat_crown.webp')],
  ['frame_gloamward',require('../../assets/profile-borders/frame_gloamward.png')],
  ['guild-border-silver',require('../../assets/profile-borders/guild-border-silver.png')],
  ['guild-border-emerald',require('../../assets/profile-borders/guild-border-emerald.png')],
  ['guild-border-royal',require('../../assets/profile-borders/guild-border-royal.png')],
  ['dungeon:asterfall:briarbound-frame',require('../../assets/profile-borders/dungeon-asterfall-briarbound-frame.webp')],
  ['dungeon:sunscar:amberglass-loop',require('../../assets/profile-borders/dungeon-sunscar-amberglass-loop.webp')],
  ['dungeon:frostmarch:frostbound-chime',require('../../assets/profile-borders/dungeon-frostmarch-frostbound-chime.webp')],
  ...EVENT_DECORATIONS.map(({borderId,border}):[string,ImageSourcePropType]=>[borderId,border]),
]);
