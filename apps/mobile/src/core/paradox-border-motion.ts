import {PROFILE_SCENE_SAFE_LAYOUT as SAFE} from './profile-frame-layout';
import {PARADOX_GLINT_PHASE,PARADOX_GLINT_OPACITY,paradoxAwakeningCurve} from './paradox-showcase-layout';
export const PARADOX_BORDER_PHASE=[...new Set([...Array.from({length:49},(_,i)=>i/48),...PARADOX_GLINT_PHASE])].sort((a,b)=>a-b);
export type ParadoxBorderTrack={key:string;kind:'glint'|'aura';size:number;x:number[];y:number[];opacity:number[]};
const CURVE=paradoxAwakeningCurve();
function sample(phase:readonly number[],values:readonly number[],t:number){
 const i=phase.findIndex(p=>p>=t);
 if(i<=0)return values[0];
 return values[i-1]+(values[i]-values[i-1])*(t-phase[i-1])/(phase[i]-phase[i-1]);
}
/** Local rift glints, not a screen-space distortion effect. At the fold
 * the two moving stars disappear before reversing along the same rails. */
export function paradoxBorderTracks(width:number,height:number,showcase=false,fullSet=false):ParadoxBorderTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const k=Math.min(showcase?1.42:1,width/340,height/205);
 const q=Math.min(1,width/SAFE.referenceWidth,height/SAFE.referenceHeight);
 const side=showcase?28*k:SAFE.sideRail*q,rail=showcase?34*k:SAFE.horizontalRail*q;
 const phase=PARADOX_BORDER_PHASE;
 const pulse=(t:number,o:number)=>.5-.5*Math.cos(2*Math.PI*(3*(t===1?0:t)+o));
 const energy=(t:number)=>showcase?sample(CURVE.phase,CURVE.energy,t):0;
 const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 const make=(key:string,kind:ParadoxBorderTrack['kind'],diameter:number,zone:'left'|'right'|'top'|'bottom',cx:(t:number)=>number,cy:(t:number)=>number,alpha:(t:number)=>number):ParadoxBorderTrack=>{
  const size=Math.min(diameter*k,(zone==='left'||zone==='right'?side:rail)*.88),r=size/2;
  const x=phase.map(t=>clamp(cx(t),zone==='right'?width-side+r:r,zone==='left'?side-r:width-r));
  const y=phase.map(t=>clamp(cy(t),zone==='bottom'?height-rail+r:r,zone==='top'?rail-r:height-r));
  const opacity=phase.map(t=>clamp(alpha(t),0,.98));
  x[x.length-1]=x[0];y[y.length-1]=y[0];opacity[opacity.length-1]=opacity[0];
  return {key,kind,size,x,y,opacity};
 };
 const travel=(t:number)=>sample(PARADOX_GLINT_PHASE,[.14,.22,.42,.82,.86,.82,.5,.22,.14,.14],t);
 const glint=(t:number)=>sample(PARADOX_GLINT_PHASE,PARADOX_GLINT_OPACITY,t);
 const halo=(t:number,o:number)=>.20+.49*pulse(t,o)+(.18+(fullSet&&showcase ? .09 : 0))*energy(t);
 const top=showcase?21*k:rail*.58,bottom=showcase?height-13*k:height-rail*.55;
 const tracks=[
  make('upper-fold','glint',12,'top',t=>width*travel(t),()=>rail*.45,glint),
  make('lower-fold','glint',10,'bottom',t=>width*(1-travel(t)),()=>height-rail*.4,glint),
  make('hourglass-aura','aura',26,'top',()=>width/2,()=>top,t=>halo(t,.12)),
  make('seal-aura','aura',23,'bottom',()=>width/2,()=>bottom,t=>halo(t,.62)),
  make('hourglass-glint','glint',12,'top',()=>width/2,()=>top,t=>halo(t,.12)),
  make('seal-glint','glint',11,'bottom',()=>width/2,()=>bottom,t=>halo(t,.62)),
 ];
 if(showcase)tracks.push(
  make('left-crystal','aura',17,'left',()=>18*k,()=>103*k,t=>halo(t,.35)),
  make('right-crystal','aura',17,'right',()=>width-18*k,()=>103*k,t=>halo(t,.85)),
 );
 return tracks;
}
