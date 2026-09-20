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
