import type {GameState} from './types';

export type PlayerNameStyleMode='default'|'solid'|'gradient';
export type SupporterNamePresetId='aurora'|'ember'|'frost'|'royal'|'starfall'|'prismatic'|'celestial';

export interface PlayerNameStyleSelection{
  mode:PlayerNameStyleMode;
  /** Permanent VIP+ fallback color. Supporter gradients keep this value stored. */
  solidColor:string;
  /** Two or three colors. Only effective while Supporter is active. */
  gradientColors:string[];
  presetId?:SupporterNamePresetId|'custom';
  animated?:boolean;
}

export interface SupporterNamePreset{
  id:SupporterNamePresetId;
  name:string;
  description:string;
  colors:readonly [string,string,string?];
  animated:boolean;
}

export const DEFAULT_PLAYER_NAME_SOLID='#7BD7FF';
export const DEFAULT_PLAYER_NAME_GRADIENT=['#42D9FF','#8B5CFF','#FF65C8'] as const;

export const SUPPORTER_NAME_PRESETS:readonly SupporterNamePreset[]=[
  {id:'aurora',name:'Aurora',description:'Teal → blue → violet',colors:['#4DE8D0','#4C8DFF','#A66BFF'],animated:true},
  {id:'ember',name:'Ember',description:'Crimson → orange → gold',colors:['#D94747','#F47A38','#F0C75E'],animated:false},
  {id:'frost',name:'Frost',description:'Deep blue → cyan → ice',colors:['#3E67D6','#54D8F2','#D9F7FF'],animated:false},
  {id:'royal',name:'Royal',description:'Violet → amethyst → gold',colors:['#7549D8','#B765E8','#E9C467'],animated:false},
  {id:'starfall',name:'Starfall',description:'Indigo → violet → cyan',colors:['#4C4DD8','#9259E8','#55DDF2'],animated:true},
  {id:'prismatic',name:'Prismatic',description:'Slow spectrum flow',colors:['#55DDF2','#C663EA','#F2C45D'],animated:true},
  {id:'celestial',name:'Celestial',description:'Gold → pale blue → lavender',colors:['#E9C467','#91D6F2','#C9A7F2'],animated:true},
];

function normalizedHex(value:unknown){
  if(typeof value!=='string')return undefined;
  let raw=value.trim().replace(/^#/,'').toUpperCase();
  if(/^[0-9A-F]{3}$/.test(raw))raw=raw.split('').map(char=>char+char).join('');
  return /^[0-9A-F]{6}$/.test(raw)?'#'+raw:undefined;
}

export function normalizeNameHexColor(value:unknown,fallback=DEFAULT_PLAYER_NAME_SOLID){
  return normalizedHex(value)??fallback;
}

function normalizeGradient(raw:unknown){
  const incoming=Array.isArray(raw)?raw:[];
  const colors=incoming.map(normalizedHex).filter((value):value is string=>!!value).slice(0,3);
  if(colors.length>=2)return colors;
  return [...DEFAULT_PLAYER_NAME_GRADIENT];
}

export function normalizePlayerNameStyle(raw:unknown):PlayerNameStyleSelection{
  const value=(raw&&typeof raw==='object'?raw:{}) as Partial<PlayerNameStyleSelection>;
  const mode:PlayerNameStyleMode=value.mode==='solid'||value.mode==='gradient'?value.mode:'default';
  const presetId=SUPPORTER_NAME_PRESETS.some(row=>row.id===value.presetId)?value.presetId as SupporterNamePresetId:value.presetId==='custom'?'custom':undefined;
  return {
    mode,
    solidColor:normalizeNameHexColor(value.solidColor),
    gradientColors:normalizeGradient(value.gradientColors),
    ...(presetId?{presetId}:{}),
    animated:value.animated===true,
  };
}

export function supporterNamePreset(id:SupporterNamePresetId){
  return SUPPORTER_NAME_PRESETS.find(row=>row.id===id)!;
}

export function supporterPresetStyle(id:SupporterNamePresetId,solidColor=DEFAULT_PLAYER_NAME_SOLID):PlayerNameStyleSelection{
  const preset=supporterNamePreset(id);
  return {mode:'gradient',solidColor:normalizeNameHexColor(solidColor),gradientColors:[...preset.colors].filter((value):value is string=>!!value),presetId:id,animated:preset.animated};
}

function entitlement(state:GameState,...keys:string[]){
  const entitlements=state.account.entitlements??{};
  return keys.some(key=>entitlements[key]===true);
}

export function playerNameStyleEntitlements(state:GameState){
  const vipPlus=entitlement(state,'vip_plus','vipplus','vip+');
  const supporter=entitlement(state,'supporter','supporter_subscription');
  return {vipPlus,supporter,canSolid:vipPlus||supporter,canGradient:supporter,canAnimated:supporter};
}

export function effectivePlayerNameStyleForEntitlements(raw:unknown,entitlements:{vipPlus:boolean;supporter:boolean}):PlayerNameStyleSelection{
  const selection=normalizePlayerNameStyle(raw);
  if(selection.mode==='gradient'&&entitlements.supporter)return selection;
  if(selection.mode==='solid'&&(entitlements.vipPlus||entitlements.supporter))return {...selection,animated:false};
  if(selection.mode==='gradient'&&entitlements.vipPlus)return {...selection,mode:'solid',animated:false};
  return {...selection,mode:'default',animated:false};
}

export function effectivePlayerNameStyle(state:GameState){
  return effectivePlayerNameStyleForEntitlements(state.account.playerNameStyle,playerNameStyleEntitlements(state));
}

export function withPlayerNameStyle(state:GameState,style:PlayerNameStyleSelection){
  return {...state,account:{...state.account,playerNameStyle:normalizePlayerNameStyle(style)}} as GameState;
}
