import {actionableClaimNotifications,badgeDisplay,buildNavigationBadges,buildQuickNavigationBadges,buildSubrouteBadges,destinationForNotification,mergeRouteBadges,type NavigationNotification} from '../src/core/navigation-notifications';
import {claimableGuildProjectRewardIds} from '../src/core/guild-project-reward-attention';
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
equal(primary.account.count,12,'Account count excludes legacy Event reward alerts and deduplicates keys');
ok(primary.account.dot,'Count badges also mark the route as needing attention');
equal(primary.home.count,3,'Finished equipment craft count reaches Home');
ok(primary.home.dot,'Finished equipment craft count marks Home for attention');
equal(primary.skills.count,0,'Forge readiness no longer inflates Skills navigation');
ok(primary.world.dot,'Dot-only notifications reach World');
equal(primary.world.count,0,'Dot-only notifications do not increment counts');
const sub=buildSubrouteBadges(notifications);
equal(sub['social.friends.requests'].count,2,'Friend request count');
equal(sub['social.chat'].count,5,'Guild/Party chat unread count');
equal(mergeRouteBadges(sub,['social.guild.invites','social.guild.applications']).count,4,'Related subroutes merge');
ok(!sub['events.rewards'],'Event rewards never create a navigation subroute badge');
equal(destinationForNotification('companion_attention').subroute,'companions','Companion attention routes to the Companion hub');
equal(destinationForNotification('equipment_craft_ready').subroute,'home.forge','Finished equipment directs the player to the Home Forge shortcut');
ok(sub['companions'].dot,'Companion subroute receives one consolidated dot');
ok(sub['account.new-unlocks'].dot,'Profile customization attention routes to the consolidated Account new-unlocks inbox as a dot');
const rewardAlert:NavigationNotification={key:'party-contract-claims',kind:'party_contract_reward_ready',count:2,unread:true};
const withPartyRewards=[...notifications,rewardAlert];
equal(destinationForNotification('party_contract_reward_ready').subroute,'social.party.contracts','Ready Party rewards deep-link to Party Contracts');
equal(buildNavigationBadges(withPartyRewards).account.count,14,'Claim-ready Party rewards increment Account navigation count');
equal(buildQuickNavigationBadges(withPartyRewards)['Party']?.count,8,'Ready Party rewards add to Party shortcut alongside invites and unread chat');
equal(buildSubrouteBadges(withPartyRewards)['social.party.contracts']?.count,2,'Party Contracts subroute shows exact ready reward count');
equal(buildQuickNavigationBadges([...notifications,{...rewardAlert,unread:false}])['Party']?.count,6,'Claim badges clear as soon as authoritative rewards are claimed');
const guildProjectAlert:NavigationNotification={key:'guild-project-claims',kind:'guild_project_reward_ready',count:2,unread:true};
equal(destinationForNotification('guild_project_reward_ready').subroute,'social.guild.projects','Guild rewards point directly to the Projects claim board');
equal(buildNavigationBadges([...notifications,guildProjectAlert]).account.count,14,'Claim-ready Guild rewards increment Account notification count');
equal(buildQuickNavigationBadges([...notifications,guildProjectAlert])['Guild']?.count,6,'Guild shortcut includes project reward claims');
equal(buildSubrouteBadges([...notifications,guildProjectAlert])['social.guild.projects']?.count,2,'Projects claim board receives claimable count');
equal(buildNavigationBadges([...notifications,{...guildProjectAlert,unread:false}]).account.count,12,'Claimed project reward badge clears');

const nowMs=Date.parse('2026-11-15T12:00:00Z');
const ready={id:'ready',launchWeekly:true,status:'completed' as const,completionRewardClaimed:false,
 personalPoints:300,personalRewardThreshold:250,endsAt:'2026-11-10T12:00:00Z'};
