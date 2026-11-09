/** Public badge IDs. Never trust client-selected badge ownership. */
export const COLLECTIBLE_PLAYER_BADGE_IDS=['founder','beta_tester','veteran','guild_leader','community_champion','event_champion'] as const;
export type CollectiblePlayerBadgeId=typeof COLLECTIBLE_PLAYER_BADGE_IDS[number];
export type PlayerBadgeId='admin'|'moderator'|'supporter'|CollectiblePlayerBadgeId;
export interface PlayerBadgeIdentity{staff:'admin'|'moderator'|null;supporter:boolean;extras?:CollectiblePlayerBadgeId[];validUntilMs:number;}
export const PLAYER_BADGE_LABELS:Record<PlayerBadgeId,string>={
 admin:'Admin',moderator:'Moderator',supporter:'Supporter',
 founder:'Founder',beta_tester:'Beta Tester',veteran:'Veteran',guild_leader:'Guild Leader',
 community_champion:'Community Champion',event_champion:'Event Champion',
};
export const PLAYER_BADGE_UNLOCK_HINTS:Record<CollectiblePlayerBadgeId,string>={
 founder:'Awarded to founding players.',
 beta_tester:'Awarded to early beta testers.',
 veteran:'Play Veldryn for 90 days.',
 guild_leader:'Lead an active guild.',
 community_champion:'Awarded for outstanding community contributions.',
 event_champion:'Awarded for special event achievements.',
};
export const MAX_DISPLAYED_PLAYER_BADGES=2;
export function isCollectiblePlayerBadgeId(value:unknown):value is CollectiblePlayerBadgeId{
 return typeof value==='string'&&(COLLECTIBLE_PLAYER_BADGE_IDS as readonly string[]).includes(value);
}
function cleanExtras(value:unknown):CollectiblePlayerBadgeId[]{
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(isCollectiblePlayerBadgeId))].slice(0,MAX_DISPLAYED_PLAYER_BADGES);
}
// Only pass the trusted server identity projection here, never save data or user metadata.
export function normalizePlayerBadges(value:unknown):PlayerBadgeIdentity|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;
 if(typeof row.validUntilMs!=='number'||!Number.isSafeInteger(row.validUntilMs)||row.validUntilMs<=0)return undefined;
 return {staff:row.staff==='admin'||row.staff==='moderator'?row.staff:null,supporter:row.supporter===true,extras:cleanExtras(row.extras),validUntilMs:row.validUntilMs};
}
export function playerBadgeIds(identity:PlayerBadgeIdentity|undefined,nowMs=Date.now()):PlayerBadgeId[]{
 identity=normalizePlayerBadges(identity);
 if(!identity||!Number.isFinite(nowMs)||identity.validUntilMs<=nowMs)return [];
 const ordered:PlayerBadgeId[]=[...(identity.staff?[identity.staff]:[]),...(identity.extras??[]),...(identity.supporter?['supporter' as const]:[])];
 return [...new Set(ordered)].slice(0,MAX_DISPLAYED_PLAYER_BADGES);
}
export function validatedFeaturedBadges(value:unknown,owned:readonly CollectiblePlayerBadgeId[]):CollectiblePlayerBadgeId[]{
 return cleanExtras(value).filter(id=>owned.includes(id));
}
