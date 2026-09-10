import {createCharacter,newGame,startGathering} from '../src/core/game';
import {settleStartupActivity} from '../src/core/playability';

function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

const started=startGathering(createCharacter(newGame(0),'IRONWARDEN','Return Tester'),'GREENWOOD_TREE',0);
const partial=settleStartupActivity(started,1_000);
ok(partial.reward===null&&partial.state===started,'A zero-action startup must preserve the partial cycle');

const resumed=settleStartupActivity(started,60_000);
ok(resumed.reward!==null,'Completed offline actions should create a startup summary');
ok(resumed.reward!.kills>0&&resumed.reward!.xp>0&&resumed.reward!.items.length>0,'Startup summary should include actions, XP, and resources');
ok(resumed.activity?.kind==='woodcutting'&&resumed.activity.targetId==='GREENWOOD_TREE','Startup summary should retain the completed skill and target');
ok(resumed.state.activity?.lastClaimAtMs===60_000,'Startup rewards should settle exactly once');
console.log('Startup activity summary tests passed.');
