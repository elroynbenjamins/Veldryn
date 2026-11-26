/** Shared visual definitions only. These rows never confer entitlement.
 * Celestial/Draconic are existing private presets; other four remain review candidates.
 * All six use an equal five-second travelling, closed gradient cycle. */
export const ULTRA_LUXE_GRADIENTS=[
 {id:'ascendant-celestial-name',name:'Astral Radiance',colors:['#F3C86F','#FFF4D9','#D6E8FF'],motion:'starlight'},
 {id:'ascendant-draconic-name',name:'Ember Sovereignty',colors:['#FF9460','#FFE0A1','#EE6651'],motion:'ember'},
 {id:'ascendant-abyssal-name',name:'Abyssal Luminescence',colors:['#55C8C9','#D4FFF4','#70A9F2'],motion:'tidal'},
 {id:'ascendant-paradox-name',name:'Eternal Refraction',colors:['#B9A0F9','#F4EDFF','#8FB5F9'],motion:'temporal'},
 {id:'ascendant-sakura-name',name:'Sakura Radiance',colors:['#F5A6C8','#FFF5FA','#E58BB7'],motion:'petal'},
 {id:'ascendant-stormforged-name',name:'Stormborn Radiance',colors:['#63CFFF','#E0EAF5','#639AF8'],motion:'storm'},
] as const;
export type UltraLuxeGradientId=typeof ULTRA_LUXE_GRADIENTS[number]['id'];
export const ULTRA_LUXE_NAME_TICK_MS=180;
export const ULTRA_LUXE_NAME_CYCLE_MS=5040;
export function ultraLuxeGradient(id:unknown){return ULTRA_LUXE_GRADIENTS.find(row=>row.id===id);}
/** Visual match only, NOT ownership. Same palette chosen manually may look the same,
 * but only verified preset ID grants access to the private selector. */
export function ultraLuxeGradientForColors(colors:readonly string[]|undefined){
 return ULTRA_LUXE_GRADIENTS.find(row=>colors?.length===row.colors.length&&row.colors.every((c,i)=>c===colors[i]));
}
const cycle=(t:number)=>Number.isFinite(t)?((t%1)+1)%1:0;
const smooth=(t:number)=>t*t*(3-2*t);
function rgb(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function mix(a:string,b:string,t:number){
 const A=rgb(a),B=rgb(b),f=smooth(t);
 return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*f).toString(16).padStart(2,'0')).join('').toUpperCase();
}
/** Closed gradient with distinct crest width/direction; no hard wrap or flash.
 * Each sequence traverses all three colors and returns to the first. */
export function ultraLuxeGradientColor(id:UltraLuxeGradientId,position:number,phase:number){
 const row=ultraLuxeGradient(id);
 if(!row)return undefined;
 const direction=row.motion==='tidal'||row.motion==='temporal'?-1:1;
 const t=cycle(position*.78+direction*phase);
 const peak=row.motion==='storm'?.23:row.motion==='ember'?.30:row.motion==='petal'?.39:.34;
 const tail=row.motion==='storm'?.62:row.motion==='temporal'?.68:.72;
 const [a,b,c]=row.colors;
 if(t<peak)return mix(a,b,t/peak);
 if(t<tail)return mix(b,c,(t-peak)/(tail-peak));
 return mix(c,a,(t-tail)/(1-tail));
}
