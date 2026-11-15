/** A 360px compact screen or accessibility text scaling needs stacked rows.
 * Defensive handling avoids clipping during transient orientation changes. */
export function rankingsShouldStack(width:number,fontScale:number):boolean{
 return !Number.isFinite(width)||width<360
   ||!Number.isFinite(fontScale)||fontScale>=1.25;
}
export const RANKINGS_MIN_TAP_TARGET=44;
