import type {GameState} from './types';
import {accountEntitlementBenefits} from './account-entitlements';

export type PlayerNameAnimation='none'|'flow'|'prismatic';
export interface PlayerNameStylePreference{
  mode:'default'|'solid'|'gradient';
  solidColor?:string;
  gradientColors?:string[];
  animation?:PlayerNameAnimation;
}

export interface PlayerNameStyleEntitlements{
  vipPlus:boolean;
  supporter:boolean;
  canUseSolidRgb:boolean;
  canUseAdvanced:boolean;
}

export const DEFAULT_VIP_NAME_COLOR='#8F7CFF';
export const SUPPORTER_NAME_PRESETS=[
  {id:'aurora',name:'Aurora',colors:['#55E6D1','#58A6FF','#A978FF'],animation:'flow' as const},
  {id:'ember',name:'Ember',colors:['#FF665A','#FF9C42','#FFD166'],animation:'flow' as const},
  {id:'frost',name:'Frost',colors:['#4B7BFF','#65D9FF','#E8FAFF'],animation:'flow' as const},
  {id:'royal',name:'Royal',colors:['#8F5CFF','#DDAF5A'],animation:'flow' as const},
  {id:'starfall',name:'Starfall',colors:['#4A53C6','#9C67FF','#55DDF2'],animation:'flow' as const},
  {id:'celestial',name:'Celestial',colors:['#F4C969','#BDEBFF','#C9B8FF'],animation:'flow' as const},
  {id:'prismatic',name:'Prismatic',colors:['#FF6978','#FFD166','#6EE7B7','#61C7FF','#A978FF'],animation:'prismatic' as const},
] as const;

/** Curated swatches for the VIP+ colour picker. A hex field stays available beside them,
 * so a player can either tap a known-good colour or type an exact code. */
export type NameColorTone='warm'|'cool'|'nature'|'arcane'|'neutral';
export const NAME_COLOR_PALETTE=[
  {id:'ember',name:'Ember',color:'#FF6F59',tone:'warm' as const},
  {id:'flame',name:'Flame',color:'#FF9C42',tone:'warm' as const},
  {id:'amber',name:'Amber',color:'#FFC247',tone:'warm' as const},
  {id:'rose',name:'Rose',color:'#FF7FA8',tone:'warm' as const},
  {id:'crimson',name:'Crimson',color:'#D94452',tone:'warm' as const},
  {id:'sky',name:'Sky',color:'#61C7FF',tone:'cool' as const},
  {id:'azure',name:'Azure',color:'#4B7BFF',tone:'cool' as const},
  {id:'frost',name:'Frost',color:'#BDEBFF',tone:'cool' as const},
  {id:'teal',name:'Teal',color:'#35CFC0',tone:'cool' as const},
  {id:'deep',name:'Deep Tide',color:'#2E6E8E',tone:'cool' as const},
  {id:'moss',name:'Moss',color:'#7FC77F',tone:'nature' as const},
  {id:'fern',name:'Fern',color:'#4FAE6E',tone:'nature' as const},
  {id:'lime',name:'Lime',color:'#C7E86B',tone:'nature' as const},
  {id:'bark',name:'Bark',color:'#A9815A',tone:'nature' as const},
  {id:'oath',name:'Oathsteel',color:'#8FA6B2',tone:'nature' as const},
  {id:'violet',name:'Arcane Violet',color:'#8F7CFF',tone:'arcane' as const},
  {id:'orchid',name:'Orchid',color:'#C08BFF',tone:'arcane' as const},
  {id:'void',name:'Void',color:'#6A4BC4',tone:'arcane' as const},
  {id:'veil',name:'Veilglow',color:'#B6FF8F',tone:'arcane' as const},
  {id:'gilded',name:'Gilded',color:'#DDAF5A',tone:'arcane' as const},
  {id:'parchment',name:'Parchment',color:'#E8DCC6',tone:'neutral' as const},
  {id:'silver',name:'Silver',color:'#D5DADD',tone:'neutral' as const},
  {id:'slate',name:'Slate',color:'#8A939B',tone:'neutral' as const},
  {id:'ink',name:'Ink',color:'#4A5159',tone:'neutral' as const},
] as const;
export const NAME_COLOR_TONES:readonly NameColorTone[]=['warm','cool','nature','arcane','neutral'];
export const NAME_COLOR_TONE_LABELS:Record<NameColorTone,string>={warm:'Warm',cool:'Cool',nature:'Nature',arcane:'Arcane',neutral:'Neutral'};
/** True only for a complete 3 or 6 digit hex code, so the field can report a typo before saving. */
export function isHexColor(value:string|undefined){return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test((value??'').trim())}
export function nameColorPaletteMatch(value:string|undefined){const hex=normalizeHexColor(value,'');return NAME_COLOR_PALETTE.find(row=>row.color.toUpperCase()===hex)?.id}

