import {Platform,StyleSheet} from 'react-native';
import type {UiThemeId} from '../core/types';

export const displayFont=Platform.select({ios:'Georgia',android:'serif',default:'Georgia'});
export const spacing={xs:4,sm:8,md:12,lg:16,xl:24};
export const radii={sm:8,md:14,lg:18};
export const typography={
  caption:{fontSize:12,lineHeight:16},
  body:{fontSize:14,lineHeight:20},
  bodyStrong:{fontSize:14,lineHeight:21,fontWeight:'600' as const},
  title:{fontFamily:displayFont,fontSize:19,lineHeight:25,fontWeight:'700' as const},
  hero:{fontFamily:displayFont,fontSize:26,lineHeight:33,fontWeight:'700' as const},
};
export const touchTargetMin=44;
export const touchTargetPreferred=48;

type CoreColors={
  bg:string;panel:string;panel2:string;line:string;text:string;muted:string;disabled:string;
  accent:string;good:string;bad:string;warning:string;info:string;
};
type EquipmentColors={
  background:string;stage:string;panel:string;panelRaised:string;line:string;lineStrong:string;
  gold:string;goldSoft:string;selected:string;selectedLine:string;
};
type ChromeColors={
  navBackground:string;navBorder:string;activeTint:string;
  primarySurface:string;primaryBorder:string;secondarySurface:string;secondaryBorder:string;
  dangerSurface:string;dangerBorder:string;dangerText:string;focus:string;selectedText:string;
  positiveSurface:string;warningSurface:string;fieldSurface:string;imageStage:string;badge:string;
  specialSurface:string;specialText:string;specialAccent:string;
};
export type UiThemeDefinition={
  id:UiThemeId;
  label:string;
  shortLabel:string;
  description:string;
  mode:'dark'|'light';
  colors:CoreColors;
  equipmentColors:EquipmentColors;
  chrome:ChromeColors;
};

