import type {GameState} from './types';

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

function entitlement(state:GameState,...keys:string[]){
  const entitlements=state.account.entitlements??{};
  return keys.some(key=>entitlements[key]===true);
}

export function playerNameStyleEntitlements(state:GameState):PlayerNameStyleEntitlements{
  const vipPlus=entitlement(state,'vip_plus','vipplus','vip+');
  const supporter=entitlement(state,'supporter','supporter_subscription');
  return {vipPlus,supporter,canUseSolidRgb:vipPlus||supporter,canUseAdvanced:supporter};
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
