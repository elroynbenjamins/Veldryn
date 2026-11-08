import {communityRoadmapFeatureVisible} from '../src/core/community-roadmap-release-visibility';
function check(ok:unknown,why:string){if(!ok)throw new Error(why);}
check(communityRoadmapFeatureVisible('party_events'),'Unrelated roadmap entries remain visible');
check(communityRoadmapFeatureVisible('tier_5_plus_equipment'),'Equipment roadmap remains visible');
check(!communityRoadmapFeatureVisible('player_market'),'Unfinished market must remain hidden');
console.log('PASS: player market remains excluded from the Community Roadmap');
