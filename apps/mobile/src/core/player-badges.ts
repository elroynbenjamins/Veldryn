/** Player badges are verified by server identity, never by a client-chosen unlock. */
export const COLLECTIBLE_PLAYER_BADGE_IDS=['founder','beta_tester','veteran','guild_leader','community_champion','event_champion'] as const;
export const SUPPORTER_BADGE_IDS=['supporter','supporter_3m','supporter_6m'] as const;
export type CollectiblePlayerBadgeId=typeof COLLECTIBLE_PLAYER_BADGE_IDS[number];
export type SupporterBadgeId=typeof SUPPORTER_BADGE_IDS[number];
export type EquippablePlayerBadgeId=SupporterBadgeId|CollectiblePlayerBadgeId;
export type PlayerBadgeId='admin'|'moderator'|EquippablePlayerBadgeId;
export type SupporterTenureTier=0|1|3|6;
export interface PlayerBadgeIdentity{
 staff:'admin'|'moderator'|null;
 /** Active AND selected Supporter; legacy field remains for older clients. */
 supporter:boolean;
 /** Server entitlement state, independent of which badge is equipped. */
 supporterAvailable?:boolean;
 extras?:CollectiblePlayerBadgeId[];
 /** null means explicitly unequipped, undefined means a legacy badge projection. */
 equippedBadgeId?:EquippablePlayerBadgeId|null;
 supporterTierMonths?:SupporterTenureTier;
 validUntilMs:number;
}
export const PLAYER_BADGE_LABELS:Record<PlayerBadgeId,string>={
 admin:'Admin',moderator:'Moderator',
 supporter:'Supporter',supporter_3m:'Supporter · 3 Months',supporter_6m:'Supporter · 6 Months',
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
export const SUPPORTER_BADGE_UNLOCK_HINTS:Record<SupporterBadgeId,string>={
 supporter:'Unlock with an active Supporter entitlement.',
 supporter_3m:'Unlock after 3 consecutive verified months of Supporter.',
 supporter_6m:'Unlock after 6 consecutive verified months of Supporter.',
};
/** One elective earned or Supporter badge; staff role is shown independently. */
export const MAX_EQUIPPED_PLAYER_BADGES=1;
export const MAX_DISPLAYED_PLAYER_BADGES=2;
export function isCollectiblePlayerBadgeId(value:unknown):value is CollectiblePlayerBadgeId{
 return typeof value==='string'&&(COLLECTIBLE_PLAYER_BADGE_IDS as readonly string[]).includes(value);
}
export function isSupporterBadgeId(value:unknown):value is SupporterBadgeId{
 return typeof value==='string'&&(SUPPORTER_BADGE_IDS as readonly string[]).includes(value);
}
export function isEquippablePlayerBadgeId(value:unknown):value is EquippablePlayerBadgeId{
 return isCollectiblePlayerBadgeId(value)||isSupporterBadgeId(value);
}
function cleanExtras(value:unknown):CollectiblePlayerBadgeId[]{
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(isCollectiblePlayerBadgeId))].slice(0,MAX_EQUIPPED_PLAYER_BADGES);
}
export function supporterTierMonths(value:unknown,active:boolean):SupporterTenureTier{
 if(!active)return 0;
 return value===6?6:value===3?3:1;
}
export function canEquipSupporterBadge(id:SupporterBadgeId,active:boolean,tier:SupporterTenureTier):boolean{
 return active && tier>=(id==='supporter_6m'?6:id==='supporter_3m'?3:1);
}
// Only pass trusted server identity projections here, never mutable save metadata.
export function normalizePlayerBadges(value:unknown):PlayerBadgeIdentity|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;
 if(typeof row.validUntilMs!=='number'||!Number.isSafeInteger(row.validUntilMs)||row.validUntilMs<=0)return undefined;
 const staff=row.staff==='admin'||row.staff==='moderator'?row.staff:null;
 const supporter=row.supporter===true;
 const supporterAvailable=row.supporterAvailable===true||supporter;
 const tier=supporterTierMonths(row.supporterTierMonths,supporterAvailable);
 const extras=cleanExtras(row.extras);
 const hasEquipped=Object.prototype.hasOwnProperty.call(row,'equippedBadgeId');
 const candidate=row.equippedBadgeId;
 let equippedBadgeId:EquippablePlayerBadgeId|null|undefined;
 if(hasEquipped){
  equippedBadgeId=isEquippablePlayerBadgeId(candidate)?candidate:null;
  if(equippedBadgeId&&isSupporterBadgeId(equippedBadgeId)&&!canEquipSupporterBadge(equippedBadgeId,supporterAvailable,tier))equippedBadgeId=null;
  if(equippedBadgeId&&isCollectiblePlayerBadgeId(equippedBadgeId)&&!extras.includes(equippedBadgeId))equippedBadgeId=null;
 }
 return {staff,supporter,supporterAvailable,extras,validUntilMs:row.validUntilMs,supporterTierMonths:tier,
  ...(hasEquipped?{equippedBadgeId}:{})};
}
export function playerBadgeIds(identity:PlayerBadgeIdentity|undefined,nowMs=Date.now()):PlayerBadgeId[]{
 identity=normalizePlayerBadges(identity);
 if(!identity||!Number.isFinite(nowMs)||identity.validUntilMs<=nowMs)return [];
 const featured=identity.equippedBadgeId===undefined
  ?identity.extras?.[0]??(identity.supporter?'supporter':undefined)
  :identity.equippedBadgeId??undefined;
 return [...(identity.staff?[identity.staff]:[]),...(featured?[featured]:[])].slice(0,MAX_DISPLAYED_PLAYER_BADGES);
}
export function validatedFeaturedBadges(value:unknown,owned:readonly CollectiblePlayerBadgeId[]):CollectiblePlayerBadgeId[]{
 return cleanExtras(value).filter(id=>owned.includes(id));
}
