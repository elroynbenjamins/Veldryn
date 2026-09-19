export const RANKING_PROFESSION_BOARDS=['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'] as const;
export type RankingProfessionBoard=typeof RANKING_PROFESSION_BOARDS[number];
export type RankingBoardId='profession_total'|RankingProfessionBoard|'arena_rating'|'arena_wins'|'dungeon_tier'|'dungeon_clears'|'achievement_score'|'guild';
export type RankingEntityType='account'|'guild';
export interface RankingEntryProjection{rank:number;entityType:RankingEntityType;displayName:string;guildTag?:string|null;guildTagColorId?:string|null;subtitle?:string;value:number;secondaryValue?:number;detail?:string;isSelf:boolean;}
export interface RankingSelfProjection{listed:boolean;rank?:number;value:number;secondaryValue?:number;detail?:string;reason?:string;}
export interface RankingBoardProjection{board:RankingBoardId;title:string;description:string;unit:string;prestigeOnly:true;seasonId?:string;generatedAtMs:number;entries:RankingEntryProjection[];self?:RankingSelfProjection;}
