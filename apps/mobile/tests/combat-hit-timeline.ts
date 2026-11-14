// Regression coverage: live hit replay may animate deterministically, but only authoritative claims settle rewards.
import {assert} from './test-assert';
import {HUNT_CLASS_NARRATION,HUNT_COMMON_NARRATION,HUNT_ENCOUNTER_NARRATION,liveHuntNarration} from '../src/core/combat-narration';
import {BATTLE_MESSAGES} from '../src/i18n/battle';
import {MONSTERS} from '../src/content/monsters';
import type {ClassId} from '../src/core/types';
import {huntHitEvents,huntHitsBetween,huntEnemyHpAt} from '../src/core/combat-hit-timeline';
import {activeCombatHitProjection,activeCombatRuntimeProjection,claimActivity,createCharacter,effectiveStats,newGame,previewActivityReward,startCombat} from '../src/core/game';
import type {ActiveCombatHitCursor} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';

const events=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
const again=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
assert.equal(JSON.stringify(events),JSON.stringify(again),'hit events must replay deterministically');
assert.equal(huntEnemyHpAt(1100,events,0),1100);
assert.equal(huntEnemyHpAt(1100,events,1),0,'only attack events remove the full enemy HP');
for(const tinyHp of [1,2]){
 const tiny=huntHitEvents({monsterHp:tinyHp,basePlayerHit:100,incomingDamage:1,healingPerEncounter:0,cycleSeconds:1,critChance:0,seed:'tiny'});
 const playerHits=tiny.filter(row=>row.actor==='player');
 assert.ok(playerHits.length<=tinyHp,'a low-HP monster cannot receive extra fake attacks');
 assert.ok(playerHits.every(row=>row.damage>0),'each blow must inflict positive damage');
 assert.equal(playerHits.reduce((total,row)=>total+row.damage,0),tinyHp,'the final strike must kill the monster');
}
const atThird=huntEnemyHpAt(1100,events,.34);
assert.ok(atThird>0&&atThird<1100,'actual hits, not smooth timer progress, determine HP');
const early=huntHitsBetween(events,0,.5),late=huntHitsBetween(events,.5,1);
assert.equal(early.length+late.length,events.length,'a split settlement must consume each hit once');
assert.ok(events.some(event=>event.actor==='enemy'&&event.damage>0),'enemy attacks must have actual damage');

const T=1_600_000;
const starting=createCharacter(newGame(T),'WAYFINDER','Real Hits');
starting.character!.attack=12;starting.character!.equipment={};
const state=startCombat(starting,'MOSS_RAT',T);
const cycle=activeCombatRuntimeProjection(state)!.killCycleSeconds;
// Search is a real phase. A partial claim may legitimately precede both
// attacks, or a strong attacker can kill before the foe retaliates.
const partialAt=T+Math.max(1000,Math.floor(cycle*400));
const partial=activeCombatHitProjection(state,partialAt)!;
const preview=previewActivityReward(state,partialAt);
assert.equal(preview.kills,0,'real partial hits must not grant unearned kill rewards');
assert.ok(partial.enemyHp>0&&partial.enemyHp<=partial.enemyMaxHp,'partial encounter cannot grant a kill');
assert.ok(partial.playerHp>0&&partial.playerHp<=effectiveStats(state).hp,'partial combat health must stay within bounds');
assert.equal(preview.endHp,partial.playerHp,'preview and combat display must use identical damage');
assert.equal(preview.nextCombatEnemyHp,partial.enemyHp,'displayed enemy HP must be a settled state value');

