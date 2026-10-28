import type {RecruitmentCardView} from './party-social';

export type GuildManagementRole='leader'|'officer'|'member';

/** Local UI gating only; authoritative Guild membership permissions stay on the server. */
export function canManageGuild(role:GuildManagementRole|null|undefined):boolean{
 return role==='leader'||role==='officer';
}

/**
 * Keep the recruitment board scoped to the chosen Guild/Party context.
 * Account/role authorization and post visibility are enforced by the server RPC;
 * do not infer membership or reveal extra posts in the client.
 */
export function guildRecruitmentVisible(
 card:Pick<RecruitmentCardView,'postType'>,
 _membership:{guild_id:string;role:GuildManagementRole}|null|undefined,
 context:'guild'|'party',
):boolean{
 return context==='guild'
  ? card.postType==='looking_for_guild'||card.postType==='guild_recruiting'
  : card.postType==='looking_for_party'||card.postType==='party_recruiting';
}

export type GuildManagementRole='leader'|'officer'|'member';

export function partyMemberManagement(actorIsLeader:boolean,actorAccountId:string,targetAccountId:string){
 const other=!!actorAccountId&&!!targetAccountId&&actorAccountId!==targetAccountId;
 return {canTransfer:actorIsLeader&&other,canRemove:actorIsLeader&&other};
}

export function guildMemberManagement(actorRole:GuildManagementRole,targetRole:GuildManagementRole,isSelf:boolean){
 if(isSelf||targetRole==='leader')return {canPromote:false,canDemote:false,canRemove:false,canTransferLeadership:false};
 if(actorRole==='leader')return {
  canPromote:targetRole==='member',
  canDemote:targetRole==='officer',
  canRemove:true,
  canTransferLeadership:true,
 };
 if(actorRole==='officer')return {canPromote:false,canDemote:false,canRemove:targetRole==='member',canTransferLeadership:false};
 return {canPromote:false,canDemote:false,canRemove:false,canTransferLeadership:false};
}
