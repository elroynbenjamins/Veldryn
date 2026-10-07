import type {ThemeColors} from './theme';
import type {LiveEventVisualKey} from '../content/live-event-visual-keys';

const secondary:Record<LiveEventVisualKey,string>={
 turning_of_the_age:'#b4a1ff',heartbond:'#ce78b7',bloomwake:'#55b98c',suncrest:'#45bad0',
 starfall:'#ad8aee',veilbreak:'#aa78e5',merchant_guild:'#54b5a0',frostfall:'#8f9ff2',harvestwake:'#d49a52',
};
function rgb(hex:string){return [1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));}
function mix(base:string,tint:string,amount:number){const a=rgb(base),b=rgb(tint);return '#'+a.map((channel,index)=>Math.round(channel+(b[index]-channel)*amount).toString(16).padStart(2,'0')).join('');}
function luminance(hex:string){const c=rgb(hex).map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function eventColorContrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function readable(color:string,surfaces:string[],dark:boolean){const target=dark?'#ffffff':'#000000';for(let i=0;i<=20;i++){const candidate=mix(color,target,i/20);if(surfaces.every(surface=>eventColorContrast(candidate,surface)>=4.5))return candidate;}return target;}
/** Applies event hues locally without changing the player's global theme. */
export function eventTheme(base:ThemeColors,event?:{accent:string;visualKey:LiveEventVisualKey}):ThemeColors{
 if(!event||!/^#[0-9a-f]{6}$/i.test(event.accent))return base;
 const hue=secondary[event.visualKey]??event.accent;
 const bg=mix(base.bg,hue,base.dark?.07:.025),panel=mix(base.panel,hue,base.dark?.12:.035),panel2=mix(base.panel2,hue,base.dark?.18:.09),panelRaised=mix(base.panelRaised,hue,base.dark?.17:.06);
 const selection=mix(base.panel,event.accent,base.dark?.24:.14),accentSurface=mix(base.panel,event.accent,base.dark?.13:.08),infoSurface=mix(base.panel,hue,base.dark?.23:.12);
 const surfaces=[bg,panel,panel2,panelRaised,selection,accentSurface,infoSurface],accent=readable(event.accent,surfaces,base.dark),info=readable(hue,surfaces,base.dark),primaryButton=base.dark?event.accent:readable(event.accent,['#ffffff'],false);
 return {...base,bg,panel,panel2,panelRaised,text:readable(base.text,surfaces,base.dark),muted:readable(base.muted,surfaces,base.dark),line:mix(base.line,hue,.3),lineStrong:mix(base.lineStrong,hue,.45),accent,accentSoft:accent,accentSurface,selection,selectionLine:accent,info,infoSurface,special:info,specialSurface:infoSurface,primaryButton,primaryButtonBorder:accent,primaryButtonText:eventColorContrast('#ffffff',primaryButton)>=4.5?'#ffffff':'#111014',secondaryButton:panel2,secondaryButtonBorder:mix(base.lineStrong,hue,.45),secondaryButtonText:readable(base.text,[panel2],base.dark)};
}
