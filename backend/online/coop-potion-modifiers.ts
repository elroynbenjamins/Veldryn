import {potionDef} from '../../apps/mobile/src/content/alchemy';
import type {CombatantDefinition} from '../src/server/combat/types';

/** Convert only a server-verified, already-consumed Alchemy preparation into
 * immutable combat modifiers. Never accept percentages or potion IDs from HTTP
 * clients. Call this only after the run-start transaction retires the preparation
 * from the authoritative character, to prevent unlimited dungeon reuse. */
export function frozenAlchemyPotionCombatant(player:CombatantDefinition,potionId:string|undefined):CombatantDefinition{
 if(!potionId)return player;
 if(player.team!=='players')throw new Error('alchemy_potion_non_player');
 const potion=potionDef(potionId);
 if(!potion||potion.effect.kind!=='preparation')throw new Error('invalid_alchemy_preparation');
 const effect=potion.effect;
 return {...player,alchemyModifiers:{
  outgoing:1+effect.damageDealtFraction,
  incoming:1-effect.damageReductionFraction,
  healing:1+effect.healingStrengthFraction,
  shielding:1+effect.shieldStrengthFraction,
 }};
}
