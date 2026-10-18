/** Guild shop content definitions. No client-side purchase authority. */
export const GUILD_WEEKLY_TOKEN_CAP = 250;
export const GUILD_TOKEN_REWARDS = {
  dailyContribution: 10, dailyActivity: 10, weeklyParticipation: 50,
  weeklyProjectContribution: 40, guildBoss: 30,
} as const;
export const GUILD_EVENT_TOKEN_REWARDS = {
  dailyParticipation: 25, contributionMilestoneMin: 50,
  contributionMilestoneMax: 100, bossCompletion: 75,
  personalMilestoneMin: 100, personalMilestoneMax: 200,
  finalMilestoneMin: 250, finalMilestoneMax: 400,
} as const;
/** Event bonuses bypass only the base weekly earning cap; event claims must be idempotent server-side. */
export type GuildShopCategory = "pet" | "companion" | "border" | "profile_icon" | "emote_set";
export type GuildShopEntry = Readonly<{
  id: string; category: GuildShopCategory; name: string;
  guildLevel: number; tokenCost: number; oneTimePerAccount: true;
}>;
export const GUILD_SHOP_CATALOGUE: readonly GuildShopEntry[] = [
  { id:"guild_pet_01",category:"pet",name:"Guild Pet I",guildLevel:3,tokenCost:2000,oneTimePerAccount:true },
  { id:"guild_pet_02",category:"pet",name:"Guild Pet II",guildLevel:7,tokenCost:4000,oneTimePerAccount:true },
  { id:"guild_companion_01",category:"companion",name:"Epic Companion I",guildLevel:10,tokenCost:6000,oneTimePerAccount:true },
  { id:"guild_companion_02",category:"companion",name:"Epic Companion II",guildLevel:15,tokenCost:8000,oneTimePerAccount:true },
  { id:"guild_companion_03",category:"companion",name:"Epic Companion III",guildLevel:20,tokenCost:10000,oneTimePerAccount:true },
  { id:"border_silver",category:"border",name:"Silver Profile Border",guildLevel:2,tokenCost:750,oneTimePerAccount:true },
  { id:"icon_guild",category:"profile_icon",name:"Guild Profile Icon",guildLevel:4,tokenCost:1000,oneTimePerAccount:true },
  { id:"emotes_fellowship",category:"emote_set",name:"Fellowship (5 Emotes)",guildLevel:5,tokenCost:1250,oneTimePerAccount:true },
  { id:"border_emerald",category:"border",name:"Emerald Profile Border",guildLevel:8,tokenCost:1500,oneTimePerAccount:true },
  { id:"emotes_adventure",category:"emote_set",name:"Adventure (5 Emotes)",guildLevel:10,tokenCost:1750,oneTimePerAccount:true },
  { id:"border_royal",category:"border",name:"Royal Profile Border",guildLevel:14,tokenCost:2000,oneTimePerAccount:true },
  { id:"emotes_legends",category:"emote_set",name:"Legends (5 Emotes)",guildLevel:18,tokenCost:2500,oneTimePerAccount:true },
] as const;
export function guildShopEligibility(entry: GuildShopEntry, guildLevel: number, balance: number, owned: boolean):
  "owned" | "guild_level_locked" | "insufficient_tokens" | "eligible" {
  if (owned) return "owned";
  if (guildLevel < entry.guildLevel) return "guild_level_locked";
  if (balance < entry.tokenCost) return "insufficient_tokens";
  return "eligible";
}
/** Project costs are provisional until mapped to canonical material IDs. */
export const GUILD_CONSTRUCTION_TEMPLATES = [
  { id:"stormwatch_banner",guildLevel:5,gold:300000,materials:[
    { materialKey:"GREENWOOD_LOG",amount:10000 },{ materialKey:"ASTER_IRON_INGOT",amount:5000 },{ materialKey:"MOSS_FIBER",amount:2000 },
  ],unlockId:"guild_banner_stormwatch" },
] as const;
