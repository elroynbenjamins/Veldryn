/** Synthetic trade-off only: not a new skill, item, potion or live stance.
 * All roles can use either setup. Compare against the same boss and seed. */
import type {CombatantDefinition} from './types';
export function weeklyReviewSurvivalBuild(actor:CombatantDefinition,choice:'current'|'guarded'|'resilient'):CombatantDefinition{
 if(choice==='current')return structuredClone(actor);
 if(choice!=='guarded'&&choice!=='resilient')throw Error('invalid_review_survival_choice');
 const p=structuredClone(actor);
 p.stats={...p.stats,attackPower:p.stats.attackPower*(choice==='guarded'?.88:.82),
  maxHp:p.stats.maxHp*(choice==='guarded'?1.22:1.38),
  defense:p.stats.defense*(choice==='guarded'?1.22:1.12)};
 return p;
}
