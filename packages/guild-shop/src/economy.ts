/** Pure, server-reusable guild token accounting rules.
 * Persistence, guild membership, account ownership and reward grants MUST be
 * verified in a single database transaction before using these calculations.
 */
import { GUILD_WEEKLY_TOKEN_CAP } from "./catalogue";
export type TokenGrantKind = "standard" | "event";
export interface TokenGrantInput {
  balance: number;
  earnedStandardThisWeek: number;
  amount: number;
  kind: TokenGrantKind;
  claimAlreadyProcessed: boolean;
}
export type TokenGrantResult =
  | { ok: true; credited: number; nextBalance: number; nextStandardEarned: number }
  | { ok: false; reason: "duplicate_claim" | "invalid_amount" | "invalid_state" | "weekly_cap_reached" };
const validNonnegativeInteger = (value: number) => Number.isSafeInteger(value) && value >= 0;
export function calculateTokenGrant(input: TokenGrantInput): TokenGrantResult {
  if (input.claimAlreadyProcessed) return { ok: false, reason: "duplicate_claim" };
  if (!validNonnegativeInteger(input.balance) || !validNonnegativeInteger(input.earnedStandardThisWeek))
    return { ok: false, reason: "invalid_state" };
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    return { ok: false, reason: "invalid_amount" };
  const remaining = Math.max(0, GUILD_WEEKLY_TOKEN_CAP - input.earnedStandardThisWeek);
  const credited = input.kind === "event" ? input.amount : Math.min(input.amount, remaining);
  if (credited === 0) return { ok: false, reason: "weekly_cap_reached" };
  const nextBalance = input.balance + credited;
  const nextStandardEarned = input.earnedStandardThisWeek + (input.kind === "standard" ? credited : 0);
  if (!Number.isSafeInteger(nextBalance)) return { ok: false, reason: "invalid_state" };
  return { ok: true, credited, nextBalance, nextStandardEarned };
}
export interface TokenPurchaseInput {
  balance: number;
  price: number;
  guildLevel: number;
  requiredGuildLevel: number;
  alreadyOwned: boolean;
}
export function calculateTokenPurchase(input: TokenPurchaseInput):
  | { ok: true; nextBalance: number }
  | { ok: false; reason: "invalid_state" | "already_owned" | "guild_level_locked" | "insufficient_tokens" } {
  if (![input.balance, input.price, input.guildLevel, input.requiredGuildLevel].every(validNonnegativeInteger) || input.price === 0)
    return { ok: false, reason: "invalid_state" };
  if (input.alreadyOwned) return { ok: false, reason: "already_owned" };
  if (input.guildLevel < input.requiredGuildLevel) return { ok: false, reason: "guild_level_locked" };
  if (input.balance < input.price) return { ok: false, reason: "insufficient_tokens" };
  return { ok: true, nextBalance: input.balance - input.price };
}
