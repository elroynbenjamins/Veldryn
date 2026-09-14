export type GuildRole='leader'|'officer'|'member';export type GuildJoinPolicy='open'|'apply'|'invite';
export interface GuildProfileProjection{id:string;name:string;description:string;language:string;crestId:string;level:number;xp:number;memberCap:number;memberCount:number;minimumLevel:number;joinPolicy:GuildJoinPolicy;createdAt:string}
export interface GuildMemberProjection{accountId:string;displayName:string;role:GuildRole;contributionXp:number;joinedAt:string}
export interface GuildSelfProjection{guild:GuildProfileProjection;callerRole:GuildRole;members:GuildMemberProjection[];availablePoints:number;spentPoints:number;weekly:{weekKey:string;projectProgress:number;projectGoal:number;bossHp:number;bossMaxHp:number;myProjectContribution:number;myBossContribution:number}}
export interface GuildDirectoryEntry extends GuildProfileProjection{}export interface GuildLeaderboardEntry{rank:number;guild:GuildProfileProjection}
export interface GuildCreateInput{requestId:string;characterId:string;name:string;description:string;language:string;crestId:string;joinPolicy:GuildJoinPolicy;minimumLevel:number}
export interface GuildProfileUpdateInput{requestId:string;description:string;language:string;crestId:string;joinPolicy:GuildJoinPolicy;minimumLevel:number}
export interface GuildInviteProjection{id:string;guildId:string;guildName:string;invitedByName:string;createdAt:string;expiresAt:string}
export interface GuildChatMessage{id:string;senderName:string;body:string;createdAt:string}