export const UI_THEMES:Record<UiThemeId,UiThemeDefinition>={
  veldryn:{
    id:'veldryn',label:'VELDRYN',shortLabel:'VELDRYN',mode:'dark',
    description:'Deep Asterfall navy, warm progression gold, and crisp cyan interaction cues.',
    colors:{bg:'#07111C',panel:'#0D1E2D',panel2:'#14283A',line:'#4D6C88',text:'#F3F7FB',muted:'#A8B6C6',disabled:'#718197',accent:'#E2B74D',good:'#57C98A',bad:'#EE7D86',warning:'#F1C66A',info:'#55B8E6'},
    equipmentColors:{background:'#07111C',stage:'#081827',panel:'#0D1E2D',panelRaised:'#14283A',line:'#7B6535',lineStrong:'#D1A646',gold:'#F0C34E',goldSoft:'#F6DC96',selected:'#103955',selectedLine:'#4CC8FF'},
    chrome:{navBackground:'#08131F',navBorder:'#4D6C88',activeTint:'rgba(226,183,77,.14)',primarySurface:'#173F59',primaryBorder:'#58B7DF',secondarySurface:'#0F2232',secondaryBorder:'#4D6C88',dangerSurface:'#311D25',dangerBorder:'#A95D67',dangerText:'#FFD2D6',focus:'#7DDCF7',selectedText:'#E9F8FF',positiveSurface:'#102B21',warningSurface:'#34260F',fieldSurface:'#0F1D2B',imageStage:'#05090D',badge:'#D93646',specialSurface:'#5D3674',specialText:'#F4D8FF',specialAccent:'#CBA0F5'},
  },
  'dark-high-contrast':{
    id:'dark-high-contrast',label:'Night High Contrast',shortLabel:'Night HC',mode:'dark',
    description:'Near-black surfaces with white text and brighter yellow/cyan state cues for maximum separation.',
    colors:{bg:'#000000',panel:'#0A0E13',panel2:'#151B22',line:'#7C8EA4',text:'#FFFFFF',muted:'#D2D9E2',disabled:'#94A0AE',accent:'#FFD84D',good:'#66E89C',bad:'#FF858D',warning:'#FFD166',info:'#6BD6FF'},
    equipmentColors:{background:'#000000',stage:'#070A0E',panel:'#0A0E13',panelRaised:'#151B22',line:'#8F9AA8',lineStrong:'#FFE169',gold:'#FFD84D',goldSoft:'#FFF0A8',selected:'#073B57',selectedLine:'#73DCFF'},
    chrome:{navBackground:'#000000',navBorder:'#8B9CAF',activeTint:'rgba(255,216,77,.16)',primarySurface:'#0B3F5D',primaryBorder:'#7DDFFF',secondarySurface:'#151B22',secondaryBorder:'#8B9CAF',dangerSurface:'#3A1116',dangerBorder:'#FF9097',dangerText:'#FFDADD',focus:'#FFFFFF',selectedText:'#FFFFFF',positiveSurface:'#0B2D1B',warningSurface:'#352700',fieldSurface:'#0A0E13',imageStage:'#000000',badge:'#FF3347',specialSurface:'#321946',specialText:'#F8ECFF',specialAccent:'#E5C8FF'},
  },
  'light-high-contrast':{
    id:'light-high-contrast',label:'Day High Contrast',shortLabel:'Day HC',mode:'light',
    description:'Bright neutral surfaces with near-black text, deep blue actions, and dark amber progression accents.',
    colors:{bg:'#F6F8FB',panel:'#FFFFFF',panel2:'#EAF0F6',line:'#526274',text:'#0A1018',muted:'#334155',disabled:'#667085',accent:'#7A4D00',good:'#116B3A',bad:'#A61B1B',warning:'#7A4A00',info:'#005A8D'},
    equipmentColors:{background:'#F6F8FB',stage:'#E7EDF3',panel:'#FFFFFF',panelRaised:'#EAF0F6',line:'#8A6B2A',lineStrong:'#7A4D00',gold:'#7A4D00',goldSoft:'#5C3A00',selected:'#D9EFFB',selectedLine:'#006EA8'},
    chrome:{navBackground:'#FFFFFF',navBorder:'#526274',activeTint:'rgba(0,90,141,.10)',primarySurface:'#D9EFFB',primaryBorder:'#006EA8',secondarySurface:'#FFFFFF',secondaryBorder:'#526274',dangerSurface:'#FFE8EA',dangerBorder:'#A61B1B',dangerText:'#7A1010',focus:'#005A8D',selectedText:'#0A1018',positiveSurface:'#E3F6E9',warningSurface:'#FFF2D7',fieldSurface:'#FFFFFF',imageStage:'#E7EDF3',badge:'#B42318',specialSurface:'#EEE1F7',specialText:'#42105F',specialAccent:'#5B2385'},
  },
};

export const UI_THEME_OPTIONS=(Object.keys(UI_THEMES) as UiThemeId[]).map(id=>{
  const theme=UI_THEMES[id];
  return {id,label:theme.label,shortLabel:theme.shortLabel,description:theme.description,mode:theme.mode,preview:[theme.colors.bg,theme.colors.panel,theme.colors.text,theme.colors.accent,theme.colors.info] as const};
});

export function normalizeUiThemeId(value:unknown):UiThemeId{
  return value==='dark-high-contrast'||value==='light-high-contrast'||value==='veldryn'?value:'veldryn';
}

let activeThemeId:UiThemeId='veldryn';
export function setActiveUiTheme(value:unknown):UiThemeId{
  activeThemeId=normalizeUiThemeId(value);
  return activeThemeId;
}
export function activeUiTheme():UiThemeDefinition{return UI_THEMES[activeThemeId];}

function livePart<T extends object>(part:(theme:UiThemeDefinition)=>T,base:T):T{
  return new Proxy({...base},{
    get:(_target,key)=>part(activeUiTheme())[key as keyof T],
    ownKeys:()=>Reflect.ownKeys(part(activeUiTheme())),
    getOwnPropertyDescriptor:(_target,key)=>({configurable:true,enumerable:true,value:part(activeUiTheme())[key as keyof T]}),
  }) as T;
}

/**
 * Existing UI modules can continue to reference C/equipmentColors.
 * The proxies resolve the active palette at render time, so inline colors also update.
 */
export const C=livePart(theme=>theme.colors,UI_THEMES.veldryn.colors);
export const equipmentColors=livePart(theme=>theme.equipmentColors,UI_THEMES.veldryn.equipmentColors);
export const uiColors=livePart(theme=>theme.chrome,UI_THEMES.veldryn.chrome);

