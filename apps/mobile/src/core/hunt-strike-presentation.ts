import type {DungeonCombatClassFxProfile,DungeonCombatFxAccent} from './dungeon-combat-fx';

/**
 * How a class's ordinary-hunt strike is staged: wind-up, lunge or flight, and the effect
 * that plays where it lands. It reuses the class attack identities already defined for
 * dungeons, so a Wayfinder shoots and a Bastion smashes everywhere.
 *
 * Presentation only. Timings describe the animation that replays an already-resolved hit;
 * they never gate, delay or alter combat.
 */
export interface HuntStrikePresentation{
  accent:DungeonCombatFxAccent;
  /** Pixels the attacker pulls back before committing. */
  windUpPx:number;
  /** Pixels the attacker travels toward the target at the peak of the attack. */
  lungePx:number;
  /** Pixels the target is knocked back when the strike lands. */
  targetRecoilPx:number;
  /** Whole attacker motion, within the melee/ranged/spell targets for readable combat. */
  attackMs:number;
  /** Delay from the start of the attack until the strike lands on the target. */
  travelMs:number;
  /** A visible shot crossing the gap, for ranged and spell classes. */
  projectile?:'arrow'|'bolt';
  /** A brief glow around the caster while the spell is prepared. */
  castGlow:boolean;
  impactFx:'slash'|'smash'|'burst';
}

const MELEE:HuntStrikePresentation={accent:'gold',windUpPx:3,lungePx:9,targetRecoilPx:5,attackMs:320,travelMs:140,castGlow:false,impactFx:'slash'};

export function huntStrikePresentation(profile:DungeonCombatClassFxProfile|undefined):HuntStrikePresentation{
  if(!profile)return MELEE;
  const accent=profile.damageAccent;
  switch(profile.damageMotion){
    case 'smash': return {accent,windUpPx:4,lungePx:7,targetRecoilPx:7,attackMs:380,travelMs:170,castGlow:false,impactFx:'smash'};
    case 'dash': return {accent,windUpPx:2,lungePx:14,targetRecoilPx:5,attackMs:260,travelMs:115,castGlow:false,impactFx:'slash'};
    case 'projectile': {
      // A violet projectile is a hex bolt; any other shot is a physical arrow.
      const spell=accent==='violet';
      return {accent,windUpPx:3,lungePx:2,targetRecoilPx:4,attackMs:spell?480:420,travelMs:spell?220:200,projectile:spell?'bolt':'arrow',castGlow:spell,impactFx:'burst'};
    }
    case 'cast': return {accent,windUpPx:0,lungePx:0,targetRecoilPx:6,attackMs:520,travelMs:240,projectile:'bolt',castGlow:true,impactFx:'smash'};
    case 'pulse': return {accent,windUpPx:0,lungePx:0,targetRecoilPx:4,attackMs:460,travelMs:220,projectile:'bolt',castGlow:true,impactFx:'burst'};
    default: return {...MELEE,accent};
  }
}
