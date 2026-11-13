import { activeCombatRuntimeProjection, claimActivity, createCharacter, newGame, OFFLINE_CAP_SECONDS, previewActivityReward, startCombat } from '../src/core/game';
import { totalXpAtLevel } from '../src/core/progression';

function ok(condition:boolean,message:string){ if(!condition) throw new Error(message); }
const t0=1_000_000;
let s=createCharacter(newGame(t0),'WAYFINDER','Tester');
s=startCombat(s,'MOSS_RAT',t0);
const runtime=activeCombatRuntimeProjection(s);ok(!!runtime&&runtime.killCycleSeconds>0,'Active combat must expose its authoritative kill cycle');
// The HUD cycle is an average over seeded encounters, not a guarantee for
// this exact first Moss Rat. Find its deterministic completion boundary so the
// carry-over test remains valid when encounter search/attack timings change.
let firstKillUpperMs=Math.max(1000,Math.ceil(runtime!.killCycleSeconds*1000));
while(previewActivityReward(s,t0+firstKillUpperMs).kills===0&&firstKillUpperMs<300_000)firstKillUpperMs*=2;
ok(previewActivityReward(s,t0+firstKillUpperMs).kills>=1,'A fresh Moss Rat hunt must eventually complete a kill');
let low=0,high=firstKillUpperMs;
while(high-low>1){
 const midpoint=Math.floor((low+high)/2);
 if(previewActivityReward(s,t0+midpoint).kills>=1)high=midpoint;
 else low=midpoint;
}
const halfCycleMs=Math.max(1,Math.floor(high/2));
const partial=claimActivity(s,t0+halfCycleMs);
ok(partial.reward.kills===0,'A sub-cycle combat claim must not invent a kill');
ok((partial.state.activity?.progressFraction??0)>0,'A sub-cycle combat claim must preserve partial hunt progress');
// The second span is shorter than a full fresh encounter, but the preserved
// first-half progress must push it past this particular encounter's boundary.
const followUpMs=high-halfCycleMs+1;
const completed=claimActivity(partial.state,partial.state.activity!.lastClaimAtMs+followUpMs);
ok(completed.reward.kills>=1,'Preserved partial hunt progress must complete on the following claim');
const withoutCarry=claimActivity(s,t0+followUpMs);
ok(withoutCarry.reward.kills===0,'The same follow-up span must not finish a kill without the preserved progress');
s=startCombat(createCharacter(newGame(t0),'WAYFINDER','Tester'),'MOSS_RAT',t0);
let p=previewActivityReward(s,t0+60_000);
ok(p.kills>=3,'Should kill multiple Moss Rats in 60 sec');
let c=claimActivity(s,t0+60_000); s=c.state;
ok(s.character!.xp>0 && s.character!.gold>100,'Claim should award XP and gold');
const capped=previewActivityReward(s,t0+60_000+(OFFLINE_CAP_SECONDS+3600)*1000);
ok(capped.elapsedSeconds===OFFLINE_CAP_SECONDS,'Offline progress must cap at the 8-hour base reserve');
let level25Xp=totalXpAtLevel(25); ok(level25Xp>0,'Level curve should support level 25');
const a=previewActivityReward(s,t0+120_000); const b=previewActivityReward(s,t0+120_000);
ok(JSON.stringify(a)===JSON.stringify(b),'Offline rewards must be deterministic for same state/time');
console.log(JSON.stringify({status:'PASS',firstMinute:c.reward,offlineCapHours:OFFLINE_CAP_SECONDS/3600,level25Xp},null,2));
