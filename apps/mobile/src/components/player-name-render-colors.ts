import {normalizePlayerNameStyle,playerNameCharacterColors,type PlayerNameStylePreference} from '../core/player-name-style';
import {ultraLuxeGradientColor,ultraLuxeGradientForColors} from '../core/ultra-luxe-name-gradients';

/** Client presentation only. The server projects the same authorized style as before. */
export function renderedPlayerNameColors(name:string,style:PlayerNameStylePreference,phase=0){
 const normalized=normalizePlayerNameStyle(style);
 const palette=normalized.mode==='gradient'&&normalized.animation==='flow'?ultraLuxeGradientForColors(normalized.gradientColors):undefined;
 if(!palette)return playerNameCharacterColors(name,style,phase);
 const chars=Array.from(name),count=Math.max(1,chars.length-1);
 return chars.map((_,i)=>ultraLuxeGradientColor(palette.id,i/count,phase)??palette.colors[0]);
}
