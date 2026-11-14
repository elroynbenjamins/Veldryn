import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {HUNT_CLASS_TECHNIQUES} from '../src/core/hunt-active-abilities';
import {simulateFallenKnightStoryBattle} from '../src/core/story-boss';
import {effectiveStats,previewFallenKnightBattle} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import type {ClassId} from '../src/core/types';

const road=REGIONAL_COMBAT_FIXTURES.find(row=>row.regionId==='KINGS_ROAD')!;
const now=Date.UTC(2026,10,14,10,0,0);
const offensive=new Set<ClassId>(['WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER']);
const defensive=new Set<ClassId>(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','STONECALLER']);
const labels:string[]=[];
for(const cls of CLASSES){
 const state=regionalCombatFixture(road,'prepared',cls.id);
 state.character!.currentHp=effectiveStats(state).hp;
 state.inventory.stacks.push({itemId:'RIVERHEART_DRAUGHT',quantity:5});
 state.character!.equippedHealingPotionId='RIVERHEART_DRAUGHT';
 const replay=previewFallenKnightBattle(state,now,'story');
 const repeated=previewFallenKnightBattle(state,now,'story');
 assert.equal(JSON.stringify(replay),JSON.stringify(repeated),'Boss combat must be deterministic for '+cls.id);
 assert.ok(replay.events.length>3,'Story boss must resolve real hits '+cls.id);
 assert.ok(replay.potionConsumed<=5&&replay.foodConsumed===0,'Named class skill cannot consume food or extra potions: '+cls.id);
 assert.ok(replay.durationMs<=100_000&&replay.finalBossHp>=0&&replay.finalBossHp<=replay.bossMaxHp,'Keep original boss phase and time bounds: '+cls.id);
 assert.ok(replay.finalPlayerHp>=0&&replay.finalPlayerHp<=replay.playerMaxHp,'Class skill cannot over-heal: '+cls.id);
 const ability=HUNT_CLASS_TECHNIQUES[cls.id];
 const skills=replay.events.filter(e=>e.abilityId===ability.id&&
  (e.type==='class_skill'||e.type==='player_hit'));
 assert.ok(skills.length>0,'Every class must use its actual technique at least once in the story boss: '+cls.id);
 assert.ok(skills.every(e=>(e.amount??0)>0),'Skill banners must be backed by positive landed hits, shields or restored HP: '+cls.id);
 assert.ok(skills.every(e=>e.label===ability.name),'Boss replay must use canonical translated class technique names: '+cls.id);
 assert.ok(skills.every(e=>e.type==='class_skill'||e.skillKind==='damage'),'Defensive and offensive skills must have distinct real events: '+cls.id);
 if(offensive.has(cls.id)){
  assert.ok(skills.every(e=>e.type==='player_hit'&&e.skillKind==='damage'),'Damage classes need actual landed strikes: '+cls.id);
 }else if(defensive.has(cls.id)){
  assert.ok(skills.every(e=>e.type==='class_skill'&&(e.skillKind==='heal'||e.skillKind==='shield')),'Support and tank skills must be resolved, not cosmetic attack banners: '+cls.id);
 }
 const potions=replay.events.filter(e=>e.type==='heal');
 assert.equal(potions.length,replay.potionConsumed,'Class healing must never be counted as a potion: '+cls.id);
 assert.ok(replay.events.every(e=>Number.isFinite(e.playerHp)&&Number.isFinite(e.bossHp)&&e.playerHp>=0&&e.bossHp>=0),'All class snapshots must have finite HP: '+cls.id);
 labels.push(cls.id+':'+skills.length);
}
// Force a short stable encounter with known gear so unknown/malformed class IDs
// never gain a named technique and repeated replay cannot mint abilities.
const dummy={
 name:'Test fighter',classId:'UNKNOWN_CLASS',classSkillLevel:100,maxHp:10_000,currentHp:10_000,
 attack:100,defense:120,power:100,accuracy:.95,evasion:.1,critChance:.1,critMultiplier:1.5,haste:.1,
 damageMultiplier:1,actionSpeedMultiplier:1,incomingDamageMultiplier:1,
 potionHeal:0,potionQuantity:0,autoEatThresholdPct:50,
};
const unknown=simulateFallenKnightStoryBattle(dummy,'boss-unknown-class','rematch');
assert.ok(unknown.events.every(e=>e.type!=='class_skill'&&e.skillKind===undefined),'Unknown class must not trigger techniques');
const none=simulateFallenKnightStoryBattle({...dummy,classId:'IRONWARDEN',classSkillLevel:1},'boss-guard-base','rematch');
const max=simulateFallenKnightStoryBattle({...dummy,classId:'IRONWARDEN',classSkillLevel:100},'boss-guard-base','rematch');
const totalGuard=(events:typeof none.events)=>events.filter(e=>e.type==='class_skill'&&e.skillKind==='shield').reduce((sum,e)=>sum+(e.amount??0),0);
assert.ok(totalGuard(max)>=totalGuard(none),'Higher combat skill ranks must not reduce guard protection');
assert.ok(totalGuard(max)>0,'A real incoming hit should activate the guard');
assert.equal(none.foodConsumed,0,'No boss food under any combat class');
console.log('BOSS_CLASS_TECHNIQUES '+labels.join(','));
console.log('PASS real nine-class story boss techniques, class XP potency, bounded HP, deterministic replay and potion limits');
