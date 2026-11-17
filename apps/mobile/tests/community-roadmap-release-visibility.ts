import {communityRoadmapFeatureVisible} from '../src/core/community-roadmap-release-visibility';
function check(value:unknown,why:string){if(!value)throw new Error(why);}
check(communityRoadmapFeatureVisible('party_events'),'Existing roadmap choices stay visible');
check(communityRoadmapFeatureVisible('player_market'),'Player Market proposal is votable before trading launches');
check(communityRoadmapFeatureVisible('tier_5_plus_equipment'),'Other future proposals remain visible');
export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const screen=fs.readFileSync('src/screens/CommunityRoadmapScreen.tsx','utf8');
check(screen.includes("{selected==='considering'?<View style={s.voteBudget}>"),'Vote allowance counter should only appear on the Vote tab');
check(screen.includes("{canVote?<Text style={s.meta}>{feature.votes}"),'Individual vote totals must only appear on votable roadmap ideas');
check(screen.includes('{canVote||feature.release_version?<View style={s.featureFooter}>'),'Non-votable roadmap entries must not show an empty vote footer');
check(screen.includes("{snapshot&&selected==='considering'?<Text style={s.footnote}>"),'Voting instructions should only appear on the Vote tab');
check(screen.includes("{id:'considering',label:'Voting'}"),'The Voting tab must remain present');
check(!screen.includes("{id:'planned'"),'The legacy Planned tab must not be shown');
check(screen.includes("{id:'in_progress',label:'In Development'}"),'In Development status remains visible');
check(screen.includes("{id:'released',label:'Released'}"),'Released status remains visible');
for(const released of ['released_dungeons','released_seasonal_events','released_companions','released_guilds']){
 check(screen.includes(released+":"),'Every released system has an appropriate pixel icon');
}
check(!screen.includes('When an idea moves to Planned'),'Obsolete planned-vote refund explanation must be removed');
console.log('PASS: three roadmap tabs, released icons, voting limits and vote refund explanation');
