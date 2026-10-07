import type {ImageSourcePropType} from 'react-native';

export interface StartupScene {id:string;source:ImageSourcePropType}

export const GENERAL_STARTUP_SCENE:StartupScene={
  id:'kingdom-approach',
  source:require('../../assets/card-backgrounds/kingdom_approach_portrait.webp'),
};

export const VEILBREAK_STARTUP_SCENE:StartupScene={
  id:'veilbreak-2026',
  source:require('../../assets/card-backgrounds/veilbreak_portrait.webp'),
};

const STARTUP_EVENT_WINDOWS=[
  {
    id:'EVT_ANNUAL_010_2026',
    startsAtMs:Date.UTC(2026,9,10),
    endsAtMs:Date.UTC(2026,10,3),
    scene:VEILBREAK_STARTUP_SCENE,
  },
] as const;

/**
 * Startup artwork follows the published annual event window.
 * Outside an event window the app always uses neutral VELDRYN artwork.
 * Veilbreak is Oct 10 through Nov 2 inclusive (UTC), matching Live-Ops.
 */
export function startupSceneForTime(nowMs=Date.now()):StartupScene{
  return STARTUP_EVENT_WINDOWS.find(window=>nowMs>=window.startsAtMs&&nowMs<window.endsAtMs)?.scene??GENERAL_STARTUP_SCENE;
}

/** Call once in a lazy state initializer, so rerenders keep the selected scene. */
export function pickStartupScene():StartupScene {
  return startupSceneForTime(Date.now());
}

export const startupWordmark=require('../../assets/events-startup-v1/branding/veldryn_logo.webp');