const first=claimActivity(state,partialAt);
assert.equal(first.state.character!.currentHp,partial.playerHp,'partial hits must persist real HP');
assert.equal(first.state.activity?.combatEnemyHp,partial.enemyHp,'partial enemy HP must persist on activity');
const finishAt=T+Math.ceil(cycle*1000)+100;
const unsplit=claimActivity(state,finishAt);
const second=claimActivity(first.state,finishAt);
assert.equal(first.reward.kills+second.reward.kills,unsplit.reward.kills,'split claims must not duplicate or miss kills');
assert.ok(Math.abs(second.state.character!.currentHp-unsplit.state.character!.currentHp)<.0001,'split claims must not duplicate enemy damage');
assert.ok(Math.abs((second.state.activity?.combatEnemyHp??0)-(unsplit.state.activity?.combatEnemyHp??0))<.0001,'enemy HP must not reset or double-deduct after claim');
assert.equal(first.reward.xp+second.reward.xp,unsplit.reward.xp,'split claims must not change base XP payouts');
assert.equal(first.reward.gold+second.reward.gold,unsplit.reward.gold,'split claims must not change base gold payouts');
// Foreground replay advances incrementally. It must remain identical to a
// full authoritative read-only projection across multi-cycle claims.
const liveState=structuredClone(state);
liveState.character!.preparation={itemId:'OATH_WARD_TONIC',remainingEncounters:3};
let cursor:ActiveCombatHitCursor|undefined;
const halfSecondSteps=Math.ceil(cycle*8);
for(let tick=0;tick<=halfSecondSteps;tick++){
 const at=T+tick*500;
 const direct=activeCombatHitProjection(liveState,at)!;
 const incremental=activeCombatHitProjection(liveState,at,cursor)!;
 assert.ok(Math.abs(direct.playerHp-incremental.playerHp)<1e-5,'incremental combat must keep exact HP parity');
 assert.ok(Math.abs(direct.enemyHp-incremental.enemyHp)<1e-5,'incremental combat must keep enemy HP parity');
 assert.equal(direct.stoppedReason,incremental.stoppedReason,'incremental combat stop must remain deterministic');
 const skillSnapshot=(rows:typeof direct.lastSkillEffects)=>JSON.stringify((rows??[]).map(effect=>({name:effect.name,kind:effect.kind,source:effect.source,time:Math.round(effect.atMs),amount:Math.round((effect.amount??0)*1000)/1000})));
 assert.equal(skillSnapshot(direct.lastSkillEffects),skillSnapshot(incremental.lastSkillEffects),'incremental and full combat must record identical real skill events');
 assert.ok(Math.abs(direct.progressFraction-incremental.progressFraction)<1e-7,'incremental combat phase must stay synced');
 cursor=incremental.cursor;
}
// Only a settled, mechanically earned Ravager recovery may be highlighted.
const ravager=regionalCombatFixture(REGIONAL_COMBAT_FIXTURES[4],'prepared','RAVAGER');
ravager.activity={kind:'combat',targetId:REGIONAL_COMBAT_FIXTURES[4].monsterId,combatTacticId:'balanced',startedAtMs:T,lastClaimAtMs:T};
const recovered=activeCombatHitProjection(ravager,T+5*60_000)!;
assert.ok((recovered.lastSkillEffects??[]).some(effect=>effect.name==='Bloodrush'),'Ravager should expose its real earned recovery after a hunt');
assert.ok((recovered.lastSkillEffects??[]).some(effect=>effect.kind==='recovery'&&effect.name==='Bloodrush'));
assert.ok((recovered.lastSkillEffects??[]).filter(effect=>effect.name==='Bloodrush').every(effect=>(effect.amount??0)>0),'Displayed Bloodrush recovery must restore real HP');
assert.ok((recovered.lastSkillEffects??[]).some(effect=>effect.name==='Bloodrush'&&effect.kind==='recovery'),'Bloodrush must coexist with other class and companion cues');
assert.ok((recovered.lastSkillEffects??[]).filter(effect=>effect.name==='Bloodrush').every(effect=>effect.atMs<=T+5*60_000),'Recovery event must not occur in the future');
const wayfinder=regionalCombatFixture(REGIONAL_COMBAT_FIXTURES[4],'prepared','WAYFINDER');
wayfinder.activity={kind:'combat',targetId:REGIONAL_COMBAT_FIXTURES[4].monsterId,combatTacticId:'balanced',startedAtMs:T,lastClaimAtMs:T};
const wayfinderSkillEffects=activeCombatHitProjection(wayfinder,T+5*60_000)?.lastSkillEffects??[];
assert.ok(wayfinderSkillEffects.length>0&&wayfinderSkillEffects.some(effect=>effect.kind==='damage'),'Wayfinder must have a real named damage technique');
assert.ok(wayfinderSkillEffects.every(effect=>effect.kind!=='recovery'&&effect.name!=='Bloodrush'),'Classes without on-kill healing must never fabricate recovery');
assert.equal(activeCombatHitProjection(state,T)?.lastSkillEffect,undefined,'no combat activation may appear before the first settled hit');
assert.equal(liveState.character!.preparation!.remainingEncounters,3,'read-only live replay must not spend actual potion charges');
assert.equal(liveState.character!.currentHp,state.character!.currentHp,'read-only live replay must not mutate player HP');
// Narration is presentation only: it must match real hit events and never
// invent a crit, a percentage, or a permanent explanatory message.
const revenant=MONSTERS.find(row=>row.id==='OATHGLASS_REVENANT')!;
const formatDamage=(damage:number)=>Math.round(damage).toString();
const classes:ClassId[]=['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'];
const linesFor=(classId:ClassId,nowMs:number,monster=revenant,lastHit?:{atMs:number;actor:'player'|'enemy';damage:number;critical:boolean},stoppedReason='',hp:Partial<{playerHp:number;playerMaxHp:number;enemyHp:number;enemyMaxHp:number}>={})=>
 liveHuntNarration({classId,monster,nowMs,startedAtMs:T,lastHit,stoppedReason,damageText:formatDamage,...hp});
