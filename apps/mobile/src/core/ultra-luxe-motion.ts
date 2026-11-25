/** Shared 24-second signature envelope, independent of ownership and pet selection. */
export const ULTRA_LUXE_CYCLE_MS=24000;
export const SIGNATURE_PHASE=[0,8/24,14/24,16/24,19/24,1] as const;
export const SIGNATURE_ENERGY=[0,0,.55,1,.48,0] as const;
/** Pre-sampled smoothstep between the approved choreography anchors. Native
 * interpolation only: no JS callbacks, overshoot or hard cuts at the peak. */
const curvePhase:number[]=[SIGNATURE_PHASE[0]],curveEnergy:number[]=[SIGNATURE_ENERGY[0]];
for(let i=1;i<SIGNATURE_PHASE.length;i++){
 const start=SIGNATURE_PHASE[i-1],end=SIGNATURE_PHASE[i];
 const from=SIGNATURE_ENERGY[i-1],to=SIGNATURE_ENERGY[i];
 for(let j=1;j<=4;j++){
  const t=j/4,ease=t*t*(3-2*t);
  curvePhase.push(j===4?end:start+(end-start)*t);
  curveEnergy.push(j===4?to:from+(to-from)*ease);
 }
}
export const SIGNATURE_CURVE_PHASE:readonly number[]=curvePhase;
export const SIGNATURE_CURVE_ENERGY:readonly number[]=curveEnergy;
/** Identity stays legible and fixed in its slot; only subtle light at alignment. */
export const SIGNATURE_TITLE_OPACITY=SIGNATURE_CURVE_ENERGY.map(e=>.96+.04*e);
export const SIGNATURE_BADGE_OPACITY=SIGNATURE_CURVE_ENERGY.map(e=>.92+.08*e);
export const SIGNATURE_BADGE_SCALE=SIGNATURE_CURVE_ENERGY.map(e=>1+.09*e);
export const SIGNATURE_PARTIAL_BADGE_SCALE=SIGNATURE_CURVE_ENERGY.map(e=>1+.04*e);
export const RAIL_PATH=[[26,12],[170,12],[314,12],[326,95],[314,190],[170,193],[26,190],[12,95],[26,12]] as const;
export const LOOP_PHASE=[0,.125,.25,.375,.5,.625,.75,.875,1] as const;
export const ORBIT_X=[-1,-.707,0,.707,1,.707,0,-.707,-1] as const;
export const ORBIT_Y=[0,-.707,-1,-.707,0,.707,1,.707,0] as const;
export const FX_POINTS={
 celestial:[[45,42],[79,27],[104,51],[233,35],[278,30],[302,55],[238,95],[318,130]],
 draconic:[[45,48],[81,40],[105,58],[225,52],[264,42],[301,58],[235,113],[313,146]],
} as const;
export function shiftClosed<T>(values:readonly T[],offset:number):T[]{
 const a=values.slice(0,-1),n=((offset%a.length)+a.length)%a.length;
 return [...a.slice(n),...a.slice(0,n),a[n]];
}

/** Smooth sampled, periodic idle motion on the existing native signature clock.
 * Six breathing cycles per 24 seconds, plus occasional attentive posture changes.
 * Sampling is done once, not in an animation frame callback. */
export const PET_IDLE_PHASE=Array.from({length:97},(_,i)=>i/96);
export type PetIdleKind='celestial'|'draconic'|'alternate';
export function petIdlePose(kind:PetIdleKind,t:number){
 const breath=(1-Math.cos(t*Math.PI*12))/2;
 const sway=Math.sin(t*Math.PI*8);
 const alert=Math.pow(Math.max(0,Math.sin(t*Math.PI*4)),8);
 const dragon=kind==='draconic',alternate=kind==='alternate';
 return {
  lift:-(alternate?1.8:dragon?1.0:1.6)*breath-(alternate?1:dragon?.3:1.2)*alert,
  scaleX:1+(alternate?.018:dragon?.006:.012)*breath,
  scaleY:1+(alternate?.025:dragon?.014:.022)*breath,
  tilt:(alternate?1.4:dragon?.35:1.25)*sway+(dragon?-.15:1)*alert,
  glow:.22+.4*breath,
 };
}
export const PET_IDLE_POSES=Object.fromEntries((['celestial','draconic','alternate'] as const).map(kind=>{
 const frames=PET_IDLE_PHASE.map(t=>petIdlePose(kind,t));
 // Make the loop endpoint exactly equal to its start, including floating-point rounding.
 frames[frames.length-1]=frames[0];
 return [kind,frames];
})) as Record<PetIdleKind,ReturnType<typeof petIdlePose>[]>;

/** Authored, closed-loop accents on the existing native clock. Each theme has a
 * visible early beat, a distinct sustained signature, and a smooth cooldown.
 * No additional timers, layers, or changes to the verified identity envelope. */
export const AWAKENING_PHASE=[0,2/24,4/24,7/24,10/24,13/24,16/24,18/24,21/24,1] as const;
export const AWAKENING_ENERGY={
 celestial:[0,.18,.42,.20,.40,.76,1,.80,.24,0],
 draconic:[0,.34,.64,.26,.52,.88,1,.65,.18,0],
} as const;
export const AWAKENING_PET_LIFT={celestial:7,draconic:2.5} as const;
export function awakeningCurve(theme:keyof typeof AWAKENING_ENERGY){
 const values=AWAKENING_ENERGY[theme],phase:number[]=[0],energy:number[]=[0];
 for(let i=1;i<AWAKENING_PHASE.length;i++){
  const start=AWAKENING_PHASE[i-1],end=AWAKENING_PHASE[i];
  for(let j=1;j<=4;j++){
   const t=j/4,ease=t*t*(3-2*t);
   phase.push(j===4?end:start+(end-start)*t);
   energy.push(j===4?values[i]:values[i-1]+(values[i]-values[i-1])*ease);
  }
 }
 return {phase,energy};
}
export const AWAKENING_CURVES={celestial:awakeningCurve('celestial'),draconic:awakeningCurve('draconic')};

/** Pet taps use bounded themed offsets in the existing pet-side safe zone.
 * Aetherion sends a symmetric constellation fan; Vharaxis sends rising embers. */
export const PET_REACTION_TRAJECTORIES={
 celestial:[{x:-12,y:2,dx:-12,dy:-18},{x:0,y:-8,dx:0,dy:-25},{x:12,y:2,dx:12,dy:-18}],
 draconic:[{x:-12,y:8,dx:-7,dy:-29},{x:0,y:3,dx:4,dy:-35},{x:12,y:8,dx:10,dy:-22}],
} as const;
export const PET_REACTION_GLOW={celestial:{scale:1.32,opacity:.82},draconic:{scale:1.38,opacity:.88}} as const;

/** Smooth, periodic lift for the existing atlas; no abrupt triangle-wave reversals. */
export const CELESTIAL_ATLAS_LIFT=PET_IDLE_PHASE.map(t=>t===1?0:-1.5*(1-Math.cos(t*Math.PI*12))/2);
/** Frame glows remain inside the stage while the smaller motes follow the authored edge. */
export const RAIL_GLOW_RADIUS=17;
export function railGlowPoint(point:readonly [number,number]):readonly [number,number]{
 const r=RAIL_GLOW_RADIUS;
 return [Math.max(r,Math.min(340-r,point[0])),Math.max(r,Math.min(205-r,point[1]))];
}
/** Ornament positions avoid the protected identity and guild plates. */
export const FRAME_ORNAMENTS={
 celestial:[[20,16],[310,16],[164,186]],
 draconic:[[13,91],[315,91],[164,184]],
} as const;
