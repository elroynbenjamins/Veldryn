import {ShortLivedReadCache} from '../core/short-lived-read-cache';
import {guildPveBoard,myGuild} from './social';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';

/**
 * Guild-boss progress is a scoped snapshot, not a global leaderboard.
 * Always confirm current membership before serving cached content. No
 * membership means no cached board, and mutations remain server-authoritative.
 */
const bossReads=new ShortLivedReadCache<GuildPveEncounter[]>(25_000);
export async function loadGuildPveBoard(force=false):Promise<GuildPveEncounter[]>{
 const membership=await myGuild();
 if(!membership){bossReads.clear();return [];}
 return bossReads.read(membership.account_id+':'+membership.guild_id,()=>guildPveBoard(),force);
}
export function invalidateGuildPveBoard(){bossReads.clear();}
