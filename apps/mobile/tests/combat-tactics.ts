import {createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
const now=1_000_000,base=createCharacter(newGame(now),'WAYFINDER','Tactics Tester');
const balanced=startCombat(base,'MOSS_RAT',now,undefined,'balanced');
const assault=startCombat(base,'MOSS_RAT',now,undefined,'assault');
const guarded=startCombat(base,'MOSS_RAT',now,undefined,'guarded');
const at=now+15*60_000,b=previewActivityReward(balanced,at),a=previewActivityReward(assault,at),g=previewActivityReward(guarded,at);
ok(a.kills>b.kills,'Assault should produce more kills than Balanced over a long hunt');
ok(g.kills<b.kills,'Guarded should trade hunt speed for safety');
ok(assault.activity?.combatTacticId==='assault'&&guarded.activity?.combatTacticId==='guarded','Tactic choice must be snapshotted into the activity');
const restarted=executeGameCommand(base,{type:'start',args:{kind:'combat',id:'MOSS_RAT',tacticId:'guarded'}},now).state;
ok(restarted.activity?.combatTacticId==='guarded','Trusted start command must preserve selected tactic');
rejects(()=>validateGameCommand({type:'start',args:{kind:'combat',id:'MOSS_RAT',tacticId:'reckless'}}),'Unknown combat tactics must be rejected');
rejects(()=>executeGameCommand(base,{type:'start',args:{kind:'gathering',id:'GREENFIELDS_COPPER',tacticId:'assault'}},now),'Tactics must not be accepted for gathering starts');
console.log(JSON.stringify({status:'PASS',balancedKills:b.kills,assaultKills:a.kills,guardedKills:g.kills}));
