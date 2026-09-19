export type GuildTagReason='invalid_format'|'reserved'|'blocked'|'taken';
export type GuildTagAvailability={normalizedTag:string;available:boolean;reason?:GuildTagReason};
const RESERVED=new Set(['ADM','MOD','DEV','SYS','BOT','NPC','SUP']);
const BLOCKED=new Set(['SEX','XXX','CUM','FUK','FCK','ASS','TIT','DIC','DCK','CNT','KKK','NAZ','NIG','FAG']);

export function normalizeGuildTag(input:string){return input.trim().toUpperCase();}
export function validateGuildTag(input:string,extraBlocked:ReadonlySet<string>=new Set()){
 const tag=normalizeGuildTag(input);
 if(!/^[A-Z]{3}$/.test(tag))throw new Error('guild_tag_invalid_format');
 if(RESERVED.has(tag))throw new Error('guild_tag_reserved');
 if(BLOCKED.has(tag)||extraBlocked.has(tag))throw new Error('guild_tag_blocked');
 return tag;
}
export function guildTagAvailability(input:string,permanentlyClaimed:ReadonlySet<string>,extraBlocked:ReadonlySet<string>=new Set()):GuildTagAvailability{
 let normalizedTag=normalizeGuildTag(input);try{normalizedTag=validateGuildTag(input,extraBlocked)}catch(error){const value=String(error);return{normalizedTag,available:false,reason:value.includes('reserved')?'reserved':value.includes('blocked')?'blocked':'invalid_format'}}
 return permanentlyClaimed.has(normalizedTag)?{normalizedTag,available:false,reason:'taken'}:{normalizedTag,available:true};
}
