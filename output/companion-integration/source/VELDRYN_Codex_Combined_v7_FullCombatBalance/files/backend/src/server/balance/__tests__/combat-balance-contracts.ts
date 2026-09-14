import {strict as assert} from 'node:assert';
import {CHARACTER_PROGRESSION_BALANCE,CLASS_OUTPUT_BUDGETS,COMBAT_BALANCE_SURFACES,COMPANION_COMBAT_BALANCE,COMBAT_ECONOMY_GUARDRAILS,COOP_ROLE_TARGET,COOP_SYNC_TARGETS,ELITE_REGION_SCALING,EXPEDITION_TIER_BALANCE,FULL_COMBAT_BALANCE_VERSION,GUILD_BOSS_BALANCE,PVP_BALANCE,RAID_BALANCE,REGIONAL_BOSS_BASELINES,REGIONAL_BOSS_OUTCOME_TARGETS,REGION_POWER_CURVE} from '../combat-balance';
const ok=(v:unknown,m:string)=>assert.ok(v,m);

ok(/^2026-09-12\./.test(FULL_COMBAT_BALANCE_VERSION),'balance version must be explicit');
assert.equal(CLASS_OUTPUT_BUDGETS.length,9,'all nine launch classes must have a role/output budget');
assert.equal(new Set(CLASS_OUTPUT_BUDGETS.map(x=>x.name)).size,9,'class budget names must be unique');
for(const c of CLASS_OUTPUT_BUDGETS){ok(c.minPureDpsReference>0&&c.maxPureDpsReference>=c.minPureDpsReference,`${c.name} invalid output band`);if(c.role==='damage'){ok(c.minPureDpsReference>=.97&&c.maxPureDpsReference<=1.04,`${c.name} damage class drift`);}else ok(c.maxPureDpsReference<.75,`${c.name} non-DPS output too high`);}

ok(CHARACTER_PROGRESSION_BALANCE.supersededVerticalSliceActiveEquivalentHours.superseded,'stale 18–30h target must not regain authority');
ok(CHARACTER_PROGRESSION_BALANCE.asterfallLevel25ProductiveCombatHours.min>=150,'Asterfall idle progression unexpectedly collapsed');
ok(CHARACTER_PROGRESSION_BALANCE.asterfallCalendarDays.optimizer.max<CHARACTER_PROGRESSION_BALANCE.asterfallCalendarDays.normal.max,'active optimization should reduce calendar time');

for(let i=1;i<REGION_POWER_CURVE.length;i++){ok(REGION_POWER_CURVE[i].bossLevel>REGION_POWER_CURVE[i-1].bossLevel,'regional boss levels must rise');ok(REGION_POWER_CURVE[i].bossAttackIndex>REGION_POWER_CURVE[i-1].bossAttackIndex,'boss index must rise');}
for(const r of REGION_POWER_CURVE)ok(r.ratio>=.95&&r.ratio<=1.06,`${r.region} stat curve became a gear wall or overgear trivialization`);
for(let i=1;i<REGIONAL_BOSS_BASELINES.length;i++){const a=REGIONAL_BOSS_BASELINES[i-1],b=REGIONAL_BOSS_BASELINES[i];ok(b.hp>a.hp&&b.attack>a.attack&&b.accuracy>a.accuracy,'regional boss stats must rise');ok(b.attackInterval<=a.attackInterval,'later boss basic cadence must not become slower without explicit design');}
ok(REGIONAL_BOSS_OUTCOME_TARGETS.tankUnmitigatedBasicSurvivalMinimum>=6,'tank survival learning window regressed');
ok(!REGIONAL_BOSS_OUTCOME_TARGETS.hardSingleGearProfileRequired,'bosses must not hard-lock one gear profile');