export function playerNameStyleEntitlements(state:GameState):PlayerNameStyleEntitlements{
  const benefits=accountEntitlementBenefits(state);
  return {vipPlus:benefits.vipPlus,supporter:benefits.supporter,canUseSolidRgb:benefits.solidRgbNames,canUseAdvanced:benefits.advancedNameStyles};
}

export function normalizeHexColor(value:string|undefined,fallback=DEFAULT_VIP_NAME_COLOR){
  const raw=(value??'').trim().toUpperCase();
  const short=/^#?([0-9A-F]{3})$/.exec(raw);
  if(short){
    const [r,g,b]=short[1].split('');
    return '#'+r+r+g+g+b+b;
  }
  const full=/^#?([0-9A-F]{6})$/.exec(raw);
  return full?'#'+full[1]:fallback;
}

export function normalizePlayerNameStyle(raw:PlayerNameStylePreference|undefined):PlayerNameStylePreference{
  if(!raw||raw.mode==='default')return {mode:'default',animation:'none'};
  if(raw.mode==='solid')return {mode:'solid',solidColor:normalizeHexColor(raw.solidColor),animation:'none'};
  const colors=(raw.gradientColors??[]).map(color=>normalizeHexColor(color)).slice(0,3);
  if(colors.length<2)return {mode:'solid',solidColor:colors[0]??DEFAULT_VIP_NAME_COLOR,animation:'none'};
  const animation:PlayerNameAnimation=raw.animation==='prismatic'?'prismatic':raw.animation==='flow'?'flow':'none';
  return {mode:'gradient',gradientColors:colors,animation};
}

export function effectivePlayerNameStyle(state:GameState,raw:PlayerNameStylePreference|undefined=state.account.playerNameStyle){
  const entitlements=playerNameStyleEntitlements(state),style=normalizePlayerNameStyle(raw);
  if(style.mode==='default')return style;
  if(style.mode==='solid')return entitlements.canUseSolidRgb?style:{mode:'default',animation:'none'} as PlayerNameStylePreference;
  if(entitlements.canUseAdvanced)return style;
  if(entitlements.vipPlus){
    return {mode:'solid',solidColor:normalizeHexColor(state.account.vipPlusNameColor??style.gradientColors?.[0]),animation:'none'} as PlayerNameStylePreference;
  }
  return {mode:'default',animation:'none'} as PlayerNameStylePreference;
}

export function savePlayerNameStyle(state:GameState,style:PlayerNameStylePreference){
  const normalized=normalizePlayerNameStyle(style),entitlements=playerNameStyleEntitlements(state);
  if(normalized.mode==='solid'&&!entitlements.canUseSolidRgb)throw new Error('VIP+ or active Supporter is required for custom RGB names.');
  if(normalized.mode==='gradient'&&!entitlements.canUseAdvanced)throw new Error('Active Supporter is required for gradient name styles.');
  return {...state,account:{
    ...state.account,
    playerNameStyle:normalized,
    ...(normalized.mode==='solid'&&entitlements.vipPlus?{vipPlusNameColor:normalized.solidColor}:{}),
  }} as GameState;
}

function hexRgb(hex:string){
  const value=normalizeHexColor(hex).slice(1);
  return [parseInt(value.slice(0,2),16),parseInt(value.slice(2,4),16),parseInt(value.slice(4,6),16)] as const;
}
function rgbHex(r:number,g:number,b:number){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase();}
function mix(a:string,b:string,t:number){
  const A=hexRgb(a),B=hexRgb(b);
  return rgbHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t);
}
export function playerNameCharacterColors(name:string,style:PlayerNameStylePreference,phase=0){
  const normalized=normalizePlayerNameStyle(style);
  if(normalized.mode==='default')return [] as string[];
  if(normalized.mode==='solid')return Array.from(name).map(()=>normalizeHexColor(normalized.solidColor));
  let stops=(normalized.gradientColors??[]).map(color=>normalizeHexColor(color));
  if(normalized.animation==='prismatic'&&stops.length<4)stops=[...SUPPORTER_NAME_PRESETS.find(row=>row.id==='prismatic')!.colors];
  const chars=Array.from(name),count=Math.max(1,chars.length-1),offset=normalized.animation==='none'?0:phase%1;
  return chars.map((_,index)=>{
    const progress=(index/count+offset)%1;
    const scaled=progress*(stops.length-1),left=Math.floor(scaled),right=Math.min(stops.length-1,left+1);
    return mix(stops[left],stops[right],scaled-left);
  });
}
