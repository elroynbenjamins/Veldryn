import type {CombatantDefinition} from '../combat/types';

/** Server-only authoritative combat effect catalog. No mobile/React Native
 * imports are permitted in the native backend TypeScript project.
 * Cross-package parity with crafting and the SQL allowlist is asserted in
 * backend/online/tests/role-potions.ts and dungeon-tonic-runtime.ts. */
export const DUNGEON_ROLE_TONIC_MODIFIERS={
 VIGOR_TONIC:{outgoing:1.05,incoming:1,healing:1,shielding:1},
 GREATER_VIGOR_TONIC:{outgoing:1.10,incoming:1,healing:1,shielding:1},
 OATH_VIGOR_TONIC:{outgoing:1.15,incoming:1,healing:1,shielding:1},
 WARD_TONIC:{outgoing:1,incoming:.95,healing:1,shielding:1},
 GREATER_WARD_TONIC:{outgoing:1,incoming:.90,healing:1,shielding:1},
 OATH_WARD_TONIC:{outgoing:1,incoming:.85,healing:1,shielding:1},
 HARMONY_TONIC:{outgoing:1.02,incoming:1,healing:1.05,shielding:1.05},
 GREATER_HARMONY_TONIC:{outgoing:1.04,incoming:1,healing:1.10,shielding:1.10},
 OATH_HARMONY_TONIC:{outgoing:1.06,incoming:1,healing:1.15,shielding:1.15},
} as const;

/** Use only server-validated already-paid run snapshot identifiers. */
export function frozenAlchemyPotionCombatant(player:CombatantDefinition,potionId:string|undefined):CombatantDefinition{
 if(!potionId)return player;
 if(player.team!=='players')throw new Error('alchemy_potion_non_player');
 const effect=DUNGEON_ROLE_TONIC_MODIFIERS[potionId as keyof typeof DUNGEON_ROLE_TONIC_MODIFIERS];
 if(!effect)throw new Error('invalid_alchemy_preparation');
 return {...player,alchemyModifiers:{...effect}};
}

/** Never apply an ally's or Echo's preparation to other characters. */
export function preparedCoopCombatants(players:readonly CombatantDefinition[],preparedByActor:Readonly<Record<string,string>>|undefined):CombatantDefinition[]{
 return players.map(player=>frozenAlchemyPotionCombatant(player,preparedByActor?.[player.id]));
}
