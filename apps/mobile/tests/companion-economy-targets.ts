import {COMBAT_COMPANIONS,COMPANION_SANCTUARY_WEEKLY_ESSENCE} from '../src/content/combat-companions';
import {COMPANION_TECHNIQUE_SWITCH_COST} from '../../../backend/src/server/companions/content';
import {COMPANION_ECONOMY_TARGETS,companionProgressionBudget,fullMonthlyTrialEconomy,monthlyChallengeBondstoneBudget} from '../src/core/companion-economy-targets';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const byRarity=Object.fromEntries((['standard','rare','elite','prestige'] as const).map(rarity=>{
  const def=COMBAT_COMPANIONS.find(row=>row.rarity===rarity);
  if(!def)fail(`Missing ${rarity} companion definition`);
  return [rarity,companionProgressionBudget(def)];
})) as Record<'standard'|'rare'|'elite'|'prestige',ReturnType<typeof companionProgressionBudget>>;

for(const rarity of ['standard','rare','elite','prestige'] as const){
  const budget=byRarity[rarity],range=COMPANION_ECONOMY_TARGETS.focusedNaturalDaysByRarity[rarity];
  ok(budget.focusedNaturalDaysToMax>=range[0]&&budget.focusedNaturalDaysToMax<=range[1],`${rarity} natural XP pacing left target band: ${budget.focusedNaturalDaysToMax} days`);
  ok(budget.fullPaidPath.companionEssence>budget.ascension.companionEssence,`${rarity} accelerated training must remain an optional sink above natural-path Ascension cost`);
}

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
ok(monthly.gold>=byRarity.prestige.ascension.gold,'One full monthly Trial should cover Prestige Ascension/Mastery Gold before optional paid leveling');

equal(COMPANION_SANCTUARY_WEEKLY_ESSENCE[3],COMPANION_TECHNIQUE_SWITCH_COST.companionEssence,'Max Essence Basin should fund one Technique switch per week');
equal(COMPANION_TECHNIQUE_SWITCH_COST.gold,0,'Technique switching should not add a second Gold tax');

console.log('PASS: companion economy target bands validate');
