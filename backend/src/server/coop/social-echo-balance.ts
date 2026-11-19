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
 // Fall back to a small fixed penalty if an old donor lacks CP metadata.
 const factor=hostCombatPower&&echoCombatPower&&hostCombatPower>0&&echoCombatPower>0
  ?Math.max(.60,Math.min(1.02,.90*Math.pow(owner/donor,.5)))
  :.90;
 return {...echo,stats:{...echo.stats,
  maxHp:echo.stats.maxHp*factor,
  attackPower:echo.stats.attackPower*factor,
  healingPower:echo.stats.healingPower*factor,
  defense:echo.stats.defense*factor,
 }};
}