type ThemeColorToken=string;
const legacyTokenMap:Record<string,ThemeColorToken>={
  '#0b1018':'colors.bg','#151e2b':'colors.panel','#1c2939':'colors.panel2','#314259':'colors.line',
  '#eef4ff':'colors.text','#93a4ba':'colors.muted','#64748b':'colors.disabled','#d4ad58':'colors.accent',
  '#7fc59b':'colors.good','#e08888':'colors.bad','#e6bd72':'colors.warning','#7bb7df':'colors.info',
  '#07111c':'equipmentColors.background','#071a2b':'equipmentColors.stage','#0c1d2e':'equipmentColors.panel',
  '#11283d':'equipmentColors.panelRaised','#725a2b':'equipmentColors.line','#c69a3d':'equipmentColors.lineStrong',
  '#f2c14e':'equipmentColors.gold','#efd895':'equipmentColors.goldSoft','#123e61':'equipmentColors.selected',
  '#43bdf2':'equipmentColors.selectedLine','#09131f':'chrome.navBackground','#394657':'chrome.navBorder',
  'rgba(212,173,88,.13)':'chrome.activeTint','#9eabbc':'colors.muted','#8190a3':'colors.muted',
  '#d93646':'chrome.badge','#203c50':'chrome.primarySurface','#58788c':'chrome.primaryBorder',
  '#152331':'chrome.secondarySurface','#304150':'chrome.secondaryBorder','#302027':'chrome.dangerSurface',
  '#8e5158':'chrome.dangerBorder','#f1b3b5':'chrome.dangerText','#a2e5ed':'chrome.focus',
  '#080e17':'colors.bg','#a5b2c4':'colors.muted','#183042':'equipmentColors.selected','#dfeff5':'colors.text',
  '#8f9cae':'colors.muted','#e9c782':'equipmentColors.goldSoft','#f1d89f':'equipmentColors.goldSoft',
  '#05070a':'chrome.imageStage','#0f1a26':'chrome.fieldSurface','#354352':'colors.line','#8bafc2':'colors.info',
  '#101c28':'colors.panel2','#bcc8d5':'colors.muted','#25323d':'colors.line','#bac6d5':'colors.muted',
  '#d9f3ff':'chrome.selectedText','#101b27':'colors.panel','#2a1b20':'chrome.dangerSurface',
  '#172b24':'chrome.positiveSurface','#332515':'chrome.warningSurface','#09121a':'colors.panel',
  '#182031':'colors.panel2','#49d783':'colors.good','#e8c36f':'equipmentColors.goldSoft',
  '#14272a':'chrome.positiveSurface','#102536':'colors.panel2','#20180f':'chrome.warningSurface',
  '#2b2317':'chrome.warningSurface','#17352a':'chrome.positiveSurface','#20384a':'colors.panel2',
  '#272417':'chrome.warningSurface','#101923':'colors.panel2','#29251c':'equipmentColors.selected',
  '#17364b':'equipmentColors.selected','#a9dcf6':'chrome.selectedText','#f4d9dd':'chrome.dangerText',
  '#293746':'colors.line','#263449':'colors.panel2','#234c65':'equipmentColors.selected','#aab6c7':'colors.muted',
  '#b8e5f5':'chrome.selectedText','#080c12':'colors.bg','#05090f':'colors.bg',
  'rgba(12,20,31,.96)':'colors.panel','rgba(16,26,39,.97)':'colors.panel','#2b2417':'chrome.warningSurface',
  '#14261d':'chrome.positiveSurface','#132333':'colors.panel2','#5d3674':'chrome.specialSurface',
  '#f4d8ff':'chrome.specialText','#cba0f5':'chrome.specialAccent','#d6b1ee':'chrome.specialAccent',
  '#9de0b7':'colors.good','#9dccf2':'colors.info','#d7f3df':'colors.good','#214932':'chrome.positiveSurface',
  '#efbd69':'equipmentColors.goldSoft','#f0c66f':'equipmentColors.goldSoft','#d6a85a':'equipmentColors.lineStrong',
  '#101724':'colors.panel','#09111c':'equipmentColors.stage','#273142':'colors.panel2','#f2d08d':'equipmentColors.goldSoft',
  '#172c3c':'equipmentColors.selected','rgba(7,17,28,.88)':'colors.panel2','rgba(18,57,78,.94)':'equipmentColors.selected',
};

