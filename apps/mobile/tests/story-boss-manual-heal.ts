import {assert} from './test-assert';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {effectiveStats} from '../src/core/game';
import {characterTotalXpAtLevel} from '../src/core/progression';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {startStoryBossSession,healStoryBossSession,finishStoryBossSession,projectStoryBossSession} from '../src/core/story-boss-session';
import {FALLEN_KNIGHT_MANUAL_POTION_COOLDOWN_MS,simulateFallenKnightStoryBattle} from '../src/core/story-boss';
import {storyBossPlaybackEvents} from '../src/core/story-boss-playback';

const road=REGIONAL_COMBAT_FIXTURES.find(row=>row.regionId==='KINGS_ROAD')!;
const start=Date.UTC(2026,10,14,15,0,0);
const state=regionalCombatFixture(road,'prepared','IRONWARDEN');
state.activity=null;
state.outOfCombatSinceMs=start;
state.character!.level=25;
state.character!.xp=characterTotalXpAtLevel(25);
state.character!.currentHp=Math.round(effectiveStats(state).hp*.5);
state.character!.equippedHealingPotionId='RIVERHEART_DRAUGHT';
state.inventory.stacks=state.inventory.stacks.filter(x=>x.itemId!=='RIVERHEART_DRAUGHT');
state.inventory.stacks.push({itemId:'RIVERHEART_DRAUGHT',quantity:5});
state.quests=state.quests.map(q=>q.questId==='QST_014'?{...q,status:'active'}:q);
assert.ok(effectiveStats(state).hp>state.character!.currentHp,'fixture must be wounded');

// In manual mode an empty schedule consumes no potions; the signed command
// decides the timestamps, the client never supplies a health delta or schedule.
const initiated=startStoryBossSession(state,start);
assert.equal(initiated.battle.potionConsumed,0,'manual session disables automatic potions');
assert.equal(initiated.state.storyBossSession?.characterId,state.character!.id,'session scoped to active character');
let rejected=false;
try{validateGameCommand({type:'boss_heal',args:{atMs:500,amount:1000000}});}catch{rejected=true;}
assert.ok(rejected,'client must not submit potion strength or combat timestamps');
rejected=false;
try{executeGameCommand(initiated.state,{type:'roster_switch',args:{id:'other-character'}},start+100);}catch{rejected=true;}
assert.ok(rejected,'character cannot switch during server-owned battle');

const healed=healStoryBossSession(initiated.state,start+250);
assert.equal(healed.battle.potionConsumed,1,'one heal command consumes exactly one unit');
assert.equal(healed.state.inventory.stacks.find(x=>x.itemId==='RIVERHEART_DRAUGHT')?.quantity,5,'inventory reserved until settlement');
assert.ok(healed.battle.events.some(e=>e.type==='heal'&&e.atMs===250&&e.amount!>0),'heal is in authoritative battle timeline');
assert.deepEqual(healed.battle,projectStoryBossSession(healed.state.storyBossSession!),'projection must be deterministic');
rejected=false;
try{healStoryBossSession(healed.state,start+260);}catch{rejected=true;}
assert.ok(rejected,'rapid double tap must be rejected by server');
rejected=false;
try{finishStoryBossSession(healed.state,start+1000);}catch{rejected=true;}
assert.ok(rejected,'fight cannot settle early');

const final=finishStoryBossSession(healed.state,start+healed.battle.durationMs+1);
assert.ok(!final.state.storyBossSession,'completion removes active session');
assert.equal(final.battle.potionConsumed,1,'finish uses only confirmed healing commands');
assert.equal(final.state.inventory.stacks.find(x=>x.itemId==='RIVERHEART_DRAUGHT')?.quantity,4,'only one real potion consumed from inventory');
rejected=false;
try{finishStoryBossSession(final.state,start+healed.battle.durationMs+2);}catch{rejected=true;}
assert.ok(rejected,'completed battle cannot be rewarded twice');
rejected=false;
try{healStoryBossSession(final.state,start+healed.battle.durationMs+3);}catch{rejected=true;}
assert.ok(rejected,'healing impossible after settlement');

// Tied heal and hit timestamps must retain the actual action order,
// ensuring the HP presented to the player matches the authoritative fight.
const snapshot={...initiated.state.storyBossSession!.snapshot,currentHp:Math.max(1,Math.round(effectiveStats(state).hp*.5))};
const two=simulateFallenKnightStoryBattle(snapshot,'MANUAL_BOSS_HEAL_ORDER','rematch',[1800,1800+FALLEN_KNIGHT_MANUAL_POTION_COOLDOWN_MS]);
const playback=storyBossPlaybackEvents(two);
assert.equal(two.potionConsumed,2,'manual potion schedule respects action cap and cooldown');
assert.equal(playback.filter(e=>e.type==='heal').length,2,'two explicit heals displayed in playback');
const at1800=playback.filter(e=>e.atMs===1800);
assert.ok(at1800[0]?.type==='heal','heal executes before same-time boss action');
let badSchedule=false;
try{simulateFallenKnightStoryBattle(snapshot,'MANUAL_BOSS_HEAL_ORDER','rematch',[1800,1801]);}catch{badSchedule=true;}
assert.ok(badSchedule,'simulator rejects cooldown bypass');
console.log('PASS live Fallen Knight manual healing, idempotent finish, server timing, UI order and potion economy');
