export interface CompanionProvisionPolicy{foodUnits:number;bondXpBonusPercent:number;rewardBonusPercent:number;}
/**
 * Companions do not consume food merely for being equipped.
 * Food is an expedition provision sink: optional, bounded and paid per expedition.
 */
export function companionExpeditionProvisionPolicy(durationHours:number):CompanionProvisionPolicy{
 const hours=Math.max(1,Math.min(24,Math.ceil(durationHours)));
 const foodUnits=Math.max(1,Math.ceil(hours/4));
 return {foodUnits,bondXpBonusPercent:foodUnits>=4?10:foodUnits>=2?5:2,rewardBonusPercent:foodUnits>=4?5:foodUnits>=2?3:1};
}
