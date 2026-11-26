/** Crimson Oath authoring data only. No extra preview UI or release activation. */
import type {MotionTrack} from '../core/profile-cosmetic-motion-v2';
export const CRIMSON_EFFECT_PERIOD_MS=13200;
export const CRIMSON_GLOW_PERIOD_MS=12000;
export const CRIMSON_GLOWS=[
 {name:'top-ruby',periodMs:3300,phaseMs:0,peakOpacity:.86},
 {name:'upper-right',periodMs:2900,phaseMs:620,peakOpacity:.86},
 {name:'right-ruby',periodMs:3400,phaseMs:1190,peakOpacity:.86},
 {name:'lower-right',periodMs:3100,phaseMs:1740,peakOpacity:.86},
 {name:'bottom-ruby',periodMs:3300,phaseMs:2380,peakOpacity:.86},
 {name:'lower-left',periodMs:3100,phaseMs:2960,peakOpacity:.86},
 {name:'left-ruby',periodMs:3400,phaseMs:3560,peakOpacity:.86},
 {name:'upper-left',periodMs:2900,phaseMs:4240,peakOpacity:.86},
] as const;
type Sprite='scarlet-petal'|'ruby-mote'|'oath-glint';
export const CRIMSON_TRACKS:readonly (MotionTrack&{sprite:Sprite})[]=[
 {sprite:'scarlet-petal',points:[[.10,.12],[.18,.33],[.14,.58],[.28,.91]],phase:5,width:.037,maxDp:17,opacity:.68,rotation:145,cycles:.9},
 {sprite:'scarlet-petal',points:[[.88,.03],[.76,.26],[.82,.51],[.70,.89]],phase:29,width:.033,maxDp:15,opacity:.60,rotation:-160,cycles:1.05},
 {sprite:'scarlet-petal',points:[[.40,.10],[.30,.34],[.41,.58],[.36,.84]],phase:52,width:.030,maxDp:13,opacity:.56,rotation:180,cycles:.8},
 {sprite:'ruby-mote',points:[[.78,.82],[.84,.64],[.75,.42],[.90,.23]],phase:76,width:.026,maxDp:12,opacity:.52,rotation:-60,cycles:1.1},
 {sprite:'oath-glint',points:[[.15,.75],[.24,.58],[.17,.38],[.30,.25]],phase:96,width:.022,maxDp:10,opacity:.46,rotation:0,cycles:1},
];
