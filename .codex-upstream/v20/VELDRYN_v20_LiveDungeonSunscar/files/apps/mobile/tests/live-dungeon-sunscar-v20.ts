import { strict as assert } from 'node:assert';
import {formatWait,readyCount,routeVoteLeader,setBonusSummary} from '../src/core/live-dungeon-sunscar-v20';
assert.equal(formatWait(125),'2m 05s');
assert.equal(readyCount({contentName:'x',expiresInSeconds:10,members:[{accountId:'1',displayName:'a',role:'tank',ready:true,you:true},{accountId:'2',displayName:'b',role:'damage',ready:false,you:false}]}),1);
assert.equal(routeVoteLeader([{id:'a',name:'A',type:'x',risk:'Low',rewardHint:'x',votes:2,selectedByYou:false},{id:'b',name:'B',type:'x',risk:'Low',rewardHint:'x',votes:1,selectedByYou:false}]),'a');
assert.equal(setBonusSummary({setName:'x',equippedPieces:3,thresholds:[{pieces:2,label:'a',active:true},{pieces:3,label:'b',active:true},{pieces:5,label:'c',active:false}]}),'2pc + 3pc');
console.log('v20 mobile helpers passed');
