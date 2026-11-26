/** Stormforged authoring motion data. Not an alternate wardrobe or preview UI.
 * Final PNG geometry and sprite names must be matched before registry import.
 * No ownership, readiness or runtime rendering is enabled by this fixture. */
import type {MotionTrack} from '../core/profile-cosmetic-motion-v2';
export const STORMFORGED_EFFECT_PERIOD_MS=10800;
export const STORMFORGED_GLOW_PERIOD_MS=12000;
export const STORMFORGED_GLOWS=[
 {name:'top-capacitor',periodMs:3200,phaseMs:0,peakOpacity:.86},
 {name:'upper-right',periodMs:2800,phaseMs:570,peakOpacity:.86},
 {name:'right-conduit',periodMs:3100,phaseMs:1100,peakOpacity:.86},
 {name:'lower-right',periodMs:3500,phaseMs:1680,peakOpacity:.86},
 {name:'bottom-capacitor',periodMs:3200,phaseMs:2320,peakOpacity:.86},
 {name:'lower-left',periodMs:3500,phaseMs:2890,peakOpacity:.86},
 {name:'left-conduit',periodMs:3100,phaseMs:3510,peakOpacity:.86},
 {name:'upper-left',periodMs:2800,phaseMs:4140,peakOpacity:.86},
] as const;
type Sprite='lightning-spark'|'charged-shard'|'storm-glint';
export const STORMFORGED_TRACKS:readonly (MotionTrack&{sprite:Sprite})[]=[
 {sprite:'lightning-spark',points:[[.08,.78],[.18,.64],[.15,.40],[.28,.21]],phase:4,width:.038,maxDp:17,opacity:.70,rotation:35,cycles:1.15},
 {sprite:'lightning-spark',points:[[.92,.18],[.82,.33],[.86,.54],[.73,.73]],phase:27,width:.034,maxDp:16,opacity:.64,rotation:-40,cycles:1.1},
 {sprite:'charged-shard',points:[[.22,.90],[.33,.71],[.29,.51],[.43,.35]],phase:49,width:.030,maxDp:14,opacity:.56,rotation:105,cycles:1},
 {sprite:'charged-shard',points:[[.67,.88],[.77,.72],[.73,.51],[.87,.34]],phase:72,width:.026,maxDp:12,opacity:.48,rotation:-90,cycles:.95},
 {sprite:'storm-glint',points:[[.56,.22],[.65,.29],[.75,.18],[.86,.26]],phase:96,width:.022,maxDp:10,opacity:.42,rotation:0,cycles:.85},
];
