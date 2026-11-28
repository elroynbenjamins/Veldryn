/** Review-only pose atlas and motion contract. No artwork, timer or live registry. */
export type NextPremiumPetTheme='sakura'|'stormforged';
export const NEXT_PREMIUM_PET_ATLAS={
 frameWidth:128,frameHeight:128,columns:6,rows:6,frames:36,seconds:3,cycles:8,
 padding:6,iconSize:96,portraitSize:512,showcaseSize:256,
} as const;
export const NEXT_PREMIUM_PET_PHASE=Array.from({length:97},(_,i)=>i/96);
export function nextPremiumPetAtlasCell(index:number){
 const a=NEXT_PREMIUM_PET_ATLAS;
 if(!Number.isInteger(index)||index<0||index>=a.frames)return undefined;
 return {column:index%a.columns,row:Math.floor(index/a.columns)};
}
/** Adjacent cell switches follow existing Ultra Luxe convention, not a scrolling sprite. */
export function nextPremiumPetAtlasTimeline(){
 const a=NEXT_PREMIUM_PET_ATLAS,inputRange=[0],frames=[0];
 for(let i=1;i<=a.frames;i++){
  inputRange.push(i/a.frames-.0005/a.seconds,i/a.frames);
  frames.push(i-1,i%a.frames);
 }
 return {inputRange,frames};
}
const phase=(t:number)=>Number.isFinite(t)?((t%1)+1)%1:0;
const wave=(p:number)=>.5-.5*Math.cos(2*Math.PI*p);
export function nextPremiumPetIdle(theme:NextPremiumPetTheme,t:number){
 const p=phase(t)*NEXT_PREMIUM_PET_ATLAS.cycles,breath=wave(p);
 const fox=theme==='sakura';
 // Anchor at paws: the renderer must apply scale about the grounded bottom edge.
 // Keep aura/platform independent of the moving body.
 return {lift:-(fox?1.25:.65)*breath,scaleX:1+(fox?.012:.006)*breath,
  scaleY:1+(fox?.018:.010)*breath,tilt:(fox?.8:.3)*Math.sin(2*Math.PI*p),
  aura:.12+(fox?.18:.16)*wave(p*.25)};
}
export function nextPremiumPetIdleSamples(theme:NextPremiumPetTheme){
 const frames=NEXT_PREMIUM_PET_PHASE.map(t=>nextPremiumPetIdle(theme,t));
 frames[frames.length-1]={...frames[0]};
 return frames;
}
/** Distinct bounded posture accent on the existing parent clock; not a substitute for authored local pose changes. */
export const NEXT_PREMIUM_POSTURE_PHASE=[0,2/24,4/24,7/24,10/24,13/24,16/24,19/24,22/24,1] as const;
export const NEXT_PREMIUM_POSTURE_LIFT={sakura:[0,-2.5,-1,0,-1,-2,-3,-1,0,0],stormforged:[0,-.8,-1.5,0,-.5,-1,-2,-.8,0,0]} as const;
/** Padded atlas bounds: visible art must fit each frame without clipping.
 * Decoded alpha bounds must still be verified on actual supplied artwork.
 */
export function nextPremiumPetCellFits(x:number,y:number,w:number,h:number){
 const a=NEXT_PREMIUM_PET_ATLAS;
 return [x,y,w,h].every(Number.isFinite)&&w>0&&h>0&&x>=a.padding&&y>=a.padding&&
  x+w<=a.frameWidth-a.padding&&y+h<=a.frameHeight-a.padding;
}
