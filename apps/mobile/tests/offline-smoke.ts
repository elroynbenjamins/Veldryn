import { activeCombatRuntimeProjection, claimActivity, createCharacter, newGame, OFFLINE_CAP_SECONDS, previewActivityReward, startCombat } from '../src/core/game';
import { totalXpAtLevel } from '../src/core/progression';

function ok(condition:boolean,message:string){ if(!condition) throw new Error(message); }
const t0=1_000_000;
let s=createCharacter(newGame(t0),'WAYFINDER','Tester');
s=startCombat(s,'MOSS_RAT',t0);
const runtime=activeCombatRuntimeProjection(s);ok(!!runtime&&runtime.killCycleSeconds>0,'Active combat must expose its authoritative kill cycle');
const halfCycleMs=Math.max(1,Math.floor(runtime!.killCycleSeconds*500));
const partial=claimActivity(s,t0+halfCycleMs);
ok(partial.reward.kills===0,'A sub-cycle combat claim must not invent a kill');
ok((partial.state.activity?.progressFraction??0)>0,'A sub-cycle combat claim must preserve partial hunt progress');
const finishAt=t0+Math.ceil(runtime!.killCycleSeconds*1000)+50;
const completed=claimActivity(partial.state,finishAt);
ok(completed.reward.kills>=1,'Preserved partial hunt progress must complete on the following claim');
s=startCombat(createCharacter(newGame(t0),'WAYFINDER','Tester'),'MOSS_RAT',t0);
let p=previewActivityReward(s,t0+60_000);
ok(p.kills>=3,'Should kill multiple Moss Rats in 60 sec');
let c=claimActivity(s,t0+60_000); s=c.state;
ok(s.character!.xp>0 && s.character!.gold>100,'Claim should award XP and gold');
const capped=previewActivityReward(s,t0+60_000+(OFFLINE_CAP_SECONDS+3600)*1000);
ok(capped.elapsedSeconds===OFFLINE_CAP_SECONDS,'Offline progress must cap at the 24-hour base reserve');
let level25Xp=totalXpAtLevel(25); ok(level25Xp>0,'Level curve should support level 25');
const a=previewActivityReward(s,t0+120_000); const b=previewActivityReward(s,t0+120_000);
ok(JSON.stringify(a)===JSON.stringify(b),'Offline rewards must be deterministic for same state/time');
console.log(JSON.stringify({status:'PASS',firstMinute:c.reward,offlineCapHours:OFFLINE_CAP_SECONDS/3600,level25Xp},null,2));
