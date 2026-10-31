/** Material-funded Guild Construction benefits, independent of automatic Hall progress.
 * This is a read-only projection of server-confirmed completed template IDs.
 * Never derive spend permission or claimed rewards from this client module.
 */
export type GuildShopQuality='standard'|'rare'|'epic'|'prestige';
export interface GuildConstructionBenefits{
 canChangeGuildColors:boolean;shopQuality:GuildShopQuality;
 smithingTailoringSpeedBps:number;nonCombatXpBps:number;
 guildTokenBonusBps:number;guildTokenWeeklyCap:number;
 guildBossDamageBps:number;guildQuestGoldBps:number;
}
function tier(set:ReadonlySet<string>,building:string,count:number){
 let result=0;
 for(let n=1;n<=count;n++){if(set.has('construction_'+building+'_'+n))result=n;else break;}
 return result;
}
export function guildConstructionBenefits(completedTemplateIds:ReadonlySet<string>):GuildConstructionBenefits{
 const hall=tier(completedTemplateIds,'hall',4);
 const forge=tier(completedTemplateIds,'forge',3);
 const library=tier(completedTemplateIds,'library',3);
 const treasury=tier(completedTemplateIds,'treasury',2);
 const war=tier(completedTemplateIds,'war_room',3);
 const expedition=tier(completedTemplateIds,'expedition',2);
 return {
  canChangeGuildColors:hall>=1,shopQuality:(['standard','standard','rare','epic','prestige'] as const)[hall],
  smithingTailoringSpeedBps:[0,500,800,1200][forge],
  nonCombatXpBps:[0,500,800,1200][library],
  guildTokenBonusBps:[0,1000,2000][treasury],
  guildTokenWeeklyCap:[250,275,300][treasury],
  guildBossDamageBps:[0,300,600,1000][war],
  guildQuestGoldBps:[0,500,1000][expedition],
 };
}
export const GUILD_SHOP_QUALITY_TIER:Readonly<Record<GuildShopQuality,number>>={standard:0,rare:1,epic:2,prestige:3};
export const GUILD_SHOP_ITEM_QUALITY:Readonly<Record<string,GuildShopQuality>>={
 guild_pet_01:'standard',border_silver:'standard',icon_guild:'standard',emotes_fellowship:'standard',
 guild_pet_02:'rare',border_emerald:'rare',emotes_adventure:'rare',
 guild_companion_01:'epic',border_royal:'epic',emotes_legends:'epic',
 guild_companion_02:'prestige',guild_companion_03:'prestige',
};
export function guildShopQualityUnlocked(completed:ReadonlySet<string>,quality:GuildShopQuality){
 const {shopQuality}=guildConstructionBenefits(completed);
 return GUILD_SHOP_QUALITY_TIER[shopQuality]>=GUILD_SHOP_QUALITY_TIER[quality];
}
