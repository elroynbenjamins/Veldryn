/** Review-only background motion targets for the next two premium sets.
 * No native clock or asset imports here. A visible, motion-enabled renderer
 * may interpolate these samples using its existing 24s showcase clock.
 */
export type NextPremiumEnvironmentTheme='petal-waltz'|'thunder-pulse';
type EnvironmentFrame={x:number;y:number;opacity:number;scale:number;rotate:number};
type EnvironmentTrack={kind:'petal'|'mote'|'haze'|'light';radius:number;frames:EnvironmentFrame[]};
export const NEXT_ENVIRONMENT_PHASE=Array.from({length:97},(_,i)=>i/96);
const cycle=(v:number)=>((v%1)+1)%1;
const wave=(v:number)=>.5-.5*Math.cos(2*Math.PI*v);
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const frame=(x:number,y:number,opacity:number,scale:number,rotate:number):EnvironmentFrame=>({x,y,opacity:clamp(opacity),scale,rotate});
/** Approximate landmark centers in the fitted 340×205 wide background.
 * Final native composition must map to the actual fitted image rectangle.
 * These affect the wide review stage only; square artwork remains static in this pass.
 */
export const NEXT_PREMIUM_ENVIRONMENT_ANCHORS={
 'petal-waltz':{haze:[90,177],light:[88,35]},
 'thunder-pulse':{haze:[275,175],light:[250,28]},
} as const;
export function nextPremiumEnvironmentTracks(theme:NextPremiumEnvironmentTheme,fullSet:boolean):EnvironmentTrack[]{
 const sakura=theme==='petal-waltz', strength=fullSet?1:.8;
 // The identity is right for Sakura, left for Stormforged.
 const mx=(x:number)=>sakura?x:340-x;
 const make=(kind:EnvironmentTrack['kind'],radius:number,fn:(t:number)=>EnvironmentFrame):EnvironmentTrack=>{
  const frames=NEXT_ENVIRONMENT_PHASE.map(fn);frames[frames.length-1]={...frames[0]};return {kind,radius,frames};
 };
 const tracks:EnvironmentTrack[]=[];
 for(let i=0;i<4;i++){
  tracks.push(make(sakura?'petal':'mote',3,t=>{
   const p=cycle(t*(sakura?2:3)+i*.25);
   // Drift above the pet/identity region; invisible reset at the endpoints.
   const x=mx(31+i*18+5*Math.sin(2*Math.PI*p)),y=39+9*Math.sin(2*Math.PI*p+i);
   return frame(x,y,(sakura?.68:.52)*strength*Math.sin(Math.PI*p)**2,1+.12*wave(p),sakura?25*Math.sin(2*Math.PI*p):0);
  }));
 }
 const {haze,light}=NEXT_PREMIUM_ENVIRONMENT_ANCHORS[theme];
 tracks.push(make('haze',8,t=>frame(haze[0],haze[1],.10*strength*wave(t),1+.15*wave(t),0)));
 tracks.push(make('light',5,t=>frame(light[0],light[1],.23*strength*wave(t+.3),1+.15*wave(t),0)));
 return tracks;
}
/** No geometry intersects identity, guild or pet interaction boxes, even when inactive. */
export function nextPremiumEnvironmentFits(f:EnvironmentFrame,radius:number){
 const r=radius*f.scale;
 return f.x-r>=0&&f.x+r<=340&&f.y-r>=0&&f.y+r<=205&&
  (f.y+r<=65||f.y-r>=161);
}
