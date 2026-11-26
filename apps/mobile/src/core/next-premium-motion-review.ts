/** Review-only perimeter keyframes. No timers, UI imports or ownership side effects. */
export type NextPremiumTheme='petal-waltz'|'thunder-pulse';
export type OrnamentFrame={x:number;y:number;opacity:number;scale:number};
export type OrnamentTrack={kind:'rail'|'crest'|'corner';radius:number;frames:OrnamentFrame[]};
export const ORNAMENT_PHASE=Array.from({length:97},(_,i)=>i/96);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const cycle=(n:number)=>((n%1)+1)%1;
const wave=(t:number)=>.5-.5*Math.cos(2*Math.PI*t);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(t:number)=>t*t*(3-2*t);
const stage={w:340,h:205};
const point=(x:number,y:number,opacity:number,scale:number):OrnamentFrame=>({x,y,opacity:clamp(opacity),scale});
/** Closed vertical rail with invisible returns; samples are native interpolation targets.
 * All visible and invisible samples stay on the perimeter, including linear interpolation. */
function rail(theme:NextPremiumTheme,right:boolean,t:number,full:boolean):OrnamentFrame{
 const p=cycle(t*(theme==='petal-waltz'?2:3)+(right?.5:0));
 const down=theme==='petal-waltz'?!right:right;
 const q=p<.5?smooth(p*2):1-smooth((p-.5)*2);
 const y=mix(31,174,down?q:1-q);
 const pulse=p<.5?Math.sin(Math.PI*p*2)**2:0;
 const strength=full?.84:.72;
 return point(right?326:14,y,pulse*strength,1+.08*pulse);
}
function fixed(theme:NextPremiumTheme,x:number,y:number,t:number,offset:number,full:boolean):OrnamentFrame{
 const w=wave(t*(theme==='petal-waltz'?2:3)+offset);
 return point(x,y,.08+(full?.76:.64)*w,1+.12*w);
}
export function nextPremiumOrnamentTracks(theme:NextPremiumTheme,showcase:boolean,fullSet:boolean):OrnamentTrack[]{
 const full=showcase&&fullSet;
 const make=(kind:OrnamentTrack['kind'],radius:number,fn:(t:number)=>OrnamentFrame):OrnamentTrack=>{
  const frames=ORNAMENT_PHASE.map(fn);
  frames[frames.length-1]={...frames[0]};
  return {kind,radius,frames};
 };
 const tracks=[make('rail',5,t=>rail(theme,false,t,full)),make('rail',5,t=>rail(theme,true,t,full)),
  make('crest',5,t=>fixed(theme,170,10,t,0,full)),
  make('crest',5,t=>fixed(theme,170,195,t,.5,full)),
  make('corner',4,t=>fixed(theme,38,10,t,.25,full)),
  make('corner',4,t=>fixed(theme,302,195,t,.75,full))];
 if(showcase)tracks.push(make('corner',4,t=>fixed(theme,302,10,t,.4,full)),make('corner',4,t=>fixed(theme,38,195,t,.9,full)));
 return tracks;
}
/** Convert normalized review coordinates to a proportional target surface.
 * Caller must use a fitted 340:205 aperture or separately calibrate standard artwork. */
export function nextPremiumOrnamentFits(f:OrnamentFrame,radius:number){
 const r=radius*f.scale;
 return f.x-r>=0&&f.x+r<=stage.w&&f.y-r>=0&&f.y+r<=stage.h&&
  (f.x+r<=26||f.x-r>=314||f.y+r<=24||f.y-r>=181);
}
