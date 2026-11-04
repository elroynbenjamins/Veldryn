import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_WEEKLY_ESSENCE,COMPANION_LEVEL_CURVE,COMPANION_RARITY_CONFIG,COMPANION_ASCENSION_BASE_COST} from '../src/content/combat-companions';
import {companionLevelCost,companionRemainingLevelCost,companionAscensionCost,COMPANION_LEVEL_GOLD_MULTIPLIER,COMPANION_ASCENSION_GOLD_MULTIPLIER} from '../src/core/combat-companions';
import {COMPANION_TECHNIQUE_SWITCH_COST} from '../../../backend/src/server/companions/content';
import {COMPANION_ECONOMY_TARGETS,companionProgressionBudget,fullMonthlyTrialEconomy,monthlyChallengeBondstoneBudget} from '../src/core/companion-economy-targets';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

equal(COMPANION_LEVEL_GOLD_MULTIPLIER,2,'Level Gold multiplier');
equal(COMPANION_ASCENSION_GOLD_MULTIPLIER,5,'Ascension Gold multiplier');
for(const rarity of ['standard','rare','elite','prestige'] as const){
 const multiplier=COMPANION_RARITY_CONFIG[rarity].levelCostMultiplier;
 for(const level of [1,2,9,10,19,24,29]){
  const oldGold=Math.round(COMPANION_LEVEL_CURVE.goldBase*Math.pow(COMPANION_LEVEL_CURVE.goldGrowth,level-1)*multiplier);
  const price=companionLevelCost(rarity,level);
  equal(price.gold,Math.ceil(oldGold*2/10)*10,`${rarity} Level ${level} doubles Gold and rounds UP to 10`);
  equal(price.companionEssence,Math.max(1,Math.round(COMPANION_LEVEL_CURVE.essenceBase*Math.pow(COMPANION_LEVEL_CURVE.essenceGrowth,level-1)*multiplier)),`${rarity} Level ${level} Essence stays unchanged`);
 }
 const def=COMBAT_COMPANIONS.find(row=>row.rarity===rarity)!;
 for(const tier of [1,2,3,'mastery'] as const){
  const base=COMPANION_ASCENSION_BASE_COST[tier],cost=companionAscensionCost(def,tier);
  equal(cost.gold,Math.ceil(Math.round(base.gold*multiplier)*5/100)*100,`${rarity} Ascension ${tier} Gold 5× rounded UP to 100`);
  equal(cost.companionEssence,Math.round(base.companionEssence*multiplier),`${rarity} Ascension ${tier} Essence unchanged`);
  equal(cost.bondstones,Math.max(1,Math.round(base.bondstones*Math.sqrt(multiplier))),`${rarity} Ascension ${tier} Bondstones unchanged`);
 }
}
equal(companionLevelCost('standard',1).gold,80,'Standard Level 1 Gold');
equal(companionLevelCost('rare',1).gold,90,'Rare Level 1 Gold');
equal(companionLevelCost('elite',1).gold,110,'Elite Level 1 Gold');
equal(companionLevelCost('prestige',1).gold,130,'Prestige Level 1 Gold');
const standard=COMBAT_COMPANIONS.find(row=>row.rarity==='standard')!;
equal(companionAscensionCost(standard,1).gold,3300,'Standard Ascension I Gold');
equal(companionAscensionCost(standard,2).gold,9500,'Standard Ascension II Gold');
const part=companionRemainingLevelCost(standard,{level:1,xp:32,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false});
equal(part.gold,40,'Partially trained Level 1 doubles remaining-XP Gold and rounds up to 10');
ok(part.gold<companionLevelCost('standard',1).gold,'Partially trained companion retains proportional Gold discount');

const byRarity=Object.fromEntries((['standard','rare','elite','prestige'] as const).map(rarity=>{
  const def=COMBAT_COMPANIONS.find(row=>row.rarity===rarity);
  if(!def)fail(`Missing ${rarity} companion definition`);
  return [rarity,companionProgressionBudget(def)];
})) as Record<'standard'|'rare'|'elite'|'prestige',ReturnType<typeof companionProgressionBudget>>;

for(const rarity of ['standard','rare','elite','prestige'] as const){
  const budget=byRarity[rarity],range=COMPANION_ECONOMY_TARGETS.focusedNaturalDaysByRarity[rarity],paidRange=COMPANION_ECONOMY_TARGETS.acceleratedTrainingEssenceByRarity[rarity];
  ok(budget.focusedNaturalDaysToMax>=range[0]&&budget.focusedNaturalDaysToMax<=range[1],`${rarity} natural XP pacing left target band: ${budget.focusedNaturalDaysToMax} days`);
  ok(budget.acceleratedTraining.companionEssence>=paidRange[0]&&budget.acceleratedTraining.companionEssence<=paidRange[1],`${rarity} accelerated-training Essence left target band: ${budget.acceleratedTraining.companionEssence}`);
  ok(budget.fullPaidPath.companionEssence>budget.ascension.companionEssence,`${rarity} accelerated training must remain an optional sink above natural-path Ascension cost`);
}
ok(byRarity.prestige.acceleratedTraining.companionEssence/byRarity.standard.acceleratedTraining.companionEssence<COMPANION_ECONOMY_TARGETS.maxAcceleratedEssenceSpreadVsStandard,'Prestige accelerated-training Essence spread must remain bounded versus Standard');

equal(byRarity.standard.ascension.bondstones,4,'Standard full Ascension Bondstone gate');
equal(byRarity.rare.ascension.bondstones,4,'Rare full Ascension Bondstone gate');
equal(byRarity.elite.ascension.bondstones,13,'Elite full Ascension Bondstone gate');
equal(byRarity.prestige.ascension.bondstones,29,'Prestige Ascension + Mastery Bondstone gate');

const monthly=fullMonthlyTrialEconomy(),challengeStones=monthlyChallengeBondstoneBudget(),trialCycleStones=monthly.bondstones+challengeStones;
equal(monthly.bondstones,12,'Full monthly Trial Bondstone package');
equal(challengeStones,COMPANION_ECONOMY_TARGETS.monthlyChallengeBondstones,'Monthly challenge Bondstone budget');
equal(trialCycleStones,13,'Trial-only monthly Bondstone cycle');
equal(byRarity.elite.ascension.bondstones,trialCycleStones,'Elite progression should map to one complete Trial month of Bondstones');
ok(byRarity.prestige.ascension.bondstones>trialCycleStones*2,'Prestige should not finish from only two Trial-only monthly cycles');
ok(byRarity.prestige.ascension.bondstones<=trialCycleStones*3,'Prestige Trial-only gate should remain within three monthly cycles');
ok(byRarity.prestige.ascension.companionEssence<=monthly.companionEssence,'One full monthly Trial should cover Prestige Ascension/Mastery Essence');
ok(monthly.gold>=byRarity.elite.ascension.gold,'One complete monthly Trial can still fund Elite Ascensions before optional paid leveling');
ok(monthly.gold<byRarity.prestige.ascension.gold,'5× Ascension Gold makes full Prestige Ascension and Mastery a longer-term Gold sink');

equal(COMPANION_SANCTUARY_WEEKLY_ESSENCE[3],COMPANION_TECHNIQUE_SWITCH_COST.companionEssence,'Max Essence Basin should fund one Technique switch per week');
equal(COMPANION_TECHNIQUE_SWITCH_COST.gold,0,'Technique switching should not add a second Gold tax');

console.log('PASS: companion economy target bands validate');
