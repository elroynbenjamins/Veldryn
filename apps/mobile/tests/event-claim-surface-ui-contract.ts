export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}

const screen=fs.readFileSync('src/screens/EventScreen.tsx','utf8');
const rewards=fs.readFileSync('src/components/EventAdditionalRewards.tsx','utf8');
const weekly=fs.readFileSync('src/components/EventActivityBoard.tsx','utf8');

ok(screen.includes('<EventAdditionalRewards')&&screen.includes('claimEventDiscovery')&&screen.includes("type:'event_discovery'"),'The Rewards tab must expose folklore discovery claims.');
ok(screen.includes('claimEventRepeatCache')&&screen.includes("type:'event_cache'"),'The Rewards tab must expose counted bonus caches.');
ok(screen.includes('claimEventCommunityMilestone')&&screen.includes("type:'event_community'"),'The Rewards tab must expose eligible community claims.');
ok(screen.includes("localizeGameplay(language,'Rewards')")&&screen.includes('(${readyClaims})'),'The Event Hub must identify which tab contains ready rewards.');
ok(rewards.includes('Additional event rewards')&&rewards.includes('FOLKLORE DISCOVERIES'),'Claimable discovery rewards need a visible player-facing destination.');
ok(rewards.includes('EVENT_COMMUNITY_MIN_CONTRIBUTION')&&rewards.includes('personalContribution')&&rewards.includes('Community target {percent}% not reached yet.'),'Community reward card must explain personal contribution and shared milestone separately.');
ok(rewards.includes("earningOpen?t('Earn 1,000 more reputation")&&rewards.includes("t('No more reputation can be earned for bonus caches.')"),'Bonus cache must not promise new reputation after earning ends.');
ok(weekly.includes("event?.phase==='active'")&&weekly.includes("!earningOpen?<Text")&&weekly.includes("t('Event earning has ended. Completed weekly rewards remain claimable.')"),'Weekly activities must stop linking to earning during grace while keeping ready claims visible.');

console.log('PASS event claim surface: every additional badge category has a visible Rewards-tab claim action');