const prepared=classes.map(classId=>linesFor(classId,T));
assert.equal(new Set(prepared.map(row=>row.key)).size,classes.length,'every class needs its own combat preparation');
assert.equal(linesFor('WAYFINDER',T).key,'You draw your bow and take aim.','Wayfinder should visibly prepare a shot');
assert.equal(linesFor('WAYFINDER',T+4800).key,'Echo energy coils around the revenant.','enemy cue must match Revenant encounter identity');
assert.equal(linesFor('WAYFINDER',T+9600).key,'You watch for an opening.','idle narration should cycle without inventing a hit');
assert.equal(linesFor('WAYFINDER',T+4800,MONSTERS.find(row=>row.id==='VENOM_WEAVER')!).key,'The foe coils for a venomous strike.','Venom encounter needs its own cue');
const recent={atMs:T+20000,actor:'player' as const,damage:42,critical:false};
const landed=classes.map(classId=>linesFor(classId,T+20500,revenant,recent));
assert.equal(new Set(landed.map(row=>row.key)).size,classes.length,'every class needs distinctive actual-hit text');
assert.ok(landed.every(row=>row.hit&&!row.critical&&row.params?.amount==='42'),'player hit narration must use recorded damage');
const crit=linesFor('WAYFINDER',T+20500,revenant,{...recent,critical:true});
assert.ok(crit.hit&&crit.critical&&new Set<string>(HUNT_CLASS_NARRATION.WAYFINDER.strike).has(crit.key),'critical emphasis must depend on recorded hit');
const taken=linesFor('WAYFINDER',T+20500,revenant,{...recent,actor:'enemy',damage:17});
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.taken).has(taken.key),'enemy hit must use a real damage-labelled response');
assert.ok(taken.hit&&!taken.critical&&taken.params?.amount==='17','ordinary enemy hit must not imply a critical hit');
const recovery=linesFor('WAYFINDER',T+24500,revenant,{...recent,actor:'enemy',damage:17});
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.recover).has(recovery.key),'after an ordinary blow the player should recover');
const critRecovery=linesFor('WAYFINDER',T+24500,revenant,{...recent,actor:'enemy',damage:17,critical:true});
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.critRecover).has(critRecovery.key),'critical recovery must require a real enemy crit flag');
assert.equal(linesFor('WAYFINDER',T+22000,revenant,recent,'Too injured').key,'Combat stopped','stopped battle should not narrate further attacks');
const cyclePrep=Array.from({length:4},(_,i)=>linesFor('WAYFINDER',T+i*14400).key);
const cycleEnemy=Array.from({length:3},(_,i)=>linesFor('WAYFINDER',T+4800+i*14400).key);
const cycleFocus=Array.from({length:3},(_,i)=>linesFor('WAYFINDER',T+9600+i*14400).key);
assert.equal(new Set(cyclePrep).size,4,'class preparations must rotate through four unique lines');
assert.equal(new Set(cycleEnemy).size,3,'encounter cues must rotate through three unique lines');
assert.equal(new Set(cycleFocus).size,3,'neutral combat cues must rotate through three unique lines');
const firstTick=linesFor('WAYFINDER',T+20500,revenant,recent),repeatTick=linesFor('WAYFINDER',T+21200,revenant,recent);
assert.equal(firstTick.key,repeatTick.key,'a hit caption must stay stable across UI clock updates');
const distinctHits=new Set(Array.from({length:40},(_,i)=>linesFor('WAYFINDER',T+20000+i*1700+300,revenant,{...recent,atMs:T+20000+i*1700}).key));
assert.equal(distinctHits.size,3,'real Wayfinder hits must draw from all three combat variants');
const wounded=linesFor('WAYFINDER',T+9600,revenant,undefined,'',{playerHp:20,playerMaxHp:100,enemyHp:85,enemyMaxHp:100});
const finishing=linesFor('WAYFINDER',T+9600,revenant,undefined,'',{playerHp:100,playerMaxHp:100,enemyHp:12,enemyMaxHp:100});
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.wounded).has(wounded.key)&&wounded.tone==='danger','low real health must show wounded narration');
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.finishing).has(finishing.key),'near-dead enemies must use finishing narration');
assert.equal(linesFor('WAYFINDER',T+1500,revenant,{...recent,atMs:T-1}).key,'You draw your bow and take aim.','stale hit from another fight must be ignored');
assert.ok(new Set<string>(HUNT_COMMON_NARRATION.critTaken).has(linesFor('WAYFINDER',T+20500,revenant,{...recent,actor:'enemy',critical:true}).key),'real enemy critical hits must show critical damage variants');
assert.equal(HUNT_ENCOUNTER_NARRATION.SWARM.length,3,'every enemy archetype must have multiple neutral cues');
const everyCaption=[
 ...Object.values(HUNT_CLASS_NARRATION).flatMap(row=>[...row.prepare,...row.strike]),
 ...Object.values(HUNT_ENCOUNTER_NARRATION).flatMap(row=>[...row]),
 ...Object.values(HUNT_COMMON_NARRATION).flatMap(row=>[...row]),
];
assert.equal(everyCaption.length,120,'the combat caption pool should include 120 authored variants');
assert.equal(new Set(everyCaption).size,everyCaption.length,'the expanded pool must not contain duplicate captions');
for(const key of everyCaption){
 const translations=(BATTLE_MESSAGES as Record<string,readonly string[]>)[key];
 assert.ok(translations?.length===5,'all narration captions need DE/ES/NL/IT/FR translations: '+key);
 assert.ok(translations.every(text=>!!text.trim()),'every localized narration caption must be nonblank: '+key);
}

