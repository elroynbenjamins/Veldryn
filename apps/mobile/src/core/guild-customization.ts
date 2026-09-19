export type GuildBannerId=
  |'swordwing_blue'
  |'world_tree_green'
  |'phoenix_crimson'
  |'moon_star_indigo'
  |'wolf_peak_charcoal'
  |'arcane_eye_purple'
  |'sun_lion_ivory'
  |'forge_anvil_teal';

export type GuildFrameId='classic'|'emerald_vine';
export type GuildNameplateId='classic'|'sapphire_royal';

export interface GuildBannerDefinition{
  id:GuildBannerId;
  name:string;
  emblem:string;
  primary:string;
  secondary:string;
  assetKey:string;
}
export interface GuildFrameDefinition{id:GuildFrameId;name:string;accent:string;assetKey?:string}
export interface GuildNameplateDefinition{id:GuildNameplateId;name:string;accent:string;assetKey?:string}

export const GUILD_BANNERS:GuildBannerDefinition[]=[
  {id:'swordwing_blue',name:'Swordwing',emblem:'⚔',primary:'#174f9f',secondary:'#d8e5f3',assetKey:'guild/banner_swordwing_blue'},
  {id:'world_tree_green',name:'World Tree',emblem:'♧',primary:'#155438',secondary:'#caa55d',assetKey:'guild/banner_world_tree_green'},
  {id:'phoenix_crimson',name:'Phoenix',emblem:'✦',primary:'#8f1f2b',secondary:'#e9bb4f',assetKey:'guild/banner_phoenix_crimson'},
  {id:'moon_star_indigo',name:'Moonstar',emblem:'☾',primary:'#253f91',secondary:'#e4cf91',assetKey:'guild/banner_moon_star_indigo'},
  {id:'wolf_peak_charcoal',name:'Wolfpeak',emblem:'▲',primary:'#252b33',secondary:'#b8d7ed',assetKey:'guild/banner_wolf_peak_charcoal'},
  {id:'arcane_eye_purple',name:'Arcane Eye',emblem:'◉',primary:'#54278b',secondary:'#dab35d',assetKey:'guild/banner_arcane_eye_purple'},
  {id:'sun_lion_ivory',name:'Sun Lion',emblem:'☀',primary:'#f0e6cf',secondary:'#bc842d',assetKey:'guild/banner_sun_lion_ivory'},
  {id:'forge_anvil_teal',name:'Forge',emblem:'◆',primary:'#155c59',secondary:'#a9804d',assetKey:'guild/banner_forge_anvil_teal'},
];

export const GUILD_FRAMES:GuildFrameDefinition[]=[
  {id:'classic',name:'Classic',accent:'#c19b4d'},
  {id:'emerald_vine',name:'Emerald Vine',accent:'#38b77a',assetKey:'guild/frame_emerald_vine'},
];

export const GUILD_NAMEPLATES:GuildNameplateDefinition[]=[
  {id:'classic',name:'Classic',accent:'#c19b4d'},
  {id:'sapphire_royal',name:'Sapphire Royal',accent:'#4979d5',assetKey:'guild/nameplate_sapphire_royal'},
];

export const DEFAULT_GUILD_BANNER_ID:GuildBannerId='world_tree_green';
export const DEFAULT_GUILD_FRAME_ID:GuildFrameId='classic';
export const DEFAULT_GUILD_NAMEPLATE_ID:GuildNameplateId='classic';

export function normalizeGuildBannerId(value:unknown):GuildBannerId{
  return GUILD_BANNERS.some(entry=>entry.id===value)?value as GuildBannerId:DEFAULT_GUILD_BANNER_ID;
}
export function normalizeGuildFrameId(value:unknown):GuildFrameId{
  return GUILD_FRAMES.some(entry=>entry.id===value)?value as GuildFrameId:DEFAULT_GUILD_FRAME_ID;
}
export function normalizeGuildNameplateId(value:unknown):GuildNameplateId{
  return GUILD_NAMEPLATES.some(entry=>entry.id===value)?value as GuildNameplateId:DEFAULT_GUILD_NAMEPLATE_ID;
}
export function normalizeGuildMotto(value:unknown){
  if(typeof value!=='string')return 'Stronger together.';
  const trimmed=value.trim().replace(/\s+/g,' ');
  return trimmed.slice(0,80)||'Stronger together.';
}
