import type {ImageSourcePropType} from 'react-native';
import type {Wave2CosmeticArt} from './profile-cosmetic-render-art';
// Exact Tideborne V2 and Clockwork review assets. Art import alone does not release or grant any set.
export const WAVE2_ART:readonly Wave2CosmeticArt[]=[{
 borderId:'cosmetic:tideborne:pearlframe',effectId:'effect_tideborne_tidal_reverie',
 border:require('../../assets/profile-cosmetics-wave2/tideborne/pearlframe.png'),wisp:require('../../assets/profile-cosmetics-wave2/tideborne/seafoam.png'),particle:require('../../assets/profile-cosmetics-wave2/tideborne/bubble.png'),staticEffect:require('../../assets/profile-cosmetics-wave2/tideborne/static-effect.png'),
 motion:'rise',motionProfile:'tideborne',effectPeriodMs:13200,
 glows:[
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[370,25,28,28],periodMs:3200,phaseMs:0,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[724,14,24,24],periodMs:3300,phaseMs:550,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[733,215,28,28],periodMs:3100,phaseMs:1100,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[722,394,24,24],periodMs:3500,phaseMs:1700,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[370,404,28,28],periodMs:3200,phaseMs:2300,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[22,394,24,24],periodMs:3500,phaseMs:2900,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[4,215,28,28],periodMs:3100,phaseMs:3500,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),sourceRect:[22,14,24,24],periodMs:3300,phaseMs:4100,peakOpacity:0.86},
 ],
 tracks:[
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/bubble.png'),points:[[0.08,0.98],[0.12,0.75],[0.09,0.44],[0.17,0.17]],phase:8,width:0.039,maxDp:17,opacity:0.7,rotation:0,cycles:1},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/bubble.png'),points:[[0.86,0.96],[0.92,0.75],[0.85,0.48],[0.92,0.12]],phase:31,width:0.032,maxDp:14,opacity:0.58,rotation:0,cycles:0.9},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/bubble.png'),points:[[0.22,0.86],[0.18,0.62],[0.23,0.36],[0.19,0.12]],phase:54,width:0.025,maxDp:11,opacity:0.48,rotation:0,cycles:1.1},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/seafoam.png'),points:[[0.07,0.84],[0.15,0.77],[0.25,0.8],[0.35,0.72]],phase:76,width:0.035,maxDp:16,opacity:0.55,rotation:15,cycles:0.85},
  {source:require('../../assets/profile-cosmetics-wave2/tideborne/pearl-glint.png'),points:[[0.79,0.68],[0.86,0.47],[0.81,0.27],[0.89,0.15]],phase:95,width:0.023,maxDp:10,opacity:0.5,rotation:0,cycles:1},
 ],
},{
 borderId:'cosmetic:clockwork:mechanism',effectId:'effect_clockwork_aetherwork_pulse',
 border:require('../../assets/profile-cosmetics-wave2/clockwork/mechanism.png'),wisp:require('../../assets/profile-cosmetics-wave2/clockwork/aether-spark.png'),particle:require('../../assets/profile-cosmetics-wave2/clockwork/gear-mote.png'),staticEffect:require('../../assets/profile-cosmetics-wave2/clockwork/static-effect.png'),
 motion:'rise',motionProfile:'clockwork',effectPeriodMs:12000,
 glows:[
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[370,25,28,28],periodMs:3200,phaseMs:0,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[712,18,24,24],periodMs:2800,phaseMs:550,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[734,215,24,28],periodMs:3000,phaseMs:1100,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[712,388,24,24],periodMs:3400,phaseMs:1700,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[370,396,28,28],periodMs:3200,phaseMs:2300,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[30,388,24,24],periodMs:3400,phaseMs:2900,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[6,215,24,28],periodMs:3000,phaseMs:3500,peakOpacity:0.86},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),sourceRect:[30,18,24,24],periodMs:2800,phaseMs:4100,peakOpacity:0.86},
 ],
 tracks:[
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/gear-mote.png'),points:[[0.12,0.85],[0.22,0.64],[0.34,0.42],[0.46,0.24]],phase:5,width:0.039,maxDp:17,opacity:0.68,rotation:190,cycles:1},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-spark.png'),points:[[0.81,0.86],[0.72,0.63],[0.82,0.42],[0.9,0.17]],phase:28,width:0.034,maxDp:15,opacity:0.65,rotation:-45,cycles:1.15},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),points:[[0.18,0.32],[0.31,0.38],[0.46,0.25],[0.6,0.2]],phase:49,width:0.029,maxDp:13,opacity:0.54,rotation:90,cycles:0.95},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/gear-mote.png'),points:[[0.66,0.74],[0.73,0.53],[0.8,0.31],[0.92,0.2]],phase:70,width:0.026,maxDp:12,opacity:0.47,rotation:-200,cycles:0.85},
  {source:require('../../assets/profile-cosmetics-wave2/clockwork/aether-glint.png'),points:[[0.28,0.83],[0.39,0.64],[0.52,0.54],[0.66,0.38]],phase:91,width:0.022,maxDp:10,opacity:0.43,rotation:0,cycles:1.1},
 ],
}];
export const WAVE2_PORTRAIT_ART:Readonly<Record<string,ImageSourcePropType>>={
 'cosmetic:tideborne:portrait-siren':require('../../assets/profile-cosmetics-wave2/tideborne/siren.png'),
 'cosmetic:tideborne:portrait-corsair':require('../../assets/profile-cosmetics-wave2/tideborne/corsair.png'),
 'cosmetic:clockwork:portrait-artificer':require('../../assets/profile-cosmetics-wave2/clockwork/artificer.png'),
 'cosmetic:clockwork:portrait-engineer':require('../../assets/profile-cosmetics-wave2/clockwork/engineer.png'),
};
