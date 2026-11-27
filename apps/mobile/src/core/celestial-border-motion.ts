/** Bounded native ornament motion for the Crown of the Cosmos.
 * Coordinates are in logical pixels; normal layouts use the common perimeter
 * rail budget, dedicated showcases use their authored 340:205 aperture. */
import {PROFILE_SCENE_SAFE_LAYOUT} from './profile-frame-layout';
import {AWAKENING_CURVES} from './ultra-luxe-motion';
export const CELESTIAL_BORDER_PHASE=[...Array.from({length:33},(_,i)=>i/32),16/24].sort((a,b)=>a-b);
export const CELESTIAL_BORDER_NODE_BUDGET={standard:6,showcase:8} as const;
export type CelestialBorderTrack={key:string;kind:'star'|'glow';size:number;x:number[];y:number[];opacity:number[]};
export function celestialBorderTracks(width:number,height:number,showcase:boolean):CelestialBorderTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const k=Math.min(showcase?1.42:1,width/340,height/205);
 const rail=showcase?34*k:PROFILE_SCENE_SAFE_LAYOUT.horizontalRail*Math.min(1,width/PROFILE_SCENE_SAFE_LAYOUT.referenceWidth,height/PROFILE_SCENE_SAFE_LAYOUT.referenceHeight);
 const phase=CELESTIAL_BORDER_PHASE;
 const periodic=(t:number)=>t===1?0:t;
 const pulse=(t:number,offset:number)=>.5-.5*Math.cos(2*Math.PI*(3*periodic(t)+offset));
 const wave=(t:number)=>.5-.5*Math.cos(4*Math.PI*periodic(t));
 const make=(key:string,kind:CelestialBorderTrack['kind'],diameter:number,lower:boolean,cx:(t:number)=>number,cy:(t:number)=>number,alpha:(t:number)=>number):CelestialBorderTrack=>{
  const size=Math.min(diameter*k,rail*.9),r=size/2;
  const x=phase.map(t=>Math.max(r,Math.min(width-r,cx(t))));
  const y=phase.map(t=>{const v=Math.max(r,Math.min(rail-r,cy(t)));return lower?height-v:v;});
  const opacity=phase.map(alpha);
  x[x.length-1]=x[0];y[y.length-1]=y[0];opacity[opacity.length-1]=opacity[0];
  return {key,kind,size,x,y,opacity};
 };
 const energy=(t:number)=>{
  if(!showcase)return 0;
  const curve=AWAKENING_CURVES.celestial;
  const i=curve.phase.findIndex(p=>p>=t);
  if(i<=0)return curve.energy[0];
  const a=curve.phase[i-1],b=curve.phase[i];
  return curve.energy[i-1]+(curve.energy[i]-curve.energy[i-1])*(t-a)/(b-a);
 };
 const glint=(t:number,o:number)=>Math.min(.98,.18+.72*Math.pow(pulse(t,o),1.6)+.15*energy(t));
 const crestY=showcase?23*k:rail*.65;
 const lowerY=showcase?13*k:rail*.55;
 const tracks=[
  make('upper-rail','star',15,false,t=>width*(.10+.80*wave(t)),()=>rail*.40,t=>glint(t,.28)),
  make('lower-rail','star',13,true,t=>width*(.90-.80*wave(t)),()=>rail*.40,t=>glint(t,.70)),
  make('crown-halo','glow',25,false,()=>width/2,()=>crestY,t=>Math.min(.94,.16+.50*pulse(t,.12)+.27*energy(t))),
  make('medallion-halo','glow',21,true,()=>width/2,()=>lowerY,t=>Math.min(.9,.12+.45*pulse(t,.58)+.26*energy(t))),
  make('crown-star','star',13,false,()=>width/2,()=>crestY,t=>glint(t,.12)),
  make('medallion-star','star',11,true,()=>width/2,()=>lowerY,t=>glint(t,.58)),
 ];
 if(showcase)tracks.push(
  make('left-wing','star',12,false,()=>width*.20,()=>rail*.50,t=>glint(t,.35)),
  make('right-wing','star',12,false,()=>width*.80,()=>rail*.50,t=>glint(t,.85)),
 );
 return tracks;
}
