/**
 * REVIEW-ONLY: Frostfall 2026 Guild Christmas Market deterministic domain rules.
 * Not imported by live runtime. No inventory, bank, XP, cosmetic or DB writes.
 * The future service must obtain membership, stocks, progress, caps and flags from
 * locked authoritative rows; never trust these arguments from a client request.
 */
export const WINTER_HEARTH_EVENT_ID = 'EVT_ANNUAL_012_2026';
export const WINTER_HEARTH_START_MS = Date.parse('2026-12-03T00:00:00.000Z');
export const WINTER_HEARTH_END_MS = Date.parse('2026-12-27T00:00:00.000Z');
export const WINTER_HEARTH_COLOR_ID = 'name_frostfall_aurora_2026';
export const WINTER_HEARTH_LIGHT_ID = 'FROSTFALL_CHRISTMAS_LIGHTS_2026';
export const WINTER_HEARTH_LOG_IDS = Object.freeze([
  'GREENWOOD_LOG',
  'IRONWOOD_LOG',
  'CROWNWOOD_LOG',
  'DUNEWOOD',
  'WHITEPINE_LOG',
  'CINDERWOOD_LOG',
]);
const LOG_SET = new Set(WINTER_HEARTH_LOG_IDS);
export const WINTER_HEARTH_GOALS = Object.freeze({ logs: 25000, lights: 2500 });
export const WINTER_HEARTH_WEEKLY_CAPS = Object.freeze({ logs: 2500, lights: 250 });
const lightRecipe=(skillId,primary,id)=>Object.freeze({
 id,skillId,level:4,
 inputs:Object.freeze([{itemId:primary,quantity:8},...(skillId==='tailoring'?[{itemId:'COPPER_ORE',quantity:4}]:[]),{itemId:'DEWLEAF',quantity:4},{itemId:'WISP_DUST',quantity:1}].map(Object.freeze)),
 output:Object.freeze({itemId:WINTER_HEARTH_LIGHT_ID,quantity:5}),seconds:40,gold:30,xp:35,
});
export const WINTER_HEARTH_LIGHT_RECIPES=Object.freeze({
 smithing:lightRecipe('smithing','COPPER_ORE','CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026'),
 tailoring:lightRecipe('tailoring','MOSS_FIBER','CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_TAILORING_2026'),
});
export const WINTER_HEARTH_LIGHT_RECIPE=WINTER_HEARTH_LIGHT_RECIPES.smithing;
import {FROSTFALL_2026_GUILD_COSMETICS,guildEventCosmeticsAtMilestones} from './guild-event-cosmetic-review.mjs';
export const WINTER_HEARTH_MILESTONES = Object.freeze([
  Object.freeze({ percent: 25, logs: 6250, lights: 625, guildGold: 10000, gatheringSpeedBps: 400, skillXpBps: 0, combatXpBps: 0, permanentColor: false }),
  Object.freeze({ percent: 50, logs: 12500, lights: 1250, guildGold: 20000, gatheringSpeedBps: 400, skillXpBps: 600, combatXpBps: 0, permanentColor: false }),
  Object.freeze({ percent: 75, logs: 18750, lights: 1875, guildGold: 30000, gatheringSpeedBps: 400, skillXpBps: 600, combatXpBps: 600, permanentColor: false }),
  Object.freeze({ percent: 100, logs: 25000, lights: 2500, guildGold: 50000, gatheringSpeedBps: 1000, skillXpBps: 1000, combatXpBps: 1000, permanentColor: true }),
]);

