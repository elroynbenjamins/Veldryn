export type MotionTrack={points:readonly (readonly [number,number])[];phase:number;width:number;maxDp:number;opacity:number;rotation:number;cycles:number};
export type MotionProfile='gloamward'|'frostbound'|'amberglass'|'briarbound'|'celestial'|'draconic'|'abyssal'|'paradox';
export const MOTION_STEPS=Array.from({length:121},(_,i)=>i/120);
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function sampleCosmeticTrack(t:MotionTrack,clock:number,width:number,height:number){
 const f=((clock*t.cycles+t.phase/120)%1+1)%1;
 const n=t.points.length-1,p=f*n,i=Math.min(n-1,Math.floor(p)),u=p-i;
 const a=t.points[i],b=t.points[i+1],smooth=u*u*(3-2*u);
 const spriteWidth=Math.min(t.maxDp,width*t.width,height*.35),spriteHeight=spriteWidth;
 const x=clamp((a[0]+(b[0]-a[0])*smooth)*width,spriteWidth/2,width-spriteWidth/2);
 const y=clamp((a[1]+(b[1]-a[1])*smooth)*height,spriteHeight/2,height-spriteHeight/2);
 return {x:x-spriteWidth/2,y:y-spriteHeight/2,width:spriteWidth,height:spriteHeight,opacity:t.opacity*Math.pow(Math.sin(Math.PI*f),1.5),rotation:t.rotation*f};
}
export function cosmeticGlowOpacity(profile:MotionProfile,clock:number,periodMs:number,phaseMs:number,peak:number,lantern=false){
 const f=((clock*12000+phaseMs)%periodMs)/periodMs;
 if(lantern)return peak*(.35+.30*Math.sin(Math.PI*f)**2+.20*Math.sin(5*Math.PI*f)**2);
 const pulse=Math.sin(Math.PI*f)**2;
 switch(profile){case 'gloamward':return peak*pulse**4;case 'frostbound':return peak*pulse**6;case 'amberglass':return peak*pulse**2;case 'briarbound':return peak*pulse;case 'celestial':return peak*(.2+.8*pulse**3);case 'draconic':return peak*(.25+.75*pulse**2);case 'abyssal':return peak*(.18+.82*pulse);case 'paradox':return peak*(.15+.85*Math.abs(Math.sin(3*Math.PI*f)));}
}
