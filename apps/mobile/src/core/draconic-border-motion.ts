import {PROFILE_SCENE_SAFE_LAYOUT as SAFE} from './profile-frame-layout';
import {AWAKENING_CURVES} from './ultra-luxe-motion';

/** Throne of Embers: rising heat, not a recolored Celestial rail sweep.
 * All tracks close on the parent clock and stay outside protected content. */
export const DRACONIC_BORDER_PHASE=[...Array.from({length:49},(_,i)=>i/48)];
export const DRACONIC_BORDER_NODE_BUDGET={standard:6,showcase:8} as const;
export type DraconicBorderTrack={key:string;kind:'ember'|'glow';size:number;x:number[];y:number[];opacity:number[]};
export function draconicBorderTracks(width:number,height:number,showcase:boolean):DraconicBorderTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const k=Math.min(showcase?1.42:1,width/340,height/205);
 const safeScale=Math.min(1,width/SAFE.referenceWidth,height/SAFE.referenceHeight);
 const side=showcase?28*k:SAFE.sideRail*safeScale,rail=showcase?32*k:SAFE.horizontalRail*safeScale;
 const phase=DRACONIC_BORDER_PHASE;
 const cycle=(t:number,offset:number)=>((t===1?0:t)*3+offset)%1;
 const pulse=(t:number,o:number)=>.5-.5*Math.cos(2*Math.PI*cycle(t,o));
 const energy=(t:number)=>{
  if(!showcase)return 0;
  const c=AWAKENING_CURVES.draconic,i=c.phase.findIndex(p=>p>=t);
  if(i<=0)return c.energy[0];
  return c.energy[i-1]+(c.energy[i]-c.energy[i-1])*(t-c.phase[i-1])/(c.phase[i]-c.phase[i-1]);
 };
 const make=(key:string,kind:DraconicBorderTrack['kind'],diameter:number,zone:'left'|'right'|'top'|'bottom',cx:(t:number)=>number,cy:(t:number)=>number,alpha:(t:number)=>number):DraconicBorderTrack=>{
  const lateral=zone==='left'||zone==='right',size=Math.min(diameter*k,(lateral?side:rail)*.88),r=size/2;
  const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
  const x=phase.map(t=>clamp(cx(t),zone==='right'?width-side+r:r,zone==='left'?side-r:width-r));
  const y=phase.map(t=>clamp(cy(t),zone==='bottom'?height-rail+r:r,zone==='top'?rail-r:height-r));
  const opacity=phase.map(t=>clamp(alpha(t),0,.98));
  x[x.length-1]=x[0];y[y.length-1]=y[0];opacity[opacity.length-1]=opacity[0];
  return {key,kind,size,x,y,opacity};
 };
 // Smooth up-and-down movement; embers fade during their downward return.
 const rise=(t:number,o:number)=>.5-.5*Math.cos(2*Math.PI*cycle(t,o));
 const ember=(t:number,o:number)=>.08+(.72+.16*energy(t))*Math.pow(Math.max(0,Math.sin(2*Math.PI*cycle(t,o))),1.2);
 const molten=(t:number,o:number)=>.27+.54*pulse(t,o)+.17*energy(t);
 const tracks=[
  make('left-ember','ember',14,'left',t=>side*(.50+.07*Math.sin(2*Math.PI*cycle(t,0))),t=>height*(.78-.56*rise(t,0)),t=>ember(t,0)),
  make('right-ember','ember',14,'right',t=>width-side*(.50+.07*Math.sin(2*Math.PI*cycle(t,.5))),t=>height*(.78-.56*rise(t,.5)),t=>ember(t,.5)),
  make('crest-heat','glow',27,'top',()=>width/2,()=>rail*.58,t=>molten(t,.08)),
  make('lower-heat','glow',24,'bottom',()=>width/2,()=>height-rail*.58,t=>molten(t,.58)),
  make('crest-ember','ember',13,'top',()=>width/2,()=>rail*.58,t=>molten(t,.08)),
  make('lower-ember','ember',12,'bottom',()=>width/2,()=>height-rail*.58,t=>molten(t,.58)),
 ];
 if(showcase)tracks.push(
  make('left-wing-heat','glow',24,'top',()=>width*.24,()=>rail*.55,t=>molten(t,.32)),
  make('right-wing-heat','glow',24,'top',()=>width*.76,()=>rail*.55,t=>molten(t,.82)),
 );
 return tracks;
}
