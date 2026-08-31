import { claimActivity, createCharacter, newGame, OFFLINE_CAP_SECONDS, previewActivityReward, startCombat } from '../src/core/game';
import { totalXpAtLevel } from '../src/core/progression';

function ok(condition:boolean,message:string){ if(!condition) throw new Error(message); }
const t0=1_000_000;
let s=createCharacter(newGame(t0),'WAYFINDER','Tester');
s=startCombat(s,'MOSS_RAT',t0);
let p=previewActivityReward(s,t0+60_000);
ok(p.kills>=5,'Should kill several Moss Rats in 60 sec');
let c=claimActivity(s,t0+60_000); s=c.state;
ok(s.character!.xp>0 && s.character!.gold>100,'Claim should award XP and gold');
const capped=previewActivityReward(s,t0+60_000+(OFFLINE_CAP_SECONDS+3600)*1000);
ok(capped.elapsedSeconds===OFFLINE_CAP_SECONDS,'Offline progress must cap at 8 hours');
let level25Xp=totalXpAtLevel(25); ok(level25Xp>0,'Level curve should support level 25');
const a=previewActivityReward(s,t0+120_000); const b=previewActivityReward(s,t0+120_000);
ok(JSON.stringify(a)===JSON.stringify(b),'Offline rewards must be deterministic for same state/time');
console.log(JSON.stringify({status:'PASS',firstMinute:c.reward,offlineCapHours:OFFLINE_CAP_SECONDS/3600,level25Xp},null,2));
