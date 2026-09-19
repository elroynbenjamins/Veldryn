import { strict as assert } from 'node:assert';
import {completionPercentV21,formatRegionTimerV21,nextRegionalGoalV21} from '../src/core/region-content-v21';
const p={storyCompleted:10,storyTotal:10,sideQuestsCompleted:4,sideQuestsTotal:8,echoesCompleted:2,echoesTotal:4,dungeonsCompleted:1,dungeonsTotal:3,collectionEntries:8,collectionTotal:16,bossMasteryTier:1,bossMasteryMax:4};
assert.equal(completionPercentV21(p),51);assert.equal(formatRegionTimerV21(3900),'1h 5m');assert.equal(nextRegionalGoalV21(p),'Complete regional side quests');console.log('v21 mobile helpers passed');
