export const GUILD_TAG_LENGTH=3 as const;
export const DEFAULT_GUILD_TAG_COLOR_ID='tag_silver' as const;

export type GuildTagColorId='tag_silver'|'tag_gold'|'tag_emerald'|'tag_sapphire'|'tag_frost'|'tag_crimson'|'tag_amethyst'|'tag_mythic';
export type GuildTagAvailabilityReason='invalid_format'|'reserved'|'blocked'|'taken';
export type GuildTagAvailability={input:string;normalizedTag?:string;valid:boolean;available:boolean;reason?:GuildTagAvailabilityReason};
export type GuildTagColor={id:GuildTagColorId;name:string;color:string;minimumGuildLevel?:number;achievementId?:string};

const RESERVED=new Set(['ADM','MOD','DEV','SYS','BOT','NPC','SUP']);
const BLOCKED=new Set(['SEX','XXX','CUM','FUK','FCK','ASS','TIT','DIC','DCK','CNT','KKK','NAZ','NIG','FAG']);

export const GUILD_TAG_COLORS:readonly GuildTagColor[]=[
  {id:'tag_silver',name:'Tag Silver',color:'#DCE6F4'},
  {id:'tag_gold',name:'Tag Gold',color:'#F1C96B',minimumGuildLevel:5},
  {id:'tag_emerald',name:'Tag Emerald',color:'#69DEA0',minimumGuildLevel:10},
  {id:'tag_sapphire',name:'Tag Sapphire',color:'#73BCFF',minimumGuildLevel:15},
  {id:'tag_frost',name:'Dungeon Frost',color:'#8DEBFF',achievementId:'guild_pve_dungeon_25'},
  {id:'tag_crimson',name:'Bossbreaker Crimson',color:'#FF7870',achievementId:'guild_pve_bossbreaker'},
  {id:'tag_amethyst',name:'Raid Amethyst',color:'#CD94FF',achievementId:'guild_pve_raid_first_clear'},
  {id:'tag_mythic',name:'Mythic Gold',color:'#FFF09A',achievementId:'guild_pve_raid_hard_clear'},
];

export function normalizeGuildTag(input:string){return input.trim().toUpperCase();}
export function isGuildTagFormatValid(input:string){return/^[A-Za-z]{3}$/.test(input.trim());}
export function guildTagModerationReason(input:string,extraBlocked:ReadonlySet<string>=new Set()):GuildTagAvailabilityReason|undefined{
  const tag=normalizeGuildTag(input);
  if(!/^[A-Z]{3}$/.test(tag))return'invalid_format';
  if(RESERVED.has(tag))return'reserved';
  if(BLOCKED.has(tag)||extraBlocked.has(tag))return'blocked';
  return undefined;
}
export function validateGuildTag(input:string,extraBlocked:ReadonlySet<string>=new Set()){
  const reason=guildTagModerationReason(input,extraBlocked);if(reason)throw new Error(`guild_tag_${reason}`);return normalizeGuildTag(input);
}
export function guildTagAvailabilityMessage(value:GuildTagAvailability){
  if(value.available&&value.normalizedTag)return`${value.normalizedTag} is available`;
  if(value.reason==='taken')return'That guild tag has already been used.';
  if(value.reason==='reserved')return'That guild tag is reserved.';
  if(value.reason==='blocked')return'That guild tag is not allowed.';
  return'Guild tag must be exactly 3 letters (A–Z).';
}
export function guildTagLabel(tag?:string){return tag?`[${normalizeGuildTag(tag)}]`:'';}
export function guildTagColor(id?:string){return GUILD_TAG_COLORS.find(entry=>entry.id===id)?.color??GUILD_TAG_COLORS[0].color;}
export function formatGuildTaggedName(name:string,tag?:string){return tag?`[${normalizeGuildTag(tag)}] ${name}`:name;}
