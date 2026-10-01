import {normalizePlayerBadges,type PlayerBadgeIdentity} from '../core/player-badges';
import {supabase} from './supabase';

export interface PlayerBadgePreferences{identity?:PlayerBadgeIdentity;showSupporter:boolean;supporterAvailable:boolean;}
async function request(name:string,args:Record<string,unknown>={}):Promise<PlayerBadgePreferences>{
 if(!supabase)throw new Error('Online services are not configured.');
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw new Error(error.code==='PGRST202'?'Player badges are not available on this server yet.':error.message);
 return {identity:normalizePlayerBadges(data?.identity),showSupporter:data?.showSupporter===true,supporterAvailable:data?.supporterAvailable===true};
}
export const loadPlayerBadgePreferences=()=>request('player_badge_self_v1');
export const updatePlayerBadgePreferences=(showSupporter:boolean)=>request('update_player_badge_preferences_v1',{p_show_supporter:showSupporter});
