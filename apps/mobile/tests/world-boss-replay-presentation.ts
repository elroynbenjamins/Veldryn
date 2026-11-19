import {assert} from './test-assert';
import {WORLD_BOSS_REPLAY_POLICY,worldBossReplayCues,type WorldBossReplayInput} from '../src/core/world-boss-replay-presentation';

const policy=WORLD_BOSS_REPLAY_POLICY;
assert.equal(policy.skippable,false);assert.equal(policy.speedControls,false);
assert.equal(policy.showsDuration,false);assert.equal(policy.showsRoundCount,false);
assert.equal(policy.resultsAfterFinale,true);

const party=[{characterId:'c1',name:'Aldric',classId:'IRONWARDEN'},{characterId:'c2',name:'Mira',classId:'DAWNKEEPER'}];
const base:WorldBossReplayInput={bossId:'hollowroot',phase:'exposed',party,tonicItemId:'OATH_VIGOR_TONIC',
 world:{maxHp:1000,hpBefore:720,creditedHp:40},reduceMotion:false,events:[
 {round:1,type:'strike',abilityId:'RUNE_STRIKE',actorId:'c1',targetId:'HOLLOWROOT',amount:30,detail:'crit'},
 {round:2,type:'telegraph',abilityId:'ROOT_SLAM',actorId:'HOLLOWROOT',detail:'c1,c2'},
 {round:3,type:'strike',abilityId:'ROOT_SLAM',actorId:'HOLLOWROOT',targetId:'c1',amount:80,absorbed:20},
 {round:3,type:'strike',abilityId:'ROOT_SLAM',actorId:'HOLLOWROOT',targetId:'c2',amount:60},
 {round:3,type:'mitigate',abilityId:'WAR_CAMP_FORTIFICATIONS',actorId:'WAR_CAMP',targetId:'c2',amount:5},
 {round:3,type:'mitigate',abilityId:'TONIC_WARD',actorId:'c2',targetId:'c2',amount:4},
 {round:7,type:'heal',abilityId:'DAWN_MEND',actorId:'c2',targetId:'c1',amount:50},
 {round:9,type:'guard_break',abilityId:'RUNE_STRIKE',actorId:'c1',targetId:'HOLLOWROOT',amount:200},
 {round:12,type:'mystery_future_type',abilityId:'X'},
 {round:13,type:'strike',abilityId:'RUNE_STRIKE',actorId:'c1',targetId:'HOLLOWROOT',amount:25},
 {round:14,type:'battle_end',abilityId:'END',detail:'survived'},
]};
const cues=worldBossReplayCues(base),beats=cues.map(c=>c.beat);
assert.deepEqual(beats.map(b=>b.kind),['entrance','tonic','party_action','telegraph','boss_attack','party_action','party_action','party_action','boss_state','party_action','finale','results']);
const entrance=beats[0];
assert.ok(entrance.kind==='entrance'&&entrance.bossName==='Hollowroot'&&Math.abs(entrance.worldHpFraction-.72)<1e-9);
const slam=beats.find(b=>b.kind==='boss_attack');
assert.ok(slam&&slam.kind==='boss_attack'&&slam.special&&slam.hits.length===2&&slam.scale==='arena',
 'A telegraphed multi-target special lands as one arena-wide impact');
assert.equal(slam&&slam.kind==='boss_attack'?slam.hits.map(h=>h.targetName).join(','):'','Aldric,Mira');
const sources=beats.filter(b=>b.kind==='party_action').map(b=>b.kind==='party_action'?b.source+':'+b.actorName:'');
assert.deepEqual(sources,['party:Aldric','war_camp:','tonic:','party:Mira','party:Aldric'],'Shared buffs never show raw protocol IDs');
// Acts escalate by position without a round number in the model.
assert.deepEqual(beats.filter(b=>'act' in b).map(b=>(b as {act:string}).act),
 ['opening','opening','opening','opening','opening','onslaught','onslaught','climax'],
 'Acts escalate by position: opening, onslaught, climax');
const finale=beats.find(b=>b.kind==='finale');
assert.ok(finale&&finale.kind==='finale'&&finale.worldHpAfter===680&&finale.thresholdsCrossed.join()==='0.7'&&!finale.killingBlow,
 'Crossing 70% is a server-wide moment');
