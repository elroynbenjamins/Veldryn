import type {CombatantDefinition} from '../combat/types';

/** Friendly borrowed Echoes retain their frozen abilities, gem effects, crit
 * profiles and relative gear stat shape. Only overall HP/attack/heal/defense
 * are softened to avoid powerful friends trivializing lower-power runs.
 * No permanent source loadout changes; never used by Live matchmaking. */
export function scaleSocialEchoToHost(
 echo:CombatantDefinition,
 hostCombatPower:number|undefined,
 echoCombatPower:number|undefined
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
 return {...echo,stats:{...echo.stats,
  maxHp:echo.stats.maxHp*factor,
  attackPower:echo.stats.attackPower*factor,
  healingPower:echo.stats.healingPower*factor,
  defense:echo.stats.defense*factor,
 }};
}
