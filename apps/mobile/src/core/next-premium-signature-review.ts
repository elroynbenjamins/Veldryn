/** Signature flourish and tap-reaction samples. Review-only; no clocks or native imports. */
export type SignatureTheme='petal-waltz'|'thunder-pulse';
type Layer='border'|'environment';
type Sample={x:number;y:number;opacity:number;scale:number;rotate?:number};
type Track={kind:string;radius:number;frames:Sample[]};
const smooth=(t:number)=>t*t*(3-2*t);
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
function bell(t:number,start:number,peak:number,end:number){
 if(t<=start||t>=end)return 0;
 return t<peak?smooth((t-start)/(peak-start)):smooth((end-t)/(end-peak));
}
/** An early preview accent and a stronger staggered signature per 24s cycle. No rapid/full-screen flash. */
export function nextPremiumSignatureEnvelope(theme:SignatureTheme,t:number,node:number,layer:Layer){
 if(!Number.isFinite(t)||t<0||t>1||!Number.isInteger(node)||node<0)return 0;
 const index=layer==='border'?node%8:node%6;
 if(theme==='petal-waltz'){
  // Bloom from the crest out to the corners, then petal and lantern shimmer.
  const offsets=layer==='border'?[.04,.07,0,.12,.02,.09,.04,.10]:[.07,.10,.13,.16,.12,.04];
  const d=offsets[index];return Math.max(.60*bell(t,.01+d*.35,.065+d*.35,.20+d*.35),bell(t,.36+d,.51+d,.70+d));
 }
 // Charge top jewels, travel down rails, discharge into the lower crest.
 const offsets=layer==='border'?[.07,.09,0,.15,.02,.13,.04,.11]:[.06,.08,.10,.12,.15,.02];
 const d=offsets[index];return Math.max(.74*bell(t,.005+d*.35,.045+d*.35,.15+d*.35),bell(t,.38+d,.48+d,.60+d));
}
/** Keep the proven geometry unchanged; only redistribute opacity within prior limits. */
export function nextPremiumSignatureTracks<T extends Track>(theme:SignatureTheme,tracks:T[],layer:Layer,fullSet:boolean):T[]{
 if(!fullSet)return tracks;
 return tracks.map((track,node)=>({...track,frames:track.frames.map((f,i)=>{
  const t=i/(track.frames.length-1),e=nextPremiumSignatureEnvelope(theme,t,node,layer);
  const ceiling=layer==='border'?.84:track.kind==='haze'?.10:track.kind==='light'?.23:theme==='petal-waltz'?.68:.52;
  const strength=layer==='border'?.66:track.kind==='haze'?.35:.48;
  return {...f,opacity:clamp(f.opacity+Math.max(0,ceiling-f.opacity)*e*strength)};
 })}));
}
export const NEXT_PREMIUM_REACTION={
 'petal-waltz':{duration:900,phase:[0,.18,.43,.70,1],lift:[0,-2.3,-1.1,-.4,0],scale:[1,1.035,1.018,1.005,1],tilt:[0,-3,1,-.5,0]},
 'thunder-pulse':{duration:760,phase:[0,.16,.39,.68,1],lift:[0,-1.3,-.6,-.25,0],scale:[1,1.026,1.012,1.004,1],tilt:[0,1.4,-.7,.3,0]},
} as const;
