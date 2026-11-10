import {GameState} from './types';
import {GUILD_JOIN_LEVEL} from './feature-unlocks';
export type GuildJoinResult={allowed:boolean;action:'join'|'apply'|'invite'|'level';message:string};
export function guildJoinResult(state:GameState):GuildJoinResult{
  if(!state.character)return {allowed:false,action:'level',message:'Create a character first'};
  const minimum=Math.max(GUILD_JOIN_LEVEL,state.account.guildMinimumLevel??GUILD_JOIN_LEVEL);
  // Global unlock is account-wide; each Guild may still set a stricter minimum.
  const highestLevel=Math.max(state.character.level,...(state.otherCharacters??[]).map(entry=>entry.character.level));
  if(highestLevel<minimum)return {allowed:false,action:'level',message:`Requires character level ${minimum}`};
  const policy=state.account.guildJoinPolicy??'open';
  if(policy==='open')return {allowed:true,action:'join',message:'Join guild immediately'};
  if(policy==='apply')return {allowed:true,action:'apply',message:'Submit an application to join'};
  return {allowed:false,action:'invite',message:'Invite required to join'};
}
