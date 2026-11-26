import type {CombatantDefinition} from '../combat/types';

/** Friendly borrowed Echoes retain their frozen abilities, gem effects, crit
 * profiles and relative gear stat shape. Only overall HP/attack/heal/defense
 * are softened to avoid powerful friends trivializing lower-power runs.
 * No permanent source loadout changes; never used by Live matchmaking. */
export function scaleSocialEchoToHost(
 echo:CombatantDefinition,
 hostCombatPower:number|undefined,
 echoCombatPower:number|undefined,
 hostRegionalBoost=1,
 donorRegionalBoost=1
):CombatantDefinition{
 const owner=Math.max(1,Number(hostCombatPower)||0);
 const donor=Math.max(1,Number(echoCombatPower)||0);
 // Approximately 90% of the host's CP even when recruiting a far stronger
 // friend. Donor power still influences the result slightly, never above 110%
 // of the host in that influence term. We keep their actual stat distribution,
 // abilities and equipped effects, rather than replacing the borrowed build.
 const target=.90*(owner*.88+Math.min(donor,owner*1.10)*.12);
 const factor=hostCombatPower&&echoCombatPower&&hostCombatPower>0&&echoCombatPower>0
  ?Math.min(1.02,target/donor):.90;
 // Correct relative regional HP/damage boosts before normalizing borrowed allies.
 // Otherwise powerful donors can remain disproportionately strong in later regions.
 const safeHost=Number.isFinite(hostRegionalBoost)&&hostRegionalBoost>=1?hostRegionalBoost:1;
 const safeDonor=Number.isFinite(donorRegionalBoost)&&donorRegionalBoost>=1?donorRegionalBoost:1;
 const attackCorrection=safeHost/safeDonor;
 const survivalCorrection=(1+(safeHost-1)*.7)/(1+(safeDonor-1)*.7);
 return {...echo,stats:{...echo.stats,
  maxHp:echo.stats.maxHp*factor*survivalCorrection,
  attackPower:echo.stats.attackPower*factor*attackCorrection,
  healingPower:echo.stats.healingPower*factor*attackCorrection,
  defense:echo.stats.defense*factor*survivalCorrection,
 }};
}
