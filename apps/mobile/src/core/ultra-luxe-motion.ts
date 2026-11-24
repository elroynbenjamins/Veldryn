/** Shared 24-second signature envelope, independent of ownership and pet selection. */
export const ULTRA_LUXE_CYCLE_MS=24000;
export const SIGNATURE_PHASE=[0,8/24,14/24,16/24,19/24,1] as const;
export const SIGNATURE_ENERGY=[0,0,.55,1,.48,0] as const;
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
