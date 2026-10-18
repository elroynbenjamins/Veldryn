import {actionableClaimNotifications,badgeDisplay,buildNavigationBadges,buildQuickNavigationBadges,buildSubrouteBadges,destinationForNotification,mergeRouteBadges,type NavigationNotification} from '../src/core/navigation-notifications';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal<T>(actual:T,expected:T,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const notifications:NavigationNotification[]=[
 {key:'friend-1',kind:'friend_request',count:2,unread:true},
 {key:'friend-1',kind:'friend_request',count:2,unread:true},
 {key:'guild-1',kind:'guild_invite',count:1,unread:true},
 {key:'guild-2',kind:'guild_application',count:3,unread:true},
 {key:'chat-1',kind:'chat_unread',count:5,unread:true},
 {key:'party-1',kind:'party_invite',count:1,unread:true},
 {key:'event-1',kind:'event_reward_ready',count:4,unread:true},
 {key:'world-1',kind:'weekly_order_complete',unread:true},
 {key:'companion-1',kind:'companion_attention',unread:true},
 {key:'profile-1',kind:'profile_customization',unread:true},
 {key:'forge-1',kind:'equipment_craft_ready',count:3,unread:true},
 {key:'read-1',kind:'friend_request',count:20,unread:false},
];
const primary=buildNavigationBadges(notifications);
equal(primary.account.count,16,'Account counts aggregate and duplicate keys are ignored');
ok(primary.account.dot,'Count badges also mark the route as needing attention');
equal(primary.skills.count,3,'Finished equipment craft count reaches Skills');
ok(primary.skills.dot,'Finished equipment craft count marks Skills for attention');
ok(primary.world.dot,'Dot-only notifications reach World');
equal(primary.world.count,0,'Dot-only notifications do not increment counts');
const sub=buildSubrouteBadges(notifications);
equal(sub['social.friends.requests'].count,2,'Friend request count');
equal(sub['social.chat'].count,5,'Guild/Party chat unread count');
equal(mergeRouteBadges(sub,['social.guild.invites','social.guild.applications']).count,4,'Related subroutes merge');
equal(destinationForNotification('event_reward_ready').subroute,'events.rewards','Destination remains canonical');
equal(destinationForNotification('companion_attention').subroute,'companions','Companion attention routes to the Companion hub');
equal(destinationForNotification('equipment_craft_ready').subroute,'skills.smithing.forge','Finished equipment routes to the Smithing forge');
ok(sub['companions'].dot,'Companion subroute receives one consolidated dot');
ok(sub['profile.customize'].dot,'Profile customization attention routes to Customize Profile as a dot');
const quick=buildQuickNavigationBadges(notifications);
ok(quick['Quests']?.dot,'Weekly Contract Board attention should route to Quests in quick navigation');
equal(quick['Events']?.count,4,'Event reward count should route directly to Events in quick navigation');
equal(quick['Guild']?.count,4,'Guild invite and application attention should merge on the Guild shortcut');
equal(quick['Friends']?.count,2,'Friend requests should route directly to Friends in quick navigation');
equal(quick['Skills']?.count,3,'Finished Forge jobs should route directly to Skills in quick navigation');
ok(quick['Companions']?.dot,'Companion attention should route directly to Companions in quick navigation');
equal(badgeDisplay(100),'99+','Large counts are capped for display');
const claimable=actionableClaimNotifications({storyRewards:3,eventClaims:2,overflowStacks:1});
equal(claimable.filter(row=>row.unread).length,3,'Only three genuinely actionable claim categories');
equal(buildQuickNavigationBadges(claimable)['Quests']?.count,3,'Completed story reward count reaches Quests shortcut');
equal(buildQuickNavigationBadges(claimable)['Events']?.count,2,'Earned active event rewards reach Events shortcut');
ok(buildQuickNavigationBadges(claimable)['Inventory']?.dot,'Inventory overflow is actionable as a dot, not a noisy stack count');
equal(buildNavigationBadges(claimable).world.count,3,'World primary navigation includes unclaimed story rewards');
equal(buildNavigationBadges(claimable).account.count,2,'Account primary navigation includes event rewards');
ok(buildNavigationBadges(claimable).inventory.dot,'Inventory primary navigation marks outstanding overflow');
ok(!buildNavigationBadges(claimable).character.dot,'Earned quest rewards do not falsely flag Character');
const cleared=actionableClaimNotifications({storyRewards:0,eventClaims:0,overflowStacks:0});
ok(!Object.values(buildQuickNavigationBadges(cleared)).some(badge=>badge.dot),'Badges vanish immediately after confirmed claims/overflow cleanup');
const corrupted=actionableClaimNotifications({storyRewards:Number.NaN,eventClaims:-3,overflowStacks:Number.POSITIVE_INFINITY});
ok(!Object.values(buildQuickNavigationBadges(corrupted)).some(badge=>badge.dot),'Corrupt counters never generate fake or permanent alerts');
const duped=buildQuickNavigationBadges([...claimable,...claimable]);
equal(duped['Quests']?.count,3,'Stable claim IDs deduplicate repeat game-state reads');
equal(destinationForNotification('inventory_overflow').subroute,'inventory.overflow','Overflow badge points to actual inventory storage management');
equal(destinationForNotification('story_reward_ready').subroute,'world.story-journal','Story reward route is distinct from weekly contracts');
console.log('PASS v51 navigation notification hierarchy');
