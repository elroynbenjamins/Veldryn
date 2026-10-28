import type {CompanionAffinity} from './companion-affinity-catalog';

export type CompanionTrialStageId='asterfall'|'sunscar'|'frostmarch'|'ashlands'|'rift'|'apex';

/**
 * Encounter-specific advantages, not eligibility gates. Every Tank / Damage /
 * Support trio remains valid. Matchups change only combatant statistics; they
 * never alter rewards, level progression, or permanent companion data.
 *
 * Each region favors one offensive affinity and one protective affinity.
 * Taking both rewards deliberate complementary picks with a small team-wide
 * tempo effect, without replacing the existing origin/rarity synergies.
 */
export interface CompanionTrialStageMatchup{
 id:CompanionTrialStageId;
 attackAffinity:CompanionAffinity;
 guardAffinity:CompanionAffinity;
 threat:string;
 attackReason:string;
 guardReason:string;
}
export const COMPANION_TRIAL_STAGE_MATCHUPS:readonly CompanionTrialStageMatchup[]=[
 {id:'asterfall',attackAffinity:'wild',guardAffinity:'construct',threat:'Armored guardians and ambushes',attackReason:'Wild hunters exploit exposed weak points.',guardReason:'Constructs withstand heavy opening hits.'},
 {id:'sunscar',attackAffinity:'primal',guardAffinity:'arcane',threat:'Glass armor and mirage magic',attackReason:'Primal force fractures hardened glass.',guardReason:'Arcane wards blunt mirage pressure.'},
 {id:'frostmarch',attackAffinity:'arcane',guardAffinity:'radiant',threat:'Interruptible bell casts and frost pressure',attackReason:'Arcane precision disrupts bell-channeling foes.',guardReason:'Radiant protection sustains the formation.'},
 {id:'ashlands',attackAffinity:'construct',guardAffinity:'primal',threat:'Armored forge enemies and crushing blows',attackReason:'Construct weaponry breaks through forgeplate.',guardReason:'Primal endurance steadies the front line.'},
 {id:'rift',attackAffinity:'umbral',guardAffinity:'construct',threat:'Rift bursts and shifting weaknesses',attackReason:'Umbral attacks exploit unstable rift gaps.',guardReason:'Construct anchors resist disruptive surges.'},
 {id:'apex',attackAffinity:'radiant',guardAffinity:'umbral',threat:'Regent phases and high-pressure abilities',attackReason:'Radiant offense counters the echo crown.',guardReason:'Umbral wards absorb reflected pressure.'},
];
export const COMPANION_TRIAL_STAGE_OFFENSE_MULTIPLIER=1.065;
export const COMPANION_TRIAL_STAGE_GUARD_MULTIPLIER=1.06;
export const COMPANION_TRIAL_STAGE_PAIR_HASTE_BONUS=.02;

export function companionTrialStageMatchup(floor:number):CompanionTrialStageMatchup{
 const safe=Number.isFinite(floor)?Math.floor(floor):1;
 return COMPANION_TRIAL_STAGE_MATCHUPS[Math.max(0,Math.min(5,Math.floor((Math.max(1,safe)-1)/5)))];
}
export function companionTrialStageTeamMatchup(floor:number,affinities:readonly CompanionAffinity[]){
 const matchup=companionTrialStageMatchup(floor),set=new Set(affinities);
 const offense=set.has(matchup.attackAffinity),guard=set.has(matchup.guardAffinity);
 return {matchup,offense,guard,pair:offense&&guard};
}
