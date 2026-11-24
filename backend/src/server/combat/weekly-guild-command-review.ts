/** Unregistered review-only command boundary; no live HTTP route or DB.
 * Authentication and store selection are injected trusted services, with
 * the same account ownership checks inside the store. */
import type {WeeklyRaidReviewStore} from './weekly-guild-raid-transaction-review';
export const WEEKLY_GUILD_COMMAND_RELEASED=false as const;
interface Services{
 authenticate(token:string):Promise<string|null>;
 resolveGuild(accountId:string):Promise<string|null>;
 resolveStore(guildId:string,encounterId:string):Promise<WeeklyRaidReviewStore|null>;
 now():number;
}
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export async function weeklyGuildReviewCommand(services:Services,authorization:string|undefined,body:unknown){
 const token=authorization?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)throw Error('auth_required');
 const accountId=await services.authenticate(token);
 if(!accountId||!id(accountId))throw Error('invalid_session');
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_weekly_review_command');
 const b=body as Record<string,unknown>;
 if(!id(b.encounterId)||!id(b.nonce)||b.nonce.length<8||
  (b.action!=='start'&&b.action!=='read')||
  (b.action==='start'&&(!id(b.characterId)||Object.keys(b).length!==4))||
  (b.action==='read'&&Object.keys(b).length!==3))throw Error('invalid_weekly_review_command');
 const guildId=await services.resolveGuild(accountId);
 if(!guildId||!id(guildId))throw Error('membership_required');
 const store=await services.resolveStore(guildId,b.encounterId);
 if(!store||store.snapshot().encounterId!==b.encounterId)throw Error('encounter_unavailable');
 const principal={accountId,guildId};
 return b.action==='start'?store.start(principal,{characterId:b.characterId as string,nonce:b.nonce},services.now()):store.read(principal,b.nonce);
}