for(const row of [...prepared,...landed,taken,recovery,critRecovery,crit,...MONSTERS.map(monster=>linesFor('WAYFINDER',T+4800,monster))]){
 assert.ok(Object.prototype.hasOwnProperty.call(BATTLE_MESSAGES,row.key),'narration must have standard battle translations: '+row.key);
}
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const homeStage=fs.readFileSync('src/components/BattleStage.tsx','utf8');
assert.ok(homeStage.includes('activeCombatHitProjection('),'Home encounter preview must use actual hunt events');
assert.ok(homeStage.includes('!motion.enabled||isLive'),'Home must not play cosmetic hits over live fight events');
assert.ok(homeStage.includes('current={displayStat(fight?.enemyHp??view.enemyHp)}'),'Home displays authoritative projected enemy HP on the canonical x10 UI scale');
const combatTab=fs.readFileSync('src/components/HuntingPreview.tsx','utf8');
assert.ok(combatTab.includes('activeCombatHitProjection('),'Combat tab must use real hit projection');
assert.ok(combatTab.includes('replayCursor.current'),'Combat tab must reuse incremental projections');
assert.ok(combatTab.includes('liveHuntNarration('),'Combat tab must show event-driven class and encounter narration');
assert.ok(combatTab.includes('recentSkillEffect')&&combatTab.includes('ON-KILL RECOVERY'),'Live combat must surface only settled class recovery cues');
assert.ok(combatTab.includes('playerHp:fight.playerHp')&&combatTab.includes('enemyHp:fight.enemyHp'),'HP-based narration must use real projected combat values');
assert.ok(!combatTab.includes("tr('Progress · {percent}%"),'Live combat must not show a progress percentage');
assert.ok(!combatTab.includes('Damage updates on hit. Rewards are granted on defeat.'),'Static live combat instruction must be removed');
console.log('PASS real hunt hits, partial HP persistence, incremental replay, UI synchronization and split-claim parity');
