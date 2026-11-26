/** Bounded native ornament motion for the Crown of the Cosmos.
 * Coordinates are in logical pixels; normal layouts use the common perimeter
 * rail budget, dedicated showcases use their authored 340:205 aperture. */
import {PROFILE_SCENE_SAFE_LAYOUT} from './profile-frame-layout';
export const CELESTIAL_BORDER_PHASE=Array.from({length:33},(_,i)=>i/32);
export const CELESTIAL_BORDER_NODE_BUDGET={standard:6,showcase:8} as const;
export type CelestialBorderTrack={key:string;kind:'star'|'glow';size:number;x:number[];y:number[];opacity:number[]};
export function celestialBorderTracks(width:number,height:number,showcase:boolean):CelestialBorderTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const k=Math.min(showcase?1.42:1,width/340,height/205);
 const rail=showcase?34*k:PROFILE_SCENE_SAFE_LAYOUT.horizontalRail*Math.min(1,width/PROFILE_SCENE_SAFE_LAYOUT.referenceWidth,height/PROFILE_SCENE_SAFE_LAYOUT.referenceHeight);
 const phase=CELESTIAL_BORDER_PHASE;
 const periodic=(t:number)=>t===1?0:t;
 const pulse=(t:number,offset:number)=>.5-.5*Math.cos(2*Math.PI*(3*periodic(t)+offset));
 const wave=(t:number)=>.5-.5*Math.cos(2*Math.PI*periodic(t));
 const make=(key:string,kind:CelestialBorderTrack['kind'],diameter:number,lower:boolean,cx:(t:number)=>number,cy:(t:number)=>number,alpha:(t:number)=>number):CelestialBorderTrack=>{
  const size=Math.min(diameter*k,rail*.9),r=size/2;
  const x=phase.map(t=>Math.max(r,Math.min(width-r,cx(t))));
  const y=phase.map(t=>{const v=Math.max(r,Math.min(rail-r,cy(t)));return lower?height-v:v;});
  const opacity=phase.map(alpha);
  x[x.length-1]=x[0];y[y.length-1]=y[0];opacity[opacity.length-1]=opacity[0];
  return {key,kind,size,x,y,opacity};
 };
 const glint=(t:number,o:number)=>.18+.72*Math.pow(pulse(t,o),1.6);
 const crestY=showcase?23*k:rail*.65;
 const lowerY=showcase?13*k:rail*.55;
 const tracks=[
  make('upper-rail','star',12,false,t=>width*(.10+.80*wave(t)),()=>rail*.40,t=>glint(t,.28)),
  make('lower-rail','star',10,true,t=>width*(.90-.80*wave(t)),()=>rail*.40,t=>glint(t,.70)),
  make('crown-halo','glow',25,false,()=>width/2,()=>crestY,t=>.16+.57*pulse(t,.12)),
  make('medallion-halo','glow',21,true,()=>width/2,()=>lowerY,t=>.12+.52*pulse(t,.58)),
  make('crown-star','star',13,false,()=>width/2,()=>crestY,t=>glint(t,.12)),
  make('medallion-star','star',11,true,()=>width/2,()=>lowerY,t=>glint(t,.58)),
 ];
 if(showcase)tracks.push(
  make('left-wing','star',9,false,()=>width*.20,()=>rail*.50,t=>glint(t,.35)),
  make('right-wing','star',9,false,()=>width*.80,()=>rail*.50,t=>glint(t,.85)),
 );
 return tracks;
}
