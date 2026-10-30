import {GUILD_JOIN_LEVEL} from './feature-unlocks';

/** The database checks the global Level 7 rule and each Guild's own minimum. */
export function requiredGuildJoinLevel(guildMinimumLevel=1):number{
 const local=Number.isFinite(guildMinimumLevel)?Math.floor(guildMinimumLevel):1;
 return Math.max(GUILD_JOIN_LEVEL,local);
}
export function guildLevelsRemaining(accountLevel:number|null,guildMinimumLevel=1):number|null{
 if(accountLevel===null)return null;
 return Math.max(0,requiredGuildJoinLevel(guildMinimumLevel)-Math.max(0,Math.floor(accountLevel)));
}
export function guildJoinRequirementText(accountLevel:number|null,guildMinimumLevel=1):string{
 const required=requiredGuildJoinLevel(guildMinimumLevel);
 const remaining=guildLevelsRemaining(accountLevel,guildMinimumLevel);
 if(remaining===null)return `Reach Level ${required} to join${required===GUILD_JOIN_LEVEL?' or create a Guild':' this Guild'}.`;
 if(remaining===0)return `Your account meets the Level ${required} requirement.`;
 return `Highest character: Level ${Math.max(0,Math.floor(accountLevel!))} · ${remaining} level${remaining===1?'':'s'} to go before you can ${required>GUILD_JOIN_LEVEL?'join this Guild':'join or create a Guild'}.`;
}
/** Surface human-readable backend rejections instead of Postgres exception identifiers. */
export function guildAccessError(reason:unknown):string{
 const message=reason instanceof Error?reason.message:String(reason??'');
 const normalized=message.trim().toLowerCase();
 const higher=normalized.match(/^minimum_level_(\d+)$/);
 if(higher)return `This Guild requires a Level ${higher[1]} character.`;
 if(normalized==='minimum_level_not_met')return 'You do not meet this Guild’s minimum character level.';
 if(normalized==='guild_level_7_required'||normalized==='guild_level_10_required')return `Reach Level ${GUILD_JOIN_LEVEL} on a character before joining or creating a Guild.`;
 if(normalized==='guild_full')return 'This Guild is full. Try another Guild.';
 if(normalized==='invite_only')return 'This Guild accepts invitations only.';
 if(normalized==='already_in_guild')return 'You are already in a Guild.';
 if(normalized==='guild_not_found')return 'This Guild no longer exists. Return to the Guild directory.';
 if(normalized==='link_account_required')return 'Link your guest account before creating a Guild.';
 if(normalized==='auth_required'||normalized==='authentication_required')return 'Sign in before accessing Guilds.';
 return message||'Guild service unavailable. Please retry.';
}
