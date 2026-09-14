import type {ImageSourcePropType} from 'react-native';

export interface StartupScene {id:string;source:ImageSourcePropType}
export const STARTUP_SCENES:readonly StartupScene[]=[
  {id:'autumn-kingdom',source:require('../../assets/events-startup-v1/backgrounds/startup_harvestwake.png')},
  {id:'aurora-citadel',source:require('../../assets/events-startup-v1/backgrounds/startup_winters_bell.png')},
  {id:'firstlight-kingdom',source:require('../../assets/events-startup-v1/backgrounds/startup_firstlight.png')},
];
/** Call once in a lazy state initializer, so rerenders keep the scene. */
export function pickStartupScene():StartupScene {
  return STARTUP_SCENES[Math.floor(Math.random()*STARTUP_SCENES.length)];
}
export const startupWordmark=require('../../assets/events-startup-v1/branding/veldryn_logo.png');