equal(claimableGuildProjectRewardIds([ready],nowMs).length,1,'Eligible completed weekly Guild Project alerts');
equal(claimableGuildProjectRewardIds([{...ready,completionRewardClaimed:true}],nowMs).length,0,'Already-claimed Guild Project clears');
equal(claimableGuildProjectRewardIds([{...ready,personalPoints:100}],nowMs).length,0,'Unqualified members do not see claims');
equal(claimableGuildProjectRewardIds([{...ready,status:'active'}],nowMs).length,0,'Unfinished Guild Projects do not alert');
equal(claimableGuildProjectRewardIds([{...ready,launchWeekly:false}],nowMs).length,0,'Only eligible weekly completion rewards notify');
equal(claimableGuildProjectRewardIds([{...ready,endsAt:'2026-11-08T12:00:00Z'}],nowMs).length,0,'Expired project claims never linger');
equal(claimableGuildProjectRewardIds([{...ready,endsAt:'invalid'}],nowMs).length,0,'Invalid claim windows do not alert');
equal(claimableGuildProjectRewardIds([ready,ready],nowMs).length,1,'Duplicate rows never double-count rewards');
const quick=buildQuickNavigationBadges(notifications);
ok(quick['Quests']?.dot,'Weekly Contract Board attention should route to Quests in quick navigation');
ok(!quick['Events'],'Legacy Event rewards do not create top-bar shortcut attention');
ok(!primary.account.display?.includes('16'),'Event reward counts cannot inflate the primary Account badge');
equal(quick['Guild']?.count,4,'Guild invite and application attention should merge on the Guild shortcut');
equal(quick['Friends']?.count,2,'Friend requests should route directly to Friends in quick navigation');
equal(quick['Home']?.count,3,'Finished Forge jobs should alert Home in quick navigation');
ok(!quick['Skills']?.dot,'Finished Forge jobs should not alert the Skills shortcut');
equal(buildSubrouteBadges(notifications)['home.forge']?.count,3,'Home Forge shortcut receives the claimable count');
equal(buildNavigationBadges([...notifications,{key:'forge-1',kind:'equipment_craft_ready',count:3,unread:true}]).home.count,3,'Forge readiness is not double counted');
equal(buildNavigationBadges(notifications.map(row=>row.kind==='equipment_craft_ready'?{...row,unread:false}:row)).home.count,0,'Home Forge badge clears after all jobs are claimed');
ok(quick['Companions']?.dot,'Companion attention should route directly to Companions in quick navigation');
equal(badgeDisplay(100),'99+','Large counts are capped for display');
const claimable=actionableClaimNotifications({storyRewards:3,overflowStacks:1});
equal(claimable.filter(row=>row.unread).length,2,'Only story and overflow claims create navigation notifications');
ok(buildQuickNavigationBadges(claimable)['Quests']?.dot,'Completed story rewards mark the Quests shortcut without a noisy count');
ok(!buildQuickNavigationBadges(claimable)['Events'],'Event rewards do not notify the Events shortcut');
ok(buildQuickNavigationBadges(claimable)['Inventory']?.dot,'Inventory overflow is actionable as a dot, not a noisy stack count');
ok(!buildNavigationBadges(claimable).world.dot,'Quest claims do not create a false World badge');
ok(buildNavigationBadges(claimable).account.dot,'Unclaimed story rewards mark Account with a red dot');
equal(buildNavigationBadges(claimable).account.count,0,'Quest attention uses a dot rather than a numeric Account badge');
ok(buildNavigationBadges(claimable).inventory.dot,'Inventory primary navigation marks outstanding overflow');
ok(!buildNavigationBadges(claimable).character.dot,'Earned quest rewards do not falsely flag Character');
const cleared=actionableClaimNotifications({storyRewards:0,overflowStacks:0});
ok(!Object.values(buildQuickNavigationBadges(cleared)).some(badge=>badge.dot),'Badges vanish immediately after confirmed claims/overflow cleanup');
const corrupted=actionableClaimNotifications({storyRewards:Number.NaN,overflowStacks:Number.POSITIVE_INFINITY});
ok(!Object.values(buildQuickNavigationBadges(corrupted)).some(badge=>badge.dot),'Corrupt counters never generate fake or permanent alerts');
const duped=buildQuickNavigationBadges([...claimable,...claimable]);
ok(duped['Quests']?.dot,'Stable claim IDs retain a single Quests attention dot');
equal(destinationForNotification('inventory_overflow').subroute,'inventory.overflow','Overflow badge points to actual inventory storage management');
equal(destinationForNotification('story_reward_ready').subroute,'account.quests.story','Story rewards route to Account quests, not weekly contracts');
const classAndMilestones=actionableClaimNotifications({storyRewards:0,challengeRewards:2,milestoneRewards:1,overflowStacks:0});
ok(buildNavigationBadges(classAndMilestones).account.dot,'Finished unclaimed Class Challenges and milestones mark Account');
ok(buildQuickNavigationBadges(classAndMilestones)['Quests']?.dot,'Class Challenge rewards mark the Quests shortcut');
ok(buildSubrouteBadges(classAndMilestones)['account.quests.challenges'].dot,'Class Challenge attention has a dedicated quest subroute');
ok(buildSubrouteBadges(classAndMilestones)['account.quests.milestones'].dot,'Claimable milestones have dedicated quest attention');
ok(!buildNavigationBadges(actionableClaimNotifications({storyRewards:0,challengeRewards:0,milestoneRewards:0,overflowStacks:0})).account.dot,'Account quest dot clears when no quest claims remain');
console.log('PASS v51 navigation notification hierarchy');
