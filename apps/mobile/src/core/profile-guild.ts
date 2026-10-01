import type {GameState} from './types';

/** Optional fields allow a known tag to survive a failed cosmetic lookup.
 * Never substitute a default banner for an unknown online guild. */
export interface ProfileGuildIdentity{id?:string;name?:string|null;tag?:string|null;tagColorId?:string|null;nameColorId?:string|null;bannerId?:string|null;level?:number;frameId?:string;backgroundId?:string;motto?:string;memberCap?:number}
export type ProfileGuildCard=ProfileGuildIdentity&{name:string;level:number};
export function localProfileGuild(state:GameState):ProfileGuildIdentity|null{
 return state.account.guildMember?{name:'The Bloomwardens',level:1,bannerId:state.account.guildBannerId??'world_tree_green',frameId:state.account.guildProfileFrameId,backgroundId:state.account.guildBackgroundId,motto:state.account.guildMotto}:null;
}