function validWhole(n) { return Number.isSafeInteger(n) && n >= 0; }
export function winterHearthWeekStartUtc(nowMs) {
  if (!Number.isFinite(nowMs)) throw new RangeError('Invalid timestamp');
  const date = new Date(nowMs);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid timestamp');
  const day = date.getUTCDay(); // Sunday 0; Monday 1
  const daysSinceMonday = (day + 6) % 7;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(midnight - daysSinceMonday * 86400000).toISOString().slice(0, 10);
}
export function winterHearthActive(nowMs) {
  return Number.isFinite(nowMs) && nowMs >= WINTER_HEARTH_START_MS && nowMs < WINTER_HEARTH_END_MS;
}
export function winterHearthTrackForItem(itemId) {
  return LOG_SET.has(itemId) ? 'logs' : itemId === WINTER_HEARTH_LIGHT_ID ? 'lights' : null;
}
export function winterHearthMilestoneStatus(progress) {
  if (!progress || !validWhole(progress.logs) || !validWhole(progress.lights)) throw new RangeError('Invalid guild progress');
  const logs = Math.min(WINTER_HEARTH_GOALS.logs, progress.logs);
  const lights = Math.min(WINTER_HEARTH_GOALS.lights, progress.lights);
  const current = WINTER_HEARTH_MILESTONES.filter(row => logs >= row.logs && lights >= row.lights);
  const stage = current.length ? current[current.length - 1] : null;
  return Object.freeze({
    logs, lights,
    progressRatio: Math.min(logs / WINTER_HEARTH_GOALS.logs, lights / WINTER_HEARTH_GOALS.lights),
    reachedPercent: stage?.percent ?? 0,
    earnedMilestones: Object.freeze(current.map(row => row.percent)),
    totalGuildGold: current.reduce((sum, row) => sum + row.guildGold, 0),
    permanentColorEarned: stage?.permanentColor ?? false,
    earnedCosmeticIds:guildEventCosmeticsAtMilestones(FROSTFALL_2026_GUILD_COSMETICS,WINTER_HEARTH_EVENT_ID,current.map(row=>row.percent)),
    buffs: Object.freeze({
      gatheringSpeedBps: stage?.gatheringSpeedBps ?? 0,
      skillXpBps: stage?.skillXpBps ?? 0,
      combatXpBps: stage?.combatXpBps ?? 0,
    }),
  });
}
/** Pure preflight only; server transaction must debit real inventory and commit exactly once. */
export function winterHearthDonationQuote({
  nowMs, eventEnabled, projectEnabled, currentGuildMember, itemId,
  quantity, guildProgress, accountWeekDonated, ownedQuantity,
}) {
  if (!eventEnabled || !projectEnabled || !winterHearthActive(nowMs)) return { ok: false, reason: 'event-disabled-or-closed' };
  if (!currentGuildMember) return { ok: false, reason: 'not-guild-member' };
  const track = winterHearthTrackForItem(itemId);
  if (!track) return { ok: false, reason: 'invalid-donation-item' };
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return { ok: false, reason: 'invalid-quantity' };
  if (!guildProgress || !accountWeekDonated || !validWhole(guildProgress.logs) || !validWhole(guildProgress.lights)
      || !validWhole(accountWeekDonated.logs) || !validWhole(accountWeekDonated.lights) || !validWhole(ownedQuantity)) {
    return { ok: false, reason: 'invalid-authoritative-snapshot' };
  }
  const goalLeft = Math.max(0, WINTER_HEARTH_GOALS[track] - guildProgress[track]);
  const weekLeft = Math.max(0, WINTER_HEARTH_WEEKLY_CAPS[track] - accountWeekDonated[track]);
  if (quantity > goalLeft) return { ok: false, reason: 'guild-track-full', goalLeft, weekLeft };
  if (quantity > weekLeft) return { ok: false, reason: 'weekly-member-cap', goalLeft, weekLeft };
  if (quantity > ownedQuantity) return { ok: false, reason: 'insufficient-owned-items', goalLeft, weekLeft };
  const before = winterHearthMilestoneStatus(guildProgress);
  const after = winterHearthMilestoneStatus({ ...guildProgress, [track]: guildProgress[track] + quantity });
  return Object.freeze({
    ok: true, track, itemId, quantity,
    accountWeekStartUtc: winterHearthWeekStartUtc(nowMs),
    weeklyRemainingAfter: weekLeft - quantity,
    guildTrackRemainingAfter: goalLeft - quantity,
    newlyReachedMilestones: Object.freeze(after.earnedMilestones.filter(percent => !before.earnedMilestones.includes(percent))),
    newMilestoneTotalGuildGold: after.totalGuildGold - before.totalGuildGold,
    newPermanentColor: !before.permanentColorEarned && after.permanentColorEarned,
    newCosmeticIds:Object.freeze(after.earnedCosmeticIds.filter(id=>!before.earnedCosmeticIds.includes(id))),
    after,
  });
}
/**
 * Preview only, active guild membership must be server-authorized.
 * Benefits are *not* granted by this function.
 */
export function winterHearthCurrentBuffs(progress, nowMs, member) {
  const zero = { gatheringSpeedBps: 0, skillXpBps: 0, combatXpBps: 0 };
  return member && winterHearthActive(nowMs) ? winterHearthMilestoneStatus(progress).buffs : zero;
}
