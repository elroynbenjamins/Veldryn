import {itemDef} from '../content/items';

export const COMPANION_STAMINA_HP_PER_POINT=10;
export const COMPANION_EXPEDITION_STAMINA=100;

export function companionFoodStamina(itemId:string){
 const item=itemDef(itemId);
 return item.type==='food'&&item.heal?item.heal/COMPANION_STAMINA_HP_PER_POINT:0;
}
export function companionFoodNeededForStamina(itemId:string,stamina=COMPANION_EXPEDITION_STAMINA){
 const per=companionFoodStamina(itemId);return per>0?Math.ceil(stamina/per):Infinity;
}
export function companionExpeditionStaminaCost(durationHours:number){
 const hours=Math.max(1,Math.min(24,Math.ceil(durationHours)));
 // 100 stamina is the normal expedition baseline; long expeditions scale but remain bounded.
 return Math.min(300,Math.max(50,Math.ceil(hours/8)*50));
}
export function companionExpeditionProvisionPolicy(durationHours:number){
 const stamina=companionExpeditionStaminaCost(durationHours);
 return {stamina,healingHpEquivalent:stamina*COMPANION_STAMINA_HP_PER_POINT,bondXpBonusPercent:5,rewardBonusPercent:3};
}
