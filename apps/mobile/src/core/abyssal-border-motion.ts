import {PROFILE_SCENE_SAFE_LAYOUT as SAFE} from './profile-frame-layout';
import {abyssalAwakeningCurve} from './abyssal-showcase-layout';
export const ABYSSAL_BORDER_PHASE=Array.from({length:49},(_,i)=>i/48);
export const ABYSSAL_BORDER_NODE_BUDGET={standard:6,showcase:8} as const;
export type AbyssalBorderTrack={key:string;kind:'mote'|'aura';size:number;x:number[];y:number[];opacity:number[]};
const CURVE=abyssalAwakeningCurve();
/** Artwork landmarks: upper aquamarine (170,18), lower pearl (170,189),
 * side crystals (20,98)/(320,98). Ordinary cards use the shared safe rails. */
export function abyssalBorderTracks(width:number,height:number,showcase=false,fullSet=false):AbyssalBorderTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const k=Math.min(showcase?1.42:1,width/340,height/205);
 const q=Math.min(1,width/SAFE.referenceWidth,height/SAFE.referenceHeight);
 const side=showcase?28*k:SAFE.sideRail*q,rail=showcase?34*k:SAFE.horizontalRail*q;
 const phase=ABYSSAL_BORDER_PHASE;
 const cycle=(t:number,o:number)=>((t===1?0:t)*2+o)%1;
 const wave=(t:number,o:number)=>.5-.5*Math.cos(2*Math.PI*cycle(t,o));
 const energy=(t:number)=>{
  if(!showcase)return 0;
  const i=CURVE.phase.findIndex(p=>p>=t);
  if(i<=0)return CURVE.energy[0];
  return CURVE.energy[i-1]+(CURVE.energy[i]-CURVE.energy[i-1])*(t-CURVE.phase[i-1])/(CURVE.phase[i]-CURVE.phase[i-1]);
 };
 const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 const make=(key:string,kind:AbyssalBorderTrack['kind'],diameter:number,zone:'left'|'right'|'top'|'bottom',cx:(t:number)=>number,cy:(t:number)=>number,alpha:(t:number)=>number):AbyssalBorderTrack=>{
  const size=Math.min(diameter*k,(zone==='left'||zone==='right'?side:rail)*.88),r=size/2;
  const x=phase.map(t=>clamp(cx(t),zone==='right'?width-side+r:r,zone==='left'?side-r:width-r));
  const y=phase.map(t=>clamp(cy(t),zone==='bottom'?height-rail+r:r,zone==='top'?rail-r:height-r));
  const opacity=phase.map(t=>clamp(alpha(t),0,.98));
  x[x.length-1]=x[0];y[y.length-1]=y[0];opacity[opacity.length-1]=opacity[0];
  return {key,kind,size,x,y,opacity};
 };
 const sx=showcase?20*k:side*.55;
 const top=showcase?18*k:rail*.55,bottom=showcase?height-16*k:height-rail*.55;
 const tidal=(t:number,o:number)=>.24+.46*wave(t,o)+(.16+(fullSet&&showcase ? .10 : 0))*energy(t);
 const glint=(t:number,o:number)=>.20+.55*wave(t,o)+(.13+(fullSet&&showcase ? .10 : 0))*energy(t);
 const tracks=[
  make('left-current','mote',9,'left',t=>sx+2*k*Math.sin(2*Math.PI*cycle(t,0)),t=>height*(.26+.48*wave(t,0)),t=>glint(t,.25)),
  make('right-current','mote',9,'right',t=>width-sx-2*k*Math.sin(2*Math.PI*cycle(t,.5)),t=>height*(.26+.48*wave(t,.5)),t=>glint(t,.75)),
  make('crest-halo','aura',26,'top',()=>width/2,()=>top,t=>tidal(t,.12)),
  make('pearl-halo','aura',24,'bottom',()=>width/2,()=>bottom,t=>tidal(t,.62)),
  make('crest-glint','mote',12,'top',()=>width/2,()=>top,t=>glint(t,.12)),
  make('pearl-glint','mote',11,'bottom',()=>width/2,()=>bottom,t=>glint(t,.62)),
 ];
 if(showcase)tracks.push(
  make('left-crystal','aura',16,'left',()=>18*k,()=>98*k,t=>tidal(t,.35)),
  make('right-crystal','aura',16,'right',()=>width-18*k,()=>98*k,t=>tidal(t,.85)),
 );
 return tracks;
}
