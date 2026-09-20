import {claimActivity,createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {huntGoalProgress} from '../src/core/hunt-goals';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let caught=false;try{fn()}catch{caught=true}ok(caught,message)}
const now=1_000_000;

let fifty=createCharacter(newGame(now),'WAYFINDER','Goal Tester');
fifty=startCombat(fifty,'MOSS_RAT',now,undefined,'balanced','kills_50');
const fiftyPreview=previewActivityReward(fifty,now+4*60*60*1000);
ok(fiftyPreview.kills===50,'50-kill goal should clamp the preview to exactly 50 kills');
ok(fiftyPreview.stoppedReason?.includes('Hunt goal reached'),'Kill goal should expose a stop reason');
const fiftyClaim=claimActivity(fifty,now+4*60*60*1000);
ok(!fiftyClaim.state.activity,'Claiming a completed hunt goal should stop the hunt');

let hundred=createCharacter(newGame(now),'WAYFINDER','Persistent Goal Tester');
hundred=startCombat(hundred,'MOSS_RAT',now,undefined,'balanced','kills_100');
const partial=claimActivity(hundred,now+5*60*1000);
ok(!!partial.state.activity&&partial.reward.kills>0&&partial.reward.kills<100,'Early claim should keep a 100-kill session active');
ok(partial.state.activity!.sessionKills===partial.reward.kills,'Manual claim must persist session kill progress');
const projected=huntGoalProgress(partial.state.activity!,0,0,now+5*60*1000);
ok(projected?.current===partial.reward.kills,'Hunt goal UI should reflect persisted claimed kills');
const finished=claimActivity(partial.state,now+4*60*60*1000);
ok(!finished.state.activity,'Later settlement should stop when the cumulative session reaches 100 kills');
ok(partial.reward.kills+finished.reward.kills===100,'Manual claims must not reset or overrun a session kill goal');

let champion=createCharacter(newGame(now),'WAYFINDER','Champion Goal Tester');
champion=startCombat(champion,'MOSS_RAT',now,undefined,'guarded','champion_1');
const championPreview=previewActivityReward(champion,now+24*60*60*1000);
ok(championPreview.championEncounters?.count===1,'Champion hunt goal should stop at the first defeated Champion');
ok(championPreview.stoppedReason?.includes('1 Champion'),'Champion goal stop reason should name the target');

const commandState=executeGameCommand(createCharacter(newGame(now),'WAYFINDER','Command Goal Tester'),{type:'start',args:{kind:'combat',id:'MOSS_RAT',goalId:'duration_30m'}},now).state;
ok(commandState.activity?.huntGoal?.kind==='duration_seconds','Trusted start command should snapshot the selected hunt goal');
rejects(()=>validateGameCommand({type:'start',args:{kind:'combat',id:'MOSS_RAT',goalId:'kills_999'}}),'Unknown hunt goal presets must be rejected');
rejects(()=>validateGameCommand({type:'start',args:{kind:'gathering',id:'anything',goalId:'kills_50'}}),'Hunt goals must be combat-only');
console.log(JSON.stringify({status:'PASS',partialKills:partial.reward.kills,championStop:championPreview.championEncounters?.count}));
