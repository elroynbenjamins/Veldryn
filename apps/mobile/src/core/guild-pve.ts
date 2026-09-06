import {GameState,ItemStack} from './types';
import {stackItems} from './game';

export const GUILD_PROJECT_TARGET=1000;
export const GUILD_BOSS_MAX_HP=100000;
export function contributeToGuildProject(state:GameState,points=100):GameState{
  if(!state.account.guildMember) throw new Error('Join a guild first');
  const value=Math.max(0,Math.floor(points));
  return {...state,account:{...state.account,guildContribution:(state.account.guildContribution??0)+value,guildProjectProgress:Math.min(GUILD_PROJECT_TARGET,(state.account.guildProjectProgress??0)+value)}};
}
export function claimGuildProject(state:GameState):GameState{
  if((state.account.guildProjectProgress??0)<GUILD_PROJECT_TARGET) throw new Error('Guild project is not complete');
  if(state.account.guildProjectClaimed) throw new Error('Guild project reward already claimed');
  const items:ItemStack[]=[{itemId:'OATHGLASS_SHARD',quantity:2}];
  return {...state,character:state.character?{...state.character,gold:state.character.gold+500}:state.character,inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,items)},account:{...state.account,guildProjectClaimed:true}};
}
export function damageGuildBoss(state:GameState,damage=5000):GameState{
  if(!state.account.guildMember) throw new Error('Join a guild first');
  return {...state,account:{...state.account,guildContribution:(state.account.guildContribution??0)+50,guildBossHp:Math.max(0,(state.account.guildBossHp??GUILD_BOSS_MAX_HP)-Math.max(0,Math.floor(damage)))}};
}
