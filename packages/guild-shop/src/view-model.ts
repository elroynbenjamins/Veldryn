import { GUILD_SHOP_CATALOGUE, guildShopEligibility, type GuildShopCategory } from "./catalogue";
/** Presentation-only model. Never use these values to authorize purchases. */
export interface GuildShopViewState {
 guildLevel: number;
 tokenBalance: number;
 ownedItemIds: readonly string[];
}
export interface GuildShopCard {
 id: string;
 title: string;
 category: GuildShopCategory;
 requiredGuildLevel: number;
 price: number;
 status: "owned" | "guild_level_locked" | "insufficient_tokens" | "eligible";
 progressToPrice: number;
}
export function buildGuildShopCards(state: GuildShopViewState): GuildShopCard[] {
 const owned = new Set(state.ownedItemIds);
 return GUILD_SHOP_CATALOGUE.map(entry => ({
  id: entry.id,
  title: entry.name,
  category: entry.category,
  requiredGuildLevel: entry.guildLevel,
  price: entry.tokenCost,
  status: guildShopEligibility(entry, state.guildLevel, state.tokenBalance, owned.has(entry.id)),
  progressToPrice: entry.tokenCost > 0 ? Math.max(0, Math.min(1, state.tokenBalance / entry.tokenCost)) : 0,
 }));
}
export function guildShopCategoryLabel(category: GuildShopCategory): string {
 switch (category) {
  case "pet": return "Pets";
  case "companion": return "Companions";
  case "border": return "Profile Borders";
  case "profile_icon": return "Profile Icons";
  case "emote_set": return "Emotes";
 }
}