for(let i=1;i<ELITE_REGION_SCALING.length;i++){ok(ELITE_REGION_SCALING[i].hpMultiplier>=ELITE_REGION_SCALING[i-1].hpMultiplier,'elite HP multiplier regressed');ok(ELITE_REGION_SCALING[i].damageMultiplier>=ELITE_REGION_SCALING[i-1].damageMultiplier,'elite damage multiplier regressed');}
for(const e of ELITE_REGION_SCALING){ok(e.damageMultiplier<e.hpMultiplier,'elites should gain more durability than burst lethality');assert.equal(e.pity,25);}

assert.deepEqual(COOP_ROLE_TARGET,{tank:1,damage:2,support:1});
for(let i=1;i<COOP_SYNC_TARGETS.length;i++){ok(COOP_SYNC_TARGETS[i].targetPower>COOP_SYNC_TARGETS[i-1].targetPower,'co-op target power must rise');ok(COOP_SYNC_TARGETS[i].softCapPower>COOP_SYNC_TARGETS[i].targetPower,'soft cap must sit above target');}
for(let i=0;i<EXPEDITION_TIER_BALANCE.length;i++){const t=EXPEDITION_TIER_BALANCE[i];ok(t.clearMin<=t.clearMid&&t.clearMid<=t.clearMax,`Tier ${t.tier} invalid clear band`);if(i){const p=EXPEDITION_TIER_BALANCE[i-1];ok(t.difficultyIndex>p.difficultyIndex,'difficulty must rise');ok(t.clearMid<p.clearMid,'target clear rate must fall');ok(t.rewardMultiplier>p.rewardMultiplier,'risk must increase reward efficiency');}}

assert.equal(COMPANION_COMBAT_BALANCE.rarityTotalPower.standard,1);ok(COMPANION_COMBAT_BALANCE.rarityTotalPower.prestige<=1.17,'Prestige power budget inflated');ok(COMPANION_COMBAT_BALANCE.characterAssistTypicalContribution.hardCap<=.12,'Companion assist dominance');ok(COMPANION_COMBAT_BALANCE.trialEnemyGrowth<1.03,'Companion Trial floor exponential too steep');

assert.equal(PVP_BALANCE.ranked.rarityBonus,0,'ranked PvP cannot preserve PvE rarity stat bonus');assert.equal(PVP_BALANCE.ranked.achievementBonus,0,'achievement power must not bias ranked PvP');ok(PVP_BALANCE.ranked.targetWinRate.min===.48&&PVP_BALANCE.ranked.targetWinRate.max===.52,'ranked fair-match band drift');ok(PVP_BALANCE.ranked.targetDurationSeconds.min>=90&&PVP_BALANCE.ranked.targetDurationSeconds.max<=150,'ranked duration drift');

for(let i=1;i<GUILD_BOSS_BALANCE.length;i++){ok(GUILD_BOSS_BALANCE[i].targetPowerSync>GUILD_BOSS_BALANCE[i-1].targetPowerSync,'guild boss sync must rise');ok(GUILD_BOSS_BALANCE[i].memberContributionCap<=GUILD_BOSS_BALANCE[i-1].memberContributionCap,'higher guild boss must not be easier to solo-carry');}
assert.equal(RAID_BALANCE.partySize,8);assert.equal(RAID_BALANCE.requiredLevel,100);ok(RAID_BALANCE.companionContributionPerPlayer.max<=.05,'raid companion contribution cap drift');ok(!RAID_BALANCE.challengeModeExclusivePower,'challenge raids cannot gate exclusive mandatory power');

const caps=Object.values(COMBAT_ECONOMY_GUARDRAILS.directGearDropCaps);for(let i=1;i<caps.length;i++)ok(caps[i]<caps[i-1],'rarer direct gear must have a lower cap');assert.equal(COMBAT_ECONOMY_GUARDRAILS.companionTrialFullRepeat.companionEssence,0);assert.equal(COMBAT_ECONOMY_GUARDRAILS.companionTrialFullRepeat.bondstones,0);
ok(COMBAT_BALANCE_SURFACES.some(x=>x.status==='real_repo_validation'),'handoff must preserve explicit real-repo validation boundary');

console.log('full-combat-balance-contracts: PASS');
