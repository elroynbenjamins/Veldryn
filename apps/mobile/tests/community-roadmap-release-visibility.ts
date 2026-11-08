import {communityRoadmapFeatureVisible} from '../src/core/community-roadmap-release-visibility';
function check(value:unknown,why:string){if(!value)throw new Error(why);}
check(communityRoadmapFeatureVisible('party_events'),'Existing roadmap choices stay visible');
check(communityRoadmapFeatureVisible('player_market'),'Player Market proposal is votable before trading launches');
check(communityRoadmapFeatureVisible('tier_5_plus_equipment'),'Other future proposals remain visible');
console.log('PASS: roadmap includes proposed features without enabling gameplay');
