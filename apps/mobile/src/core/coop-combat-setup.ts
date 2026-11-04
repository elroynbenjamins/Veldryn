import type {GameState} from './types';
import {combatCompanionDef} from '../content/combat-companions';
import {POTIONS,potionDef} from '../content/alchemy';

export interface CoopCombatSetup {
 companion?:{id:string;name:string;role:'damage'|'tank'|'support'};
 healing?:{id:string;name:string;percent:number;carried:number};
 tonicCount:number;
 tonicPreviewId?:string;
}

/** Display-only summary of the current character's carried consumables.
 * Queue/ready permission and frozen loadout are always verified by the server.
 * In particular, a hunt preparation is NOT a dungeon tonic commitment. */
export function coopCombatSetup(state:GameState):CoopCombatSetup {
 const character=state.character;
 const companionId=character?.equippedCombatCompanionId;
 const definition=companionId?combatCompanionDef(companionId):undefined;
 const companion=definition&&companionId?{id:companionId,name:definition.name,role:definition.role}:undefined;
 const selected=character?.equippedHealingPotionId?potionDef(character.equippedHealingPotionId):undefined;
 const carried=(id:string)=>state.inventory.stacks.filter(stack=>stack.itemId===id&&Number.isFinite(stack.quantity)&&stack.quantity>0).reduce((sum,stack)=>sum+Math.floor(stack.quantity),0);
 const healing=selected?.effect.kind==='healing'?{id:selected.id,name:selected.name,percent:Math.round(selected.effect.maxHpFraction*100),carried:carried(selected.id)}:undefined;
 const tonics=POTIONS.filter(p=>p.effect.kind==='preparation').map(p=>({id:p.id,carried:carried(p.id)}));
 const tonicCount=tonics.reduce((sum,p)=>sum+p.carried,0);
 const tonicPreviewId=tonics.find(p=>p.carried>0)?.id;
 return {companion,healing,tonicCount,tonicPreviewId};
}
