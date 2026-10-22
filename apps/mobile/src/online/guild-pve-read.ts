import {ShortLivedReadCache} from '../core/short-lived-read-cache';
import {guildPveBoard} from './social';
import {supabase} from './supabase';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';

/**
 * Boss progress and any contribution positions are the only ranking-like
 * projection in the guild UI. This memory-only cache is scoped to the
 * authenticated viewer; rewards and boss attempts always go to the server.
 */
const bossReads=new ShortLivedReadCache<GuildPveEncounter[]>(25_000);
export async function loadGuildPveBoard(force=false):Promise<GuildPveEncounter[]>{
 if(!supabase)throw new Error('Online services unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 const viewer=session?.user.id;
 if(!viewer){bossReads.clear();throw new Error('Sign in to view Guild PvE.');}
 return bossReads.read(viewer,()=>guildPveBoard(),force);
}
export function invalidateGuildPveBoard(){bossReads.clear();}
