export type PrimaryNavigationId='character'|'skills'|'world'|'inventory'|'account';
export type NotificationKind='friend_request'|'party_invite'|'guild_invite'|'guild_application'|'chat_unread'|'weekly_order_complete'|'reward_ready'|'collection_unlock'|'profile_customization'|'event_reward_ready'|'account_action'|'companion_attention';
export interface NavigationNotification{key:string;kind:NotificationKind;count?:number;unread?:boolean}
export interface NavigationBadge{count:number;dot:boolean;display?:string}
export type NavigationBadgeMap=Record<PrimaryNavigationId,NavigationBadge>;
export interface NotificationDestination{primary:PrimaryNavigationId;subroute:string;mode:'count'|'dot'}

export const NOTIFICATION_DESTINATIONS:Record<NotificationKind,NotificationDestination>={
 friend_request:{primary:'account',subroute:'social.friends.requests',mode:'count'},
 party_invite:{primary:'account',subroute:'social.party.invites',mode:'count'},
 guild_invite:{primary:'account',subroute:'social.guild.invites',mode:'count'},
 guild_application:{primary:'account',subroute:'social.guild.applications',mode:'count'},
 chat_unread:{primary:'account',subroute:'social.chat',mode:'count'},
 weekly_order_complete:{primary:'world',subroute:'world.weekly-orders',mode:'dot'},
 reward_ready:{primary:'character',subroute:'character.rewards',mode:'dot'},
 collection_unlock:{primary:'account',subroute:'collections',mode:'dot'},
 profile_customization:{primary:'account',subroute:'profile.customize',mode:'dot'},
 event_reward_ready:{primary:'account',subroute:'events.rewards',mode:'count'},
 account_action:{primary:'account',subroute:'account',mode:'dot'},
 companion_attention:{primary:'account',subroute:'companions',mode:'dot'},
};

const empty=():NavigationBadge=>({count:0,dot:false});
export function badgeDisplay(count:number){return count>99?'99+':count>0?String(count):undefined}

export function buildNavigationBadges(rows:NavigationNotification[]):NavigationBadgeMap{
 const out:NavigationBadgeMap={character:empty(),skills:empty(),world:empty(),inventory:empty(),account:empty()},seen=new Set<string>();
 for(const row of rows){
  if(!row.unread||seen.has(row.key))continue;
  seen.add(row.key);
  const destination=NOTIFICATION_DESTINATIONS[row.kind],badge=out[destination.primary];
  if(destination.mode==='count')badge.count+=Math.max(1,Math.floor(row.count??1));else badge.dot=true;
 }
 for(const badge of Object.values(out)){badge.display=badgeDisplay(badge.count);if(badge.count>0)badge.dot=true}
 return out;
}

export function destinationForNotification(kind:NotificationKind){return NOTIFICATION_DESTINATIONS[kind]}
export type SubrouteBadgeMap=Record<string,NavigationBadge>;

export function buildSubrouteBadges(rows:NavigationNotification[]):SubrouteBadgeMap{
 const out:SubrouteBadgeMap={},seen=new Set<string>();
 for(const row of rows){
  if(!row.unread||seen.has(row.key))continue;
  seen.add(row.key);
  const destination=NOTIFICATION_DESTINATIONS[row.kind],badge=out[destination.subroute]??{count:0,dot:false};
  if(destination.mode==='count')badge.count+=Math.max(1,Math.floor(row.count??1));else badge.dot=true;
  badge.display=badgeDisplay(badge.count);if(badge.count>0)badge.dot=true;out[destination.subroute]=badge;
 }
 return out;
}

export function mergeRouteBadges(map:SubrouteBadgeMap,routes:string[]):NavigationBadge{
 let count=0,dot=false;
 for(const route of routes){const badge=map[route];if(!badge)continue;count+=badge.count;dot=dot||badge.dot}
 return {count,dot:dot||count>0,display:badgeDisplay(count)};
}
