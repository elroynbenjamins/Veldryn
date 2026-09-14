import type { GuildRole } from './guild-social';
import { roleHasPermission } from './guild-social';

export interface GuildProjectActor { accountId:string; guildId:string; role:GuildRole; }
export interface GuildProjectApiRepo {
  actor(accountId:string):Promise<GuildProjectActor|undefined>;
  castBoardVote(guildId:string,accountId:string,candidateId:string):Promise<void>;
  startCandidate(guildId:string,accountId:string,candidateId:string):Promise<{projectInstanceId:string}>;
  donate(input:{guildId:string;accountId:string;projectInstanceId:string;resourceKind:'gold'|'item';resourceId:string;amount:number;idempotencyKey:string}):Promise<{debited:number;remaining:number}>;
  claimReward(input:{guildId:string;accountId:string;projectInstanceId:string;rewardKey:string}):Promise<'claimed'|'already_claimed'|'not_eligible'>;
  setBulletin(guildId:string,accountId:string,body:string):Promise<void>;
  setMemberRole(guildId:string,actorAccountId:string,targetAccountId:string,role:GuildRole):Promise<void>;
  voteDecree(guildId:string,accountId:string,windowId:string,decreeId:string):Promise<void>;
  confirmDecree(guildId:string,accountId:string,windowId:string,decreeId:string):Promise<void>;
}

async function requireActor(repo:GuildProjectApiRepo,accountId:string):Promise<GuildProjectActor>{const actor=await repo.actor(accountId);if(!actor)throw new Error('guild_membership_required');return actor;}
export async function voteGuildProject(repo:GuildProjectApiRepo,accountId:string,candidateId:string){const a=await requireActor(repo,accountId);await repo.castBoardVote(a.guildId,a.accountId,candidateId);}
export async function startGuildProject(repo:GuildProjectApiRepo,accountId:string,candidateId:string){const a=await requireActor(repo,accountId);if(!roleHasPermission(a.role,'start_project'))throw new Error('guild_permission_denied');return repo.startCandidate(a.guildId,a.accountId,candidateId);}
export async function donateToGuildProject(repo:GuildProjectApiRepo,accountId:string,input:{projectInstanceId:string;resourceKind:'gold'|'item';resourceId:string;amount:number;idempotencyKey:string}){const a=await requireActor(repo,accountId);if(!Number.isInteger(input.amount)||input.amount<=0)throw new Error('invalid_donation_amount');if(input.idempotencyKey.trim().length<8)throw new Error('idempotency_key_required');return repo.donate({guildId:a.guildId,accountId:a.accountId,...input});}
export async function claimGuildProjectReward(repo:GuildProjectApiRepo,accountId:string,projectInstanceId:string,rewardKey:string){const a=await requireActor(repo,accountId);return repo.claimReward({guildId:a.guildId,accountId:a.accountId,projectInstanceId,rewardKey});}
export async function updateGuildBulletin(repo:GuildProjectApiRepo,accountId:string,body:string){const a=await requireActor(repo,accountId);if(!roleHasPermission(a.role,'edit_bulletin'))throw new Error('guild_permission_denied');if(body.trim().length>280)throw new Error('guild_bulletin_too_long');await repo.setBulletin(a.guildId,a.accountId,body.trim());}
export async function updateGuildMemberRole(repo:GuildProjectApiRepo,accountId:string,targetAccountId:string,role:GuildRole){const a=await requireActor(repo,accountId);if(!roleHasPermission(a.role,'edit_ranks'))throw new Error('guild_permission_denied');await repo.setMemberRole(a.guildId,a.accountId,targetAccountId,role);}
export async function voteGuildDecree(repo:GuildProjectApiRepo,accountId:string,windowId:string,decreeId:string){const a=await requireActor(repo,accountId);await repo.voteDecree(a.guildId,a.accountId,windowId,decreeId);}
export async function confirmGuildDecree(repo:GuildProjectApiRepo,accountId:string,windowId:string,decreeId:string){const a=await requireActor(repo,accountId);if(!roleHasPermission(a.role,'manage_decree'))throw new Error('guild_permission_denied');await repo.confirmDecree(a.guildId,a.accountId,windowId,decreeId);}
