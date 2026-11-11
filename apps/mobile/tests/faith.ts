import {FAITH_BLESSINGS,FAITH_BLESSING_GROUPS,FAITH_TIERS,HOLY_WATER_ID,HOLY_WATER_SOURCES,faithBlessingDef,faithBlessingEffectLabel} from '../src/content/faith';
import {MONSTERS} from '../src/content/monsters';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {activityTargetLabel} from '../src/core/activity-target-label';
import {activityQueueLabel} from '../src/core/activity-queue';
import {createCharacter,newGame,claimActivity,previewActivityReward,stopActivity,sellItem,startCombat,effectiveStats} from '../src/core/game';
import {faithPracticeAvailability,startFaithPractice,normalizeFaith} from '../src/core/faith';
import {blessingRows,faithLevel,selectFaithBlessing,setFaithFavorite,setFaithHideWeaker} from '../src/core/faith-effects';
import {accountSkillLevel} from '../src/core/account-roster';
import {totalXpAtLevel} from '../src/core/progression';
import {eventEffectiveDropRate,eventDailyGift,eventWeeklyBoard,timedEventRewards} from '../src/core/live-events';
import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {combatBaselineProjection,dropExpectation} from '../src/core/balance-projection';
import {migrateSave} from '../src/core/save-migrations';
import {transitionAccountFaithPractice,setAccountFaithBlessing} from '../src/core/account-actions';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {professionActionPace} from '../src/core/profession-action-pace';
import {executeGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';
import {equal,ok,test,throws} from './account-test-helpers';
const T=Date.UTC(2026,8,10,12);
const fresh=()=>createCharacter(newGame(T),'IRONWARDEN','Pilgrim');
function faithAt(s:GameState,level:number):GameState{const xp=totalXpAtLevel(level);return {...s,skills:s.skills.map(k=>k.skillId==='faith'?{...k,level,xp}:k),character:s.character?{...s.character,faith:{...normalizeFaith(s.character.faith),xp}}:null};}
function water(s:GameState,n:number){return {...s,inventory:{...s.inventory,stacks:[...s.inventory.stacks.filter(x=>x.itemId!==HOLY_WATER_ID),{itemId:HOLY_WATER_ID,quantity:n}]}};}
function qty(s:GameState,id:string){return [...s.inventory.stacks,...s.bank.stacks,...s.overflow.stacks].filter(x=>x.itemId===id).reduce((a,b)=>a+b.quantity,0);}

test('Faith is a genuine level-one account skill for every new character',()=>{const s=fresh();equal(s.skills.length,11,'eleven professions/skills');equal(faithLevel(s.skills),1,'level');equal(accountSkillLevel(s),13,'11 ordinary + 2 class');});
test('Activity names use authored catalog names instead of raw IDs across all skills',()=>{
 for(const tier of FAITH_TIERS){
  equal(activityTargetLabel({kind:'faith',targetId:tier.id}),tier.name,'Faith tier '+tier.id);
  equal(activityQueueLabel({kind:'faith',targetId:tier.id}),tier.name,'queued Faith tier '+tier.id);
 }
 const monster=MONSTERS[0],herb=HERB_NODES[0],route=EXPLORATION_ROUTES[0];
 ok(!!monster&&!!herb&&!!route,'activity catalogs are populated');
 equal(activityTargetLabel({kind:'combat',targetId:monster.id}),monster.name,'combat name');
 for(const skillId of ['mining','woodcutting','fishing'] as const){
  const node=GATHERING.find(row=>row.skillId===skillId);
  ok(!!node,skillId+' node exists');
  equal(activityTargetLabel({kind:skillId,targetId:node!.id}),node!.name,skillId+' name');
 }
 equal(activityTargetLabel({kind:'herbalism',targetId:herb.id}),herb.name,'herbalism name');
 for(const skillId of ['alchemy','cooking'] as const){
  const recipe=RECIPES.find(row=>row.skillId===skillId);
  ok(!!recipe,skillId+' recipe exists');
  equal(activityTargetLabel({kind:skillId==='cooking'?'processing':'alchemy',targetId:recipe!.id}),recipe!.name,skillId+' name');
 }
 equal(activityTargetLabel({kind:'exploration',targetId:route.id}),route.name,'exploration name');
 equal(activityTargetLabel({kind:'training',targetId:'class_drills'}),'Class drills','class training name');
 equal(activityTargetLabel({kind:'faith',targetId:'FAITH_UNKNOWN_MODE'}),'Faith Unknown Mode','unknown saved ID is readable');
});

test('Faith practice XP uses the 20% lower rewards at every tier without changing costs or duration',()=>{
 const expected=[96,208,448,960,2048,4352],waterCosts=[1,2,4,8,16,32];
 equal(FAITH_TIERS.map(tier=>tier.xp),expected,'all six practice XP awards');
 equal(FAITH_TIERS.map(tier=>tier.water),waterCosts,'Holy Water costs unchanged');
 ok(FAITH_TIERS.every(tier=>tier.seconds===30),'30-second practice duration unchanged');
});
test('Faith catalog has escalating water tiers and ordered blessings',()=>{equal(FAITH_TIERS.length,6,'tiers');equal(FAITH_BLESSINGS.length,24,'blessings');for(let i=1;i<FAITH_TIERS.length;i++){ok(FAITH_TIERS[i].level>FAITH_TIERS[i-1].level,'tier level');ok(FAITH_TIERS[i].water>FAITH_TIERS[i-1].water,'water');ok(FAITH_TIERS[i].xp/FAITH_TIERS[i].water>=FAITH_TIERS[i-1].xp/FAITH_TIERS[i-1].water,'efficiency');}});
test('Holy Water has authored enemy sources and cannot be sold',()=>{const s=water(fresh(),2);for(const source of HOLY_WATER_SOURCES){const monster=MONSTERS.find(x=>x.id===source.monsterId)!;ok(!!monster,'monster');ok(monster.drops.some(x=>x.itemId===HOLY_WATER_ID),'drop wired');}throws(()=>sellItem(s,HOLY_WATER_ID,1),'cannot be sold');equal(qty(s,HOLY_WATER_ID),2,'unchanged');});
test('Holy Water odds stay whole-percent with tighter late-game sourcing',()=>{
 const originallyAuthored=[.20,.40,.35,.50,.60,.75];
 const finalChances=originallyAuthored.map((chance,index)=>index>=3?[.35,.40,.50][index-3]:Math.floor(chance*.95*.85*100+1e-9)/100);
 equal(finalChances,[.16,.32,.28,.35,.40,.50],'expected rounded drop chances');
 equal(HOLY_WATER_SOURCES.map(source=>source.chance),finalChances,'Faith catalog exposes final chances');
 for(const source of HOLY_WATER_SOURCES){
  const monster=MONSTERS.find(monster=>monster.id===source.monsterId)!;
  const waterDrop=monster.drops.find(drop=>drop.itemId===HOLY_WATER_ID)!;
  equal(waterDrop.chance,source.chance,source.monsterId+' actual chance matches Faith source and player preview');
  equal([waterDrop.min,waterDrop.max],[source.min,source.max],source.monsterId+' stack quantity unchanged');
  ok(Math.abs(waterDrop.chance*100-Math.round(waterDrop.chance*100))<1e-9,source.monsterId+' final chance uses a whole percent');
 }
});
test('Holy Water source strength scales with regional Faith progression',()=>{
 equal(HOLY_WATER_SOURCES.length,6,'six dedicated sources');
 const projected=HOLY_WATER_SOURCES.map(source=>{const monster=MONSTERS.find(x=>x.id===source.monsterId)!;const drop=monster.drops.find(x=>x.itemId===HOLY_WATER_ID)!;const pace=combatBaselineProjection(monster);return {source,drop,perHour:dropExpectation(drop.chance,drop.min,drop.max,pace.killsPerHour).expectedQuantityPerHour};});
 ok(projected[0].perHour>=42,'starter Faith source should provide at least ~42 Water/hour after the drop reduction');
 // Stronger late-region enemies take 20% longer; new lower Holy Water odds apply to each kill.
 for(const row of projected.slice(3))ok(row.perHour>=48,'late Faith sources still provide viable Water supply');
 ok(projected[0].drop.max===2&&projected.at(-1)!.drop.max===10,'later sources must award larger Water stacks than the starter source');
});
test('practice reserves Inventory before Bank and grants no free XP at start',()=>{let s=water(fresh(),1);s.bank.stacks=[{itemId:HOLY_WATER_ID,quantity:9}];const n=startFaithPractice(s,'FAITH_QUIET',5,T);equal(qty(n,HOLY_WATER_ID),5,'five reserved');equal(n.activity!.kind,'faith','activity');equal(n.skills,s.skills,'no xp');equal(n.activity!.faithPractice!.remainingPractices,5,'five');});
test('practice tiers are level gated and finite',()=>{const s=water(fresh(),100);equal(faithPracticeAvailability(s,'FAITH_CANDLE',1).ready,false,'locked');equal(faithPracticeAvailability(faithAt(s,10),'FAITH_CANDLE',1).ready,true,'unlocked');throws(()=>startFaithPractice(s,'FAITH_QUIET',1001,T),'1–1000');});
test('one Faith tap reserves affordable repeating practices even from older count-one clients',()=>{
 const started=executeGameCommand(water(fresh(),5),{type:'faith_practice',args:{tierId:'FAITH_QUIET',count:1}},T+1000).state;
 equal(started.activity!.faithPractice!.remainingPractices,5,'all five practices reserved on one tap');
 equal(qty(started,HOLY_WATER_ID),0,'water reserved up front');
 const claimed=executeGameCommand(started,{type:'claim'},T+61_000);
 equal(claimed.reward!.faithActions,2,'two cycles complete while one activity keeps running');
 equal(claimed.state.activity!.faithPractice!.remainingPractices,3,'remaining cycles persist after claim');
 const stopped=executeGameCommand(claimed.state,{type:'stop'},T+62_000).state;
 equal(qty(stopped,HOLY_WATER_ID),3,'unfinished sessions refunded after stopping');
});
test('continuous Faith respects higher-tier costs, Bank water and the 1000-cycle safety cap',()=>{
 let s=faithAt(water(fresh(),6),10);
 s={...s,bank:{...s.bank,stacks:[{itemId:HOLY_WATER_ID,quantity:4}]}};
 const started=executeGameCommand(s,{type:'faith_practice',args:{tierId:'FAITH_CANDLE',count:1}},T+1000).state;
 equal(started.activity!.faithPractice!.remainingPractices,5,'10 water gives 5 candle practices');
 equal(qty(started,HOLY_WATER_ID),0,'Inventory and Bank both reserved');
 const capped=executeGameCommand(water(fresh(),1002),{type:'faith_practice',args:{tierId:'FAITH_QUIET',count:1}},T+1000).state;
 equal(capped.activity!.faithPractice!.remainingPractices,1000,'session bounded');
 equal(qty(capped,HOLY_WATER_ID),2,'extra water remains available');
 const finished=executeGameCommand(started,{type:'claim'},T+151_000);
 equal(finished.reward!.faithActions,5,'all available repetitions are claimed together');
 equal(finished.state.activity,null,'activity ends after reserved water is exhausted');
});
test('switching Faith tiers starts immediately with refunded reserved Holy Water',()=>{
 const ready=faithAt(water(fresh(),10),10);
 const quiet=executeGameCommand(ready,{type:'faith_practice',args:{tierId:'FAITH_QUIET',count:1}},T+1000).state;
 equal(qty(quiet,HOLY_WATER_ID),0,'first practice holds all water in escrow');
 const candle=executeGameCommand(quiet,{type:'faith_practice',args:{tierId:'FAITH_CANDLE',count:1}},T+2000).state;
 equal(candle.activity?.kind,'faith','switch keeps practicing Faith without a stop action');
 equal(candle.activity?.targetId,'FAITH_CANDLE','tapping another Faith tier replaces the previous tier');
 equal(candle.activity?.faithPractice?.remainingPractices,5,'refunded water funds the replacement tier');
 equal(qty(candle,HOLY_WATER_ID),0,'no Holy Water is duplicated on switch');
});
test('partial practice consumes no water and awards no XP',()=>{const s=startFaithPractice(water(fresh(),10),'FAITH_QUIET',10,T);const r=previewActivityReward(s,T+29_999);equal(r.faithActions,0,'none');equal(r.xp,0,'xp');equal(r.holyWaterConsumed,0,'water');});
test('Faith progress survives frequent claims and the activity bar receives its updated fraction',()=>{
 let s=startFaithPractice(water(fresh(),3),'FAITH_QUIET',3,T);
 s=claimActivity(s,T+12_000).state;
 equal(s.activity!.faithPractice!.progressFraction,12/30,'first claim keeps 12 seconds');
 equal(s.character!.faith!.practice!.progressMs,12_000,'authoritative practice progress');
 s=claimActivity(s,T+22_000).state;
 equal(s.activity!.faithPractice!.progressFraction,22/30,'second claim keeps cumulative progress');
 const completed=claimActivity(s,T+32_000);
 equal(completed.reward.faithActions,1,'one complete 30-second practice');
 equal(completed.state.activity!.faithPractice!.progressFraction,2/30,'next cycle shows two seconds, not one');
 equal(completed.state.activity!.faithPractice!.remainingPractices,2,'two practices remain');
});
test('legacy Faith reservations use the authored 30-second cycle, not a fixed 60 seconds',()=>{
 let s=startFaithPractice(water(fresh(),2),'FAITH_QUIET',2,T);
 s={...s,activity:{...s.activity!,faithPractice:{...s.activity!.faithPractice!,progressFraction:.5}}};
 equal(previewActivityReward(s,T+1_000).faithActions,0,'half a cycle must not instantly complete');
 const claimed=claimActivity(s,T+15_000);
 equal(claimed.reward.faithActions,1,'half-cycle plus 15 seconds completes exactly one practice');
 equal(claimed.state.activity!.faithPractice!.remainingPractices,1,'remaining reservation is preserved');
});
test('completed practices consume reserved water and award Faith XP only',()=>{const s=startFaithPractice(water(fresh(),4),'FAITH_QUIET',4,T);const r=claimActivity(s,T+60_000);equal(r.reward.faithActions,2,'rites');equal(r.reward.holyWaterConsumed,2,'water');equal(r.reward.xp,192,'faith xp');equal(r.state.character!.xp,0,'no combat');equal(r.state.skills.find(x=>x.skillId==='faith')!.xp,192,'skill');equal(qty(r.state,HOLY_WATER_ID),0,'remaining two stay escrowed');});
test('stopping returns unfinished and partial-practice water exactly once',()=>{const s=startFaithPractice(water(fresh(),5),'FAITH_QUIET',5,T);const settled=claimActivity(s,T+75_000).state;const stopped=stopActivity(settled);equal(qty(stopped,HOLY_WATER_ID),3,'three unfinished returned');equal(stopActivity(stopped),stopped,'no second');});
test('account transition settles another activity before reserving Faith water',()=>{let s=water(fresh(),10);s=startCombat(s,'MOSS_RAT',T);const n=transitionAccountFaithPractice(s,T+60_000,'FAITH_QUIET',2).state;equal(n.activity!.kind,'faith','switched');equal(n.activity!.faithPractice!.remainingPractices,2,'reservation');});
test('blessings unlock from authoritative Faith XP and only one can be active',()=>{let s=faithAt(fresh(),10);throws(()=>selectFaithBlessing(s,'SUNFIRE_VOW'),'40');s=selectFaithBlessing(s,'WARD_OF_STONE');equal(s.character!.faith!.selectedBlessingId,'WARD_OF_STONE','first');s=selectFaithBlessing(s,'EMBER_VOW');equal(s.character!.faith!.selectedBlessingId,'EMBER_VOW','replaced');});
test('active blessing changes the intended modifier; favorites do not grant power',()=>{let s=faithAt(fresh(),40),base=characterPermanentMultipliers(s);s=setFaithFavorite(s,'SUNFIRE_VOW',true);equal(characterPermanentMultipliers(s),base,'favorite cosmetic');s=selectFaithBlessing(s,'SUNFIRE_VOW');ok(characterPermanentMultipliers(s).attackMultiplier>base.attackMultiplier,'attack');});
test('hide weaker only hides same-family unlocked lower blessings and preserves favorites',()=>{let s=faithAt(fresh(),40);s=setFaithHideWeaker(s,true);let rows=blessingRows(s);ok(!rows.some(x=>x.id==='EMBER_VOW'),'weaker hidden');s=setFaithFavorite(s,'EMBER_VOW',true);rows=blessingRows(s);ok(rows.some(x=>x.id==='EMBER_VOW'),'favorite remains');ok(rows.some(x=>x.family==='defense'),'other family remains');});
test('blessing changes settle old partial combat before future encounters use the new blessing',()=>{let s=faithAt(fresh(),40);s=startCombat(s,'MOSS_RAT',T);const before=s.activity!.classTrainingSnapshot!.faithBlessingId;const n=setAccountFaithBlessing(s,'SUNFIRE_VOW',T+1000);equal(n.activity!.classTrainingSnapshot!.faithBlessingId,before,'partial snapshot unchanged');equal(n.character!.faith!.selectedBlessingId,'SUNFIRE_VOW','future selected');});
test('new blessing affects freshly started combat statistics',()=>{let s=faithAt(fresh(),40),base=effectiveStats(s).attack;s=selectFaithBlessing(s,'SUNFIRE_VOW');ok(effectiveStats(s).attack>=base,'not worse');const a=startCombat(s,'MOSS_RAT',T);equal(a.activity!.classTrainingSnapshot!.faithBlessingId,'SUNFIRE_VOW','captured');});
test('Faith mastery stops practice and returns unused escrow',()=>{let s=faithAt(water(fresh(),10),99);const xp=s.skills.find(x=>x.skillId==='faith')!.xp;s.skills=s.skills.map(x=>x.skillId==='faith'?{...x,xp:totalXpAtLevel(100)-1,level:99}:x);const started=startFaithPractice(s,'FAITH_QUIET',10,T);const r=claimActivity(started,T+30_000);equal(faithLevel(r.state.skills),100,'mastered');equal(r.state.activity,null,'stopped');ok((r.reward.faithWaterRefund??0)>0,'refund');equal(qty(r.state,HOLY_WATER_ID),9,'nine returned');ok(xp<=totalXpAtLevel(100),'fixture');});
test('save migration preserves valid Faith reservation and selected unlocked blessing',()=>{let s=faithAt(water(fresh(),5),10);s=selectFaithBlessing(s,'EMBER_VOW');s=startFaithPractice(s,'FAITH_QUIET',5,T);const copy=migrateSave(JSON.parse(JSON.stringify(s)));equal(copy.version,11,'schema');equal(copy.activity!.faithPractice,s.activity!.faithPractice,'escrow');equal(copy.character!.faith!.selectedBlessingId,'EMBER_VOW','blessing');});
test('old saves gain Faith at level one without invented XP',()=>{const old:any=JSON.parse(JSON.stringify(fresh()));old.version=9;old.skills=old.skills.filter((x:any)=>x.skillId!=='faith');delete old.character.faith;const n=migrateSave(old);equal(n.skills.find(x=>x.skillId==='faith')?.xp,0,'xp');equal(n.skills.find(x=>x.skillId==='faith')?.level,1,'level');equal(n.character!.faith!.favoriteBlessingIds,[],'prefs');});

test('Faith includes exactly three progressive tiers for each of six paths',()=>{
 const families=['attack','defense','hp','combatSpeed','gathering','production','xp','eventCurrency'];
 equal(FAITH_BLESSING_GROUPS.length,5,'five visible groups');
 for(const family of families){
  const rows=FAITH_BLESSINGS.filter(b=>b.family===family);
  equal(rows.length,3,`${family} has three tiers`);
  ok(rows.every((b,index)=>index===0||(b.level>rows[index-1].level&&b.bonus>rows[index-1].bonus)),`${family} scales`);
 }
 equal(faithBlessingEffectLabel(faithBlessingDef('ETERNAL_BASTION')!),'9% Damage reduction','defense is not falsely labeled as a positive bonus');
 equal(faithBlessingEffectLabel(faithBlessingDef('ETERNAL_ENLIGHTENMENT')!),'+6% Combat & skill XP','experience scope');
});
test('Gathering Faith bonus applies only while that blessing is equipped',()=>{
 const s=faithAt(fresh(),70),base=characterPermanentMultipliers(s);
 const gathering=selectFaithBlessing(s,'HARVESTS_GRACE'),boost=characterPermanentMultipliers(gathering);
 ok(Math.abs(boost.gatheringSpeedMultiplier/base.gatheringSpeedMultiplier-1.06)<1e-10,'6% gathering speed');
 equal(boost.craftingSpeedMultiplier,base.craftingSpeedMultiplier,'does not boost production');
 const switched=selectFaithBlessing(gathering,'SUNFIRE_VOW');
 equal(characterPermanentMultipliers(switched).gatheringSpeedMultiplier,base.gatheringSpeedMultiplier,'switch removes old buff');
});
test('Production Faith affects new timed batches but not outputs or XP',()=>{
 const s=faithAt(fresh(),75),recipe={id:'FAITH_PACE_TEST',skillId:'smithing' as const,seconds:100,xp:200};
 const base=professionActionPace(s,recipe,'batch');
 const blessed=professionActionPace(selectFaithBlessing(s,'MASTERS_BENEDICTION'),recipe,'batch');
 ok(blessed.cycleSeconds<base.cycleSeconds,'production cycles finish sooner');
 ok(Math.abs(blessed.cycleSeconds/base.cycleSeconds-1/1.06)<1e-10,'6% production speed');
 equal(blessed.xpPerAction,base.xpPerAction,'production blessing changes speed only');
});
test('Experience Faith grants combat and profession XP but not Faith practice XP',()=>{
 const s=faithAt(water(fresh(),3),95),base=characterPermanentMultipliers(s);
 const blessed=selectFaithBlessing(s,'ETERNAL_ENLIGHTENMENT'),boost=characterPermanentMultipliers(blessed);
 ok(Math.abs(boost.skillXpMultiplier/base.skillXpMultiplier-1.06)<1e-10,'profession XP +6%');
 ok(Math.abs(boost.characterXpMultiplier/base.characterXpMultiplier-1.06)<1e-10,'combat XP +6%');
 equal(boost.gatheringSpeedMultiplier,base.gatheringSpeedMultiplier,'no gathering speed bonus');
 const recipe={id:'FAITH_FORGE_XP_TEST',skillId:'smithing' as const,seconds:100,xp:100};
 const defaultForge=professionActionPace(s,recipe,'forge');
 const blessedForge=professionActionPace(blessed,recipe,'forge');
 ok(Math.abs(blessedForge.xpPerAction/defaultForge.xpPerAction-1.06)<1e-10,'Faith XP covers forge crafting');
 const practicing=startFaithPractice(blessed,'FAITH_QUIET',1,T),r=claimActivity(practicing,T+30_000);
 equal(r.reward.faithXp,96,'Faith practice XP deliberately excluded');
});
test('Faith HP buffs increase maximum health without introducing a damage bonus',()=>{
 const s=faithAt(fresh(),90),before=effectiveStats(s);
 const blessed=selectFaithBlessing(s,'UNDYING_LIGHT'),after=effectiveStats(blessed);
 ok(after.hp>=Math.ceil(before.hp*1.12),'12% maximum HP');
 equal(after.attack,before.attack,'HP blessing does not add attack');
 equal(characterPermanentMultipliers(blessed).combatPowerMultiplier,characterPermanentMultipliers(s).combatPowerMultiplier,'no hidden combat power');
});
test('Faith switches clamp excess current health after maximum HP is reduced',()=>{
 const s=faithAt(fresh(),90),withHp=selectFaithBlessing(s,'UNDYING_LIGHT');
 withHp.character!.currentHp=effectiveStats(withHp).hp;
 const result=executeGameCommand(withHp,{type:'faith_blessing',args:{id:'EMBER_VOW'}},T+1000);
 ok(result.state.character!.currentHp<=effectiveStats(result.state).hp,'clamped to new cap');
});
test('Locked new blessings cannot be equipped and legacy selections survive save migration',()=>{
 const s=faithAt(fresh(),10);
 throws(()=>selectFaithBlessing(s,'MASTERS_BENEDICTION'),'75');
 let legacy=selectFaithBlessing(s,'WARD_OF_STONE');
 legacy=migrateSave(JSON.parse(JSON.stringify(legacy)));
 equal(legacy.character!.faith!.selectedBlessingId,'WARD_OF_STONE','old combat selection retained');
 const higher=faithAt(fresh(),95);
 const newSelection=selectFaithBlessing(higher,'ETERNAL_ENLIGHTENMENT');
 equal(migrateSave(JSON.parse(JSON.stringify(newSelection))).character!.faith!.selectedBlessingId,'ETERNAL_ENLIGHTENMENT','new selection retained');
});

test('Faith combat tempo has three unlock tiers with a single active blessing',()=>{
 const speed=FAITH_BLESSINGS.filter(b=>b.family==='combatSpeed');
 equal(speed.map(b=>[b.level,b.bonus]),[[18,.03],[52,.05],[88,.08]],'three speed unlock tiers');
 let s=faithAt(fresh(),88),base=characterPermanentMultipliers(s);
 s=selectFaithBlessing(s,'CELESTIAL_TEMPO');
 const accelerated=characterPermanentMultipliers(s);
 ok(Math.abs(accelerated.combatSpeedMultiplier/base.combatSpeedMultiplier-1.08)<1e-10,'Faith improves combat pacing by 8%');
 equal(accelerated.attackMultiplier,base.attackMultiplier,'speed adds no hidden attack damage');
 s=selectFaithBlessing(s,'SUNFIRE_VOW');
 equal(characterPermanentMultipliers(s).combatSpeedMultiplier,base.combatSpeedMultiplier,'damage blessing replaces the speed blessing');
 throws(()=>selectFaithBlessing(faithAt(fresh(),17),'QUICKENED_STEP'),'18');
});
test('Festival Faith adds up to 10% common activity currency without inflating fixed event rewards',()=>{
 const eventBranches=FAITH_BLESSINGS.filter(blessing=>blessing.family==='eventCurrency');
 equal(eventBranches.map(blessing=>[blessing.level,blessing.bonus]),[[30,.03],[65,.06],[98,.10]],'festival currency tiers');
 throws(()=>selectFaithBlessing(faithAt(fresh(),29),'FESTIVAL_FAVOR'),'30');
 const ev=LIVE_EVENT_CATALOG[0],id=ev.id,now=T,baseState=faithAt(fresh(),98);
 const s={...baseState,account:{...baseState.account,liveEvent:{eventId:id,enabled:true,startsAtMs:T-86400000,endsAtMs:T+86400000}}};
 const original=eventEffectiveDropRate(s,id,'gathering',now),gift=eventDailyGift(s,now),weekly=eventWeeklyBoard(s,now);
 const blessed=selectFaithBlessing(s,'FESTIVAL_BEACON');
 const updated=eventEffectiveDropRate(blessed,id,'gathering',now);
 ok(original>0&&Math.abs(updated/original-1.10)<1e-10,'max Faith applies exactly 10% to common event activity currency');
 equal(eventDailyGift(blessed,now)?.gift.rewardCurrency,gift?.gift.rewardCurrency,'daily gifts do not change');
 equal(eventWeeklyBoard(blessed,now).map(row=>row.objective.rewardCurrency),weekly.map(row=>row.objective.rewardCurrency),'weekly contract payouts do not change');
 const moments=Array.from({length:1000},(_,i)=>now+1000+i*1000);
 const before=timedEventRewards(s,'gathering',moments).eventDrops??[],after=timedEventRewards(blessed,'gathering',moments).eventDrops??[];
 ok(after.reduce((t,row)=>t+row.quantity,0)>before.reduce((t,row)=>t+row.quantity,0),'actual credited currency increases');
 const inactive={...blessed,account:{...blessed.account,liveEvent:{...blessed.account.liveEvent!,endsAtMs:now}}};
 const unblessedInactive={...s,account:{...s.account,liveEvent:{...s.account.liveEvent!,endsAtMs:now}}};
 equal(eventEffectiveDropRate(inactive,id,'gathering',now),eventEffectiveDropRate(unblessedInactive,id,'gathering',now),'bonus cannot apply after event expiry');
 const replaced=selectFaithBlessing(blessed,'CELESTIAL_TEMPO');
 equal(eventEffectiveDropRate(replaced,id,'gathering',now),original,'equipping speed removes event bonus');
 throws(()=>selectFaithBlessing(faithAt(fresh(),97),'FESTIVAL_BEACON'),'98');
});
test('all authored blessing ids are unique and resolve',()=>{equal(new Set(FAITH_BLESSINGS.map(x=>x.id)).size,FAITH_BLESSINGS.length,'unique');for(const blessing of FAITH_BLESSINGS)equal(faithBlessingDef(blessing.id)?.id,blessing.id,'resolve');});
console.log('Faith checks complete');
