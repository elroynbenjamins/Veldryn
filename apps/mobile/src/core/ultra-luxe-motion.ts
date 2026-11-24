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
