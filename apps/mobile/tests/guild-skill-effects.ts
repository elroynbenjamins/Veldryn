import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {guildSkillProfessionMultipliers,guildSkillMemberCapacityExtra,guildSkillVanguardMultipliers,guildSkillFellowshipMultipliers} from '../src/core/guild-skill-effects';
import type {GameState} from '../src/core/types';

const NOW=Date.UTC(2026,10,2,12);
const near=(a:number,b:number)=>Math.abs(a-b)<1e-9;

// --- Pure helpers: authoritative, 0 while unreleased ---
assert.deepEqual(guildSkillProfessionMultipliers(undefined),{gatheringSpeedMultiplier:1,craftingSpeedMultiplier:1,skillXpMultiplier:1},'absent effects grant nothing');
assert.deepEqual(guildSkillProfessionMultipliers({gatheringSpeedBps:0,craftingSpeedBps:0,skillingXpBps:0}),{gatheringSpeedMultiplier:1,craftingSpeedMultiplier:1,skillXpMultiplier:1},'zero bps grants nothing');
{
 const m=guildSkillProfessionMultipliers({gatheringSpeedBps:600,craftingSpeedBps:400,skillingXpBps:200});
 assert.ok(near(m.gatheringSpeedMultiplier,1.06)&&near(m.craftingSpeedMultiplier,1.04)&&near(m.skillXpMultiplier,1.02),'rank bonuses map to exact multipliers');
}
assert.ok(near(guildSkillProfessionMultipliers({gatheringSpeedBps:99999}).gatheringSpeedMultiplier,1.06),'corrupt bps clamp to the +6% rank-3 cap');

assert.equal(guildSkillMemberCapacityExtra(undefined),0,'no membership bonus while unreleased');
assert.equal(guildSkillMemberCapacityExtra({memberCapacityExtra:3}),3,'rank 3 membership = +3');
assert.equal(guildSkillMemberCapacityExtra({memberCapacityExtra:99}),3,'membership extra clamps to 3');

assert.ok(near(guildSkillVanguardMultipliers({guildBossDamageBps:600}).damageMultiplier,1.06),'vanguard boss damage');
assert.ok(near(guildSkillFellowshipMultipliers({guildQuestRewardBps:400}).questRewardMultiplier,1.04),'fellowship quest rewards');

assert.deepEqual(guildSkillVanguardMultipliers(undefined),{
 damageMultiplier:1,defenceMultiplier:1,supportMultiplier:1,
},'Guild Boss, Defensive Doctrine and Battle Support are inert without a server projection');
{
 const m=guildSkillVanguardMultipliers({
  guildBossDamageBps:200,guildDefenceBps:400,guildSupportBps:600,
 });
 assert.ok(near(m.damageMultiplier,1.02)&&near(m.defenceMultiplier,1.04)
  &&near(m.supportMultiplier,1.06),
  'Vanguard ranks project separate Guild Boss, Defence and Support multipliers');
}
assert.deepEqual(guildSkillFellowshipMultipliers(undefined),{
 questRewardMultiplier:1,projectEfficiencyMultiplier:1,
},'Fellowship quest/project rewards do not change when server bonuses are absent');
{
 const m=guildSkillFellowshipMultipliers({
  guildQuestRewardBps:600,guildProjectEfficiencyBps:400,
 });
 assert.ok(near(m.questRewardMultiplier,1.06)&&near(m.projectEfficiencyMultiplier,1.04),
  'Fellowship quest and project multipliers match authoritative rank percentages');
}


// --- Integration: characterPermanentMultipliers merges Professions effects and no-ops when absent ---
const base:GameState=createCharacter(newGame(NOW),'IRONWARDEN','Skill Tester');
const without=characterPermanentMultipliers(base);
const applied=characterPermanentMultipliers({...base,guildSkillEffects:{gatheringSpeedBps:600,craftingSpeedBps:600,skillingXpBps:600}});

assert.ok(near(applied.gatheringSpeedMultiplier,without.gatheringSpeedMultiplier*1.06),'gathering speed stacks +6% on top of existing sources');
assert.ok(near(applied.craftingSpeedMultiplier,without.craftingSpeedMultiplier*1.06),'crafting speed +6%');
assert.ok(near(applied.skillXpMultiplier,without.skillXpMultiplier*1.06),'skill XP +6%');
// Must not leak into unrelated systems (no accidental double-apply with other bonuses).
assert.equal(applied.combatPowerMultiplier,without.combatPowerMultiplier,'combat power untouched by Professions skills');
assert.equal(applied.goldMultiplier,without.goldMultiplier,'gold untouched');
assert.equal(applied.dungeonRewardMultiplier,without.dungeonRewardMultiplier,'dungeon rewards untouched');

// Absent effects reproduce the baseline exactly (the unreleased state).
assert.deepEqual(characterPermanentMultipliers({...base,guildSkillEffects:undefined}),without,'no effects = baseline, so releasing nothing changes nothing');

console.log('PASS: Guild Skill effect consumers apply authoritative Professions bonuses and no-op while unreleased');
