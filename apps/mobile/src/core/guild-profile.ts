import {GameState} from './types';
export interface GuildProfile{ id:string;name:string;emblem:string;level:number;language:string;description:string;members:number;capacity:number;weeklyActivity:number;pveProgress:number;bossHp:number;joinPolicy:'open'|'apply'|'invite';minimumLevel:number; }
export function localGuildProfile(state:GameState):GuildProfile{
  return {id:'LOCAL_BLOOMWARDENS',name:'The Bloomwardens',emblem:'✦',level:3,language:'English',description:'A friendly expedition guild focused on steady PvE progress.',members:5,capacity:20,weeklyActivity:68,pveProgress:state.account.guildProjectProgress??0,bossHp:state.account.guildBossHp??100000,joinPolicy:state.account.guildJoinPolicy??'open',minimumLevel:state.account.guildMinimumLevel??10};
}
