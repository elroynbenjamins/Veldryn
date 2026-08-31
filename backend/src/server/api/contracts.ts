export const ANDROID_PACKAGE='com.elroybenjamins.veldryn';
export interface ClientHello{platform:'android'|'ios';buildNumber:number;contentVersion:string;locale:string;timezone:string}
export interface BootstrapDecision{allowed:boolean;forceUpdate:boolean;contentUpdateRequired:boolean;reason?:string}
export function decideBootstrap(h:ClientHello,minBuild:number,activeContent:string):BootstrapDecision{
 if(h.buildNumber<minBuild)return{allowed:false,forceUpdate:true,contentUpdateRequired:true,reason:'client_build_too_old'};
 return{allowed:true,forceUpdate:false,contentUpdateRequired:h.contentVersion!==activeContent};
}
export interface ApiEnvelope<T>{requestId:string;serverTime:string;contentVersion:string;data:T}
export function envelope<T>(requestId:string,contentVersion:string,data:T,serverTime=new Date().toISOString()):ApiEnvelope<T>{return{requestId,serverTime,contentVersion,data};}
export const API_NAMES=['bootstrap','claim_idle_progress','create_expedition_run','resolve_expedition_encounter','claim_expedition_reward','craft','place_market_order','cancel_market_order','queue_party','publish_echo_profile','create_guild','contribute_guild_xp','queue_arena','claim_raid_loot','send_chat_message','save_squad','publish_arena_defense','find_arena_opponents','start_squad_arena_match','claim_squad_arena_reward','start_triad_trial','resolve_triad_trial_floor','resume_triad_trial'] as const;
