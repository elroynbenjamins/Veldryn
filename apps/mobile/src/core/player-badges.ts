export type PlayerBadgeId='admin'|'moderator'|'supporter';
export interface PlayerBadgeIdentity{staff:'admin'|'moderator'|null;supporter:boolean;validUntilMs:number;}
export const PLAYER_BADGE_LABELS:Record<PlayerBadgeId,string>={admin:'Admin',moderator:'Moderator',supporter:'Supporter'};

// Only pass the server identity projection here, never save data or user metadata.
export function normalizePlayerBadges(value:unknown):PlayerBadgeIdentity|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;
 if(typeof row.validUntilMs!=='number'||!Number.isSafeInteger(row.validUntilMs)||row.validUntilMs<=0)return undefined;
 return {staff:row.staff==='admin'||row.staff==='moderator'?row.staff:null,supporter:row.supporter===true,validUntilMs:row.validUntilMs};
}
export function playerBadgeIds(identity:PlayerBadgeIdentity|undefined,nowMs=Date.now()):PlayerBadgeId[]{
 identity=normalizePlayerBadges(identity);
 if(!identity||!Number.isFinite(nowMs)||identity.validUntilMs<=nowMs)return [];
 return [...(identity.staff?[identity.staff]:[]),...(identity.supporter?['supporter' as const]:[])];
}