function themeTokenMap():Record<string,ThemeColorToken>{
  const map={...legacyTokenMap};
  for(const [key,value] of Object.entries(UI_THEMES.veldryn.colors))map[value.toLowerCase()]=`colors.${key}`;
  for(const [key,value] of Object.entries(UI_THEMES.veldryn.equipmentColors))map[value.toLowerCase()]=`equipmentColors.${key}`;
  for(const [key,value] of Object.entries(UI_THEMES.veldryn.chrome))map[value.toLowerCase()]=`chrome.${key}`;
  return map;
}
const themedColorTokens=themeTokenMap();

function colorForToken(token:ThemeColorToken):string{
  const [group,key]=token.split('.');
  const theme=activeUiTheme() as any;
  return theme[group]?.[key]??token;
}
function hexRgb(value:string):[number,number,number]|null{
  const match=/^#([0-9a-f]{6})$/i.exec(value);if(!match)return null;
  const n=parseInt(match[1],16);return [(n>>16)&255,(n>>8)&255,n&255];
}
function rgbHex(rgb:[number,number,number]):string{return '#'+rgb.map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('').toUpperCase();}
function relativeLuminance(rgb:[number,number,number]):number{
  const [r,g,b]=rgb.map(value=>{const c=value/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});
  return .2126*r+.7152*g+.0722*b;
}
function contrastRatio(a:[number,number,number],b:[number,number,number]):number{
  const l1=relativeLuminance(a),l2=relativeLuminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
function contrastSafeFixedColor(value:string,targetRatio:number):string{
  if(activeThemeId==='veldryn')return value;
  const source=hexRgb(value),background=hexRgb(activeUiTheme().colors.panel);if(!source||!background)return value;
  if(contrastRatio(source,background)>=targetRatio)return value;
  const toward=activeUiTheme().mode==='light'?[0,0,0] as [number,number,number]:[255,255,255] as [number,number,number];
  for(let step=1;step<=10;step++){
    const t=step/10;
    const candidate=source.map((channel,index)=>channel+(toward[index]-channel)*t) as [number,number,number];
    if(contrastRatio(candidate,background)>=targetRatio)return rgbHex(candidate);
  }
  return activeUiTheme().colors.text;
}
function resolveThemeValue(value:any,property?:string):any{
  if(typeof value==='string'){
    const token=themedColorTokens[value.toLowerCase()];
    if(token)return colorForToken(token);
    if(property==='color'||property==='tintColor')return contrastSafeFixedColor(value,7);
    if(property==='borderColor'||property==='borderTopColor'||property==='borderBottomColor'||property==='borderLeftColor'||property==='borderRightColor')return contrastSafeFixedColor(value,3);
    return value;
  }
  if(Array.isArray(value))return value.map(entry=>resolveThemeValue(entry,property));
  if(value&&typeof value==='object'){
    const next:any={};
    for(const [key,entry] of Object.entries(value))next[key]=resolveThemeValue(entry,key);
    return next;
  }
  return value;
}

/**
 * Theme-aware StyleSheet bridge.
 *
 * Most VELDRYN screens already centralize colors through StyleSheet.create. We keep
 * their existing style declarations intact, but resolve semantic/default legacy
 * colors when a style is accessed. This makes all existing screens react to a
 * theme switch without maintaining three copies of every stylesheet.
 */
const runtimeStyleSheet=StyleSheet as any;
if(!runtimeStyleSheet.__veldrynThemePatched){
  const nativeCreate=StyleSheet.create.bind(StyleSheet);
  runtimeStyleSheet.create=(styles:any)=>{
    const created=nativeCreate(styles);
    const cache=new Map<PropertyKey,{theme:UiThemeId;value:any}>();
    return new Proxy(created,{
      get(target,key,receiver){
        const value=Reflect.get(target,key,receiver);
        if(!value||typeof value!=='object')return value;
        const cached=cache.get(key);
        if(cached?.theme===activeThemeId)return cached.value;
        const resolved=resolveThemeValue(value);
        cache.set(key,{theme:activeThemeId,value:resolved});
        return resolved;
      },
    });
  };
  runtimeStyleSheet.__veldrynThemePatched=true;
}