assert.equal(beats[beats.length-1].kind,'results','Results come only after the finale');
// Nothing reveals length: no round numbers, timers or totals anywhere in the beat model.
const json=JSON.stringify(beats);
for(const forbidden of ['"round"','duration','"total','roundsCompleted','elapsed'])
 assert.ok(!json.includes(forbidden),'Replay beats must not expose '+forbidden);
// Reduced motion keeps every beat (no skipping) but removes shake and flash.
const calm=worldBossReplayCues({...base,reduceMotion:true});
assert.equal(calm.length,cues.length);assert.ok(calm.every(c=>!c.shake&&!c.flash));
assert.ok(cues.some(c=>c.shake),'Full motion uses impact shake for specials');
// Killing blow and post-defeat Residual Echo.
const kill=worldBossReplayCues({...base,tonicItemId:null,world:{maxHp:1000,hpBefore:30,creditedHp:500}}).map(c=>c.beat);
const killFinale=kill.find(b=>b.kind==='finale');
assert.ok(!kill.some(b=>b.kind==='tonic'),'No tonic beat without a tonic');
assert.ok(killFinale&&killFinale.kind==='finale'&&killFinale.killingBlow&&killFinale.creditedHp===30&&killFinale.thresholdsCrossed.join()==='0');
const echo=worldBossReplayCues({...base,world:{maxHp:1000,hpBefore:0,creditedHp:0}}).map(c=>c.beat).find(b=>b.kind==='finale');
assert.ok(echo&&echo.kind==='finale'&&echo.residualEcho&&!echo.killingBlow);
let threw=false;try{worldBossReplayCues({...base,bossId:'fake'});}catch{threw=true;}
assert.ok(threw,'Unknown bosses are never presented');
// Role moments: real answers to the boss become standout beats.
const roles=worldBossReplayCues({...base,events:[
 {round:2,type:'telegraph',abilityId:'ROOT_SLAM',actorId:'HOLLOWROOT',detail:'c2'},
 {round:3,type:'mitigate',abilityId:'TANK_INTERCEPT',actorId:'c1',targetId:'c2',amount:33,detail:'telegraphed_ward'},
 {round:3,type:'mitigate',abilityId:'TANK_INTERCEPT',actorId:'c1',targetId:'c2',amount:4,detail:'ordinary_intercept'},
 {round:5,type:'cleanse',abilityId:'PURIFY',actorId:'c2',targetId:'c1',detail:'burn'},
 {round:6,type:'interrupt',abilityId:'RUNE_BASH',actorId:'c1',targetId:'HOLLOWROOT',detail:'REGROWTH'},
 {round:7,type:'interrupt',abilityId:'REGROWTH',actorId:'HOLLOWROOT',detail:'cancelled_special'},
],ledger:[
 {characterId:'c1',bossHpDamage:900,effectiveHealing:0,shieldConsumed:0,tankProtection:37,cleansePrevented:0,interrupts:1,survived:true},
 {characterId:'c2',bossHpDamage:900,effectiveHealing:120,shieldConsumed:30,tankProtection:0,cleansePrevented:24,interrupts:0,survived:true},
 {characterId:'ghost',bossHpDamage:99999,effectiveHealing:0,shieldConsumed:0,tankProtection:0,cleansePrevented:0,interrupts:0,survived:true},
]}).map(c=>c.beat);
const moments=roles.filter(b=>b.kind==='role_moment').map(b=>b.kind==='role_moment'?b.moment+':'+b.actorName+':'+(b.targetName??''):'');
assert.deepEqual(moments,['guarded:Aldric:Mira','cleansed:Mira:Aldric','interrupted:Aldric:'],'Guard, cleanse and interrupt are role moments');
assert.ok(roles.some(b=>b.kind==='party_action'&&b.action==='mitigate'&&b.amount===4),'Ordinary intercepts stay ordinary actions');
assert.ok(roles.some(b=>b.kind==='boss_state'&&b.state==='special_cancelled'),'A cancelled special is shown');
const honors=roles[roles.length-1];
assert.ok(honors.kind==='results');
assert.deepEqual(honors.kind==='results'?honors.honors.map(h=>h.honor+':'+h.name+':'+h.value):[],
 ['vanguard:Aldric:900','bulwark:Aldric:37','lifebinder:Mira:150','spellbreaker:Aldric:1','purifier:Mira:24'],
 'Honors go to the top real contributor; ties go to roster order; non-party rows are ignored');
console.log('PASS: World Boss replay is an unskippable, untimed set-piece with real-event beats, acts, tonic and world finale');
