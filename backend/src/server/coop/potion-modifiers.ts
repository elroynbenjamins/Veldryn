import {potionDef} from '../../../../apps/mobile/src/content/alchemy';
import type {CombatantDefinition} from '../combat/types';

/**
 * Apply a preparation only from the server-persisted, already-paid dungeon
 * snapshot. The client cannot send raw multipliers or mutate the active run.
 * Re-evaluate from the snapshot for each node so a prepared tonic lasts the run.
 */
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

/** No player can inherit the tonic prepared by another role or an Echo. */
export function preparedCoopCombatants(players:readonly CombatantDefinition[],preparedByActor:Readonly<Record<string,string>>|undefined):CombatantDefinition[]{
 return players.map(player=>frozenAlchemyPotionCombatant(player,preparedByActor?.[player.id]));
}
