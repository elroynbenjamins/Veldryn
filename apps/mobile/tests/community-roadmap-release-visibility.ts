import {communityRoadmapFeatureVisible} from '../src/core/community-roadmap-release-visibility';
function check(value:unknown,why:string){if(!value)throw new Error(why);}
check(communityRoadmapFeatureVisible('party_events'),'Existing roadmap choices stay visible');
check(!communityRoadmapFeatureVisible('player_market'),'Unfinished market stays hidden');
console.log('PASS: roadmap hides unreleased market');
