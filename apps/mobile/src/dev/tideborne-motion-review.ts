/** Tideborne isolated motion fixture. Deliberately not imported by live catalogues,
 * wardrobe, profile rendering or store. Asset approval and native QA are separate. */
import {periodicCosmeticPhase,sampleCosmeticTrack,type MotionTrack} from '../core/profile-cosmetic-motion-v2';
import {profileSceneArtworkGlowBounds} from '../core/profile-frame-layout';
export const TIDEBORNE_EFFECT_PERIOD_MS=13200;
export const TIDEBORNE_GLOW_PERIOD_MS=12000;
export const TIDEBORNE_ACCENT='#94E4DD';
type Glow={name:string;x:number;y:number;sizeDp:number;periodMs:number;phaseMs:number;peakOpacity:number};
const G=(name:string,x:number,y:number,sizeDp:number,periodMs:number,phaseMs:number):Glow=>({name,x,y,sizeDp,periodMs,phaseMs,peakOpacity:.86});
export const TIDEBORNE_REVIEW_GLOWS=[
 G('top-pearl',.50065,.09049,9,3200,0),
 G('upper-right',.95828,.06032,8,3300,550),
 G('right-pearl',.97262,.529,9,3100,1100),
 G('lower-right',.95567,.93968,8,3500,1700),
 G('bottom-pearl',.50065,.96984,9,3200,2300),
 G('lower-left',.04433,.93968,8,3500,2900),
 G('left-pearl',.02347,.529,9,3100,3500),
 G('upper-left',.04433,.06032,8,3300,4100),
] as const;
type Sprite='bubble'|'seafoam'|'pearl-glint';
type Track=MotionTrack & {sprite:Sprite};
const T=(sprite:Sprite,points:MotionTrack['points'],phase:number,width:number,maxDp:number,opacity:number,rotation:number,cycles:number):Track=>({sprite,points,phase,width,maxDp,opacity,rotation,cycles});
export const TIDEBORNE_REVIEW_TRACKS=[
 T('bubble',[[.08,.98],[.12,.75],[.09,.44],[.17,.17]],8,.039,17,.7,0,1),
 T('bubble',[[.86,.96],[.92,.75],[.85,.48],[.92,.12]],31,.032,14,.58,0,.9),
 T('bubble',[[.22,.86],[.18,.62],[.23,.36],[.19,.12]],54,.025,11,.48,0,1.1),
 T('seafoam',[[.07,.84],[.15,.77],[.25,.80],[.35,.72]],76,.035,16,.55,15,.85),
 T('pearl-glint',[[.79,.68],[.86,.47],[.81,.27],[.89,.15]],95,.023,10,.5,0,1),
] as const;
export function tideborneGlowOpacity(g:Glow,clock:number){
 const f=periodicCosmeticPhase(clock,TIDEBORNE_GLOW_PERIOD_MS/g.periodMs,g.phaseMs/g.periodMs);
 return g.peakOpacity*(.06+.94*Math.sin(Math.PI*f)**3);
}
/** Pure sampling for review and future native interpolation construction, NOT a
 * per-frame React timer. Null size/hidden => no work; reduced motion is static. */
export function sampleTideborneReview(width:number,height:number,effectClock:number,glowClock:number,active=true,reduced=false){
 if(!active||![width,height,effectClock,glowClock].every(Number.isFinite)||width<=0||height<=0)return {glows:[],particles:[]};
 const glows=TIDEBORNE_REVIEW_GLOWS.flatMap(g=>{
  const bounds=profileSceneArtworkGlowBounds(width,height,g.x,g.y,Math.min(g.sizeDp,Math.max(4,width*.035)));
  return bounds?[{name:g.name,bounds,opacity:reduced?g.peakOpacity*.28:tideborneGlowOpacity(g,glowClock)}]:[];
 });
 const particles=TIDEBORNE_REVIEW_TRACKS.map(t=>({sprite:t.sprite,...sampleCosmeticTrack(t,reduced?.37:effectClock,width,height)}));
 return {glows,particles};
}
