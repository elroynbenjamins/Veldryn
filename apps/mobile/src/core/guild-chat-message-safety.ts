import {normalizePlayerBadges,type PlayerBadgeIdentity} from './player-badges';
import {normalizePlayerNameStyle,type PlayerNameStylePreference} from './player-name-style';

/** A defensive display projection, not a replacement for server authorization. */
export interface SafeGuildChatMessage {
 id:string;
 account_id:string;
 sender_name:string;
 body:string;
 created_at:string;
 guild_tag?:string|null;
 guild_tag_color_id?:string|null;
 player_name_style?:PlayerNameStylePreference|null;
 player_badges?:PlayerBadgeIdentity;
 guild_role?:'leader'|'officer'|'member'|null;
}

function object(value:unknown):Record<string,unknown>|null {
 return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function optionalString(value:unknown):string|null {return typeof value==='string'?value:null;}
function playerNameStyle(value:unknown):PlayerNameStylePreference|undefined {
 const row=object(value);
 if(!row)return undefined;
 if(row.mode==='default')return {mode:'default',animation:'none'};
 if(row.mode==='solid'){
  return normalizePlayerNameStyle({mode:'solid',solidColor:typeof row.solidColor==='string'?row.solidColor:undefined});
 }
 if(row.mode!=='gradient'||!Array.isArray(row.gradientColors))return undefined;
 // A stale or malformed cosmetic preference must not prevent chat text from rendering.
 const colors=row.gradientColors.filter((color):color is string=>typeof color==='string').slice(0,3);
 return normalizePlayerNameStyle({mode:'gradient',gradientColors:colors,animation:row.animation==='flow'||row.animation==='prismatic'?row.animation:'none'});
}

/** Only validated, stable message IDs can enter ChatLog (and its read cursor). */
export function normalizeGuildChatMessages(value:unknown):SafeGuildChatMessage[] {
 if(!Array.isArray(value))return [];
 const seen=new Set<string>(),result:SafeGuildChatMessage[]=[];
 for(const item of value){
  const row=object(item);
  if(!row||typeof row.id!=='string'||!row.id.trim()||seen.has(row.id))continue;
  seen.add(row.id);
  const name=typeof row.sender_name==='string'&&row.sender_name.trim()?row.sender_name.slice(0,100):'Adventurer';
  const body=typeof row.body==='string'&&row.body.trim()?row.body.slice(0,1000):'Message unavailable';
  const createdAt=typeof row.created_at==='string'&&Number.isFinite(Date.parse(row.created_at))?row.created_at:'';
  const guildTag=typeof row.guild_tag==='string'&&/^[a-z]{3}$/i.test(row.guild_tag)?row.guild_tag:null;
  const role=row.guild_role==='leader'||row.guild_role==='officer'||row.guild_role==='member'?row.guild_role:null;
  result.push({
   id:row.id,account_id:typeof row.account_id==='string'?row.account_id:'',
   sender_name:name,body,created_at:createdAt,
   guild_tag:guildTag,guild_tag_color_id:optionalString(row.guild_tag_color_id),
   player_name_style:playerNameStyle(row.player_name_style),
   player_badges:normalizePlayerBadges(row.player_badges),
   guild_role:role,
  });
 }
 return result;
}
