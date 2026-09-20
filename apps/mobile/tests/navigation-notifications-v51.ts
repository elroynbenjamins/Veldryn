import {badgeDisplay,buildNavigationBadges,buildSubrouteBadges,destinationForNotification,mergeRouteBadges,type NavigationNotification} from '../src/core/navigation-notifications';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal<T>(actual:T,expected:T,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const notifications:NavigationNotification[]=[
 {key:'friend-1',kind:'friend_request',count:2,unread:true},
 {key:'friend-1',kind:'friend_request',count:2,unread:true},
 {key:'guild-1',kind:'guild_invite',count:1,unread:true},
 {key:'guild-2',kind:'guild_application',count:3,unread:true},
 {key:'dm-1',kind:'unread_dm',count:5,unread:true},
 {key:'party-1',kind:'party_invite',count:1,unread:true},
 {key:'event-1',kind:'event_reward_ready',count:4,unread:true},
 {key:'world-1',kind:'weekly_order_complete',unread:true},
 {key:'companion-1',kind:'companion_attention',unread:true},
 {key:'read-1',kind:'friend_request',count:20,unread:false},
];
const primary=buildNavigationBadges(notifications);
equal(primary.account.count,16,'Account counts aggregate and duplicate keys are ignored');
ok(primary.account.dot,'Count badges also mark the route as needing attention');
ok(primary.world.dot,'Dot-only notifications reach World');
equal(primary.world.count,0,'Dot-only notifications do not increment counts');
const sub=buildSubrouteBadges(notifications);
equal(sub['social.friends.requests'].count,2,'Friend request count');
equal(sub['social.chat.direct'].count,5,'Direct message count');
equal(mergeRouteBadges(sub,['social.guild.invites','social.guild.applications']).count,4,'Related subroutes merge');
equal(destinationForNotification('event_reward_ready').subroute,'events.rewards','Destination remains canonical');
equal(destinationForNotification('companion_attention').subroute,'companions','Companion attention routes to the Companion hub');
ok(sub['companions'].dot,'Companion subroute receives one consolidated dot');
equal(badgeDisplay(100),'99+','Large counts are capped for display');
console.log('PASS v51 navigation notification hierarchy');
