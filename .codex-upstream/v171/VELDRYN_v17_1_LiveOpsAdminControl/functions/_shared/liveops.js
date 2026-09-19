export const ACTIVITY_KINDS = ['combat','gathering','processing','crafting','fishing','hunting','alchemy','delivery'];
export const CHALLENGES = ['routine','demanding','elite','boss'];
export const CATEGORIES = ['combat','skilling'];
export const REWARD_TIERS = ['participation','milestone','prestige'];
export const REWARD_BANDS = ['qualified','top25Percent','top10Percent','top100','top10'];

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonicalize(v)]));
  }
  return value;
}

export async function hashDefinition(definition) {
  const encoded = new TextEncoder().encode(JSON.stringify(canonicalize(definition)));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2,'0')).join('');
}

function isFiniteNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function trimArray(values) { return asArray(values).filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean); }

export function normalizeDefinition(input) {
  const definition = structuredClone(input ?? {});
  definition.id = String(definition.id ?? '').trim();
  definition.version = Number(definition.version ?? 1);
  definition.scope = 'party';
  definition.name = String(definition.name ?? '').trim();
  definition.shortDescription = String(definition.shortDescription ?? '').trim();
  definition.durationHours = Number(definition.durationHours ?? 48);
  definition.eventTags = trimArray(definition.eventTags);
  definition.contributionRules ??= {};
  definition.contributionRules.allowedCategories = [...new Set(trimArray(definition.contributionRules.allowedCategories))];
  definition.contributionRules.allowedActivityKinds = [...new Set(trimArray(definition.contributionRules.allowedActivityKinds))];
  definition.contributionRules.allowedRegionIds = [...new Set(trimArray(definition.contributionRules.allowedRegionIds))];
  definition.contributionRules.requiredAnyTags = [...new Set(trimArray(definition.contributionRules.requiredAnyTags))];
  definition.contributionRules.dailyAccountCreditCap = Number(definition.contributionRules.dailyAccountCreditCap ?? 2400);
  definition.contributionRules.activityMultipliers ??= {};
  definition.contributionRules.challengeMultipliers ??= {};
  definition.contributionRules.minimumCategoryFraction ??= {};
  definition.personalMilestones = asArray(definition.personalMilestones).map((m) => ({
    points: Number(m?.points ?? 0),
    reward: { bundleId: String(m?.reward?.bundleId ?? '').trim(), tier: String(m?.reward?.tier ?? 'milestone') }
  }));
  definition.partyMilestones = asArray(definition.partyMilestones).map((m) => ({
    points: Number(m?.points ?? 0),
    reward: { bundleId: String(m?.reward?.bundleId ?? '').trim(), tier: String(m?.reward?.tier ?? 'milestone') }
  }));
  definition.personalPartyRewardEligibilityPoints = Number(definition.personalPartyRewardEligibilityPoints ?? 250);
  definition.rankedMinimumPartyPoints = Number(definition.rankedMinimumPartyPoints ?? 4000);
  definition.rankedMinimumMeaningfulContributors = Number(definition.rankedMinimumMeaningfulContributors ?? 2);
  definition.meaningfulContributorPoints = Number(definition.meaningfulContributorPoints ?? 250);
  definition.partyBindingLockPoints = Number(definition.partyBindingLockPoints ?? 250);
  definition.rankingRewards ??= {};
  for (const band of REWARD_BANDS) {
    const reward = definition.rankingRewards[band];
    if (reward) definition.rankingRewards[band] = { bundleId: String(reward.bundleId ?? '').trim(), tier: String(reward.tier ?? (band === 'qualified' ? 'participation' : 'prestige')) };
  }
  return definition;
}

export function validateDefinition(input) {
  const d = normalizeDefinition(input);
  const errors = [];
  const warnings = [];
  if (!/^[a-z0-9][a-z0-9_]{2,79}$/.test(d.id)) errors.push('Event ID must be 3–80 lowercase letters, numbers or underscores.');
  if (!Number.isInteger(d.version) || d.version < 1 || d.version > 9999) errors.push('Version must be a positive integer.');
  if (d.name.length < 3 || d.name.length > 80) errors.push('Name must be 3–80 characters.');
  if (d.shortDescription.length < 10 || d.shortDescription.length > 240) errors.push('Short description must be 10–240 characters.');
  if (!isFiniteNumber(d.durationHours) || d.durationHours < 24 || d.durationHours > 72) errors.push('Duration must be between 24 and 72 hours.');
  if (d.contributionRules.allowedCategories.length === 0) errors.push('At least one contribution category is required.');
  for (const category of d.contributionRules.allowedCategories) if (!CATEGORIES.includes(category)) errors.push(`Unknown category: ${category}`);
  for (const kind of d.contributionRules.allowedActivityKinds) if (!ACTIVITY_KINDS.includes(kind)) errors.push(`Unknown activity kind: ${kind}`);
  if (!Number.isInteger(d.contributionRules.dailyAccountCreditCap) || d.contributionRules.dailyAccountCreditCap < 100 || d.contributionRules.dailyAccountCreditCap > 10000) errors.push('Daily account credit cap must be an integer between 100 and 10,000.');
  for (const [kind, multiplier] of Object.entries(d.contributionRules.activityMultipliers ?? {})) {
    if (!ACTIVITY_KINDS.includes(kind)) errors.push(`Unknown activity multiplier kind: ${kind}`);
    if (!isFiniteNumber(multiplier) || multiplier < 0.5 || multiplier > 1.5) errors.push(`Activity multiplier for ${kind} must be 0.50–1.50.`);
  }
  for (const [challenge, multiplier] of Object.entries(d.contributionRules.challengeMultipliers ?? {})) {
    if (!CHALLENGES.includes(challenge)) errors.push(`Unknown challenge multiplier: ${challenge}`);
    if (!isFiniteNumber(multiplier) || multiplier < 0.75 || multiplier > 1.5) errors.push(`Challenge multiplier for ${challenge} must be 0.75–1.50.`);
  }
  let requiredFraction = 0;
  for (const [category, fraction] of Object.entries(d.contributionRules.minimumCategoryFraction ?? {})) {
    if (!CATEGORIES.includes(category)) errors.push(`Unknown minimum category fraction: ${category}`);
    if (!isFiniteNumber(fraction) || fraction < 0 || fraction > 0.8) errors.push(`Minimum fraction for ${category} must be 0.00–0.80.`);
    else requiredFraction += fraction;
  }
  if (requiredFraction > 1) errors.push('Minimum category fractions cannot total more than 100%.');

  const validateMilestones = (label, milestones) => {
    if (!milestones.length) warnings.push(`${label} milestones are empty.`);
    if (milestones.length > 12) errors.push(`${label} milestones are limited to 12.`);
    let previous = 0;
    for (const m of milestones) {
      if (!Number.isInteger(m.points) || m.points <= previous) errors.push(`${label} milestone points must be positive and strictly increasing.`);
      if (!m.reward.bundleId) errors.push(`${label} milestone ${m.points || '?'} needs a reward bundle.`);
      if (!REWARD_TIERS.includes(m.reward.tier)) errors.push(`${label} milestone ${m.points || '?'} has an invalid reward tier.`);
      previous = m.points;
    }
  };
  validateMilestones('Personal', d.personalMilestones);
  validateMilestones('Party', d.partyMilestones);

  const integerFields = [
    ['Personal party reward eligibility', d.personalPartyRewardEligibilityPoints, 1, 10000],
    ['Ranked minimum party points', d.rankedMinimumPartyPoints, 1, 1000000],
    ['Ranked minimum meaningful contributors', d.rankedMinimumMeaningfulContributors, 2, 4],
    ['Meaningful contributor points', d.meaningfulContributorPoints, 1, 10000],
    ['Party binding lock points', d.partyBindingLockPoints, 1, 10000],
  ];
  for (const [label, value, min, max] of integerFields) if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label} must be an integer between ${min} and ${max}.`);
  if (d.partyBindingLockPoints < d.meaningfulContributorPoints) errors.push('Party binding lock points cannot be below meaningful contributor points.');
  if (d.personalPartyRewardEligibilityPoints > d.partyBindingLockPoints * 4) warnings.push('Personal party eligibility is unusually high relative to binding lock points.');

  if (!d.rankingRewards.qualified?.bundleId) errors.push('Qualified ranking reward is required.');
  for (const [band, reward] of Object.entries(d.rankingRewards ?? {})) {
    if (!REWARD_BANDS.includes(band)) errors.push(`Unknown ranking reward band: ${band}`);
    if (!reward?.bundleId) errors.push(`Ranking reward ${band} needs a bundle ID.`);
    if (reward && !REWARD_TIERS.includes(reward.tier)) errors.push(`Ranking reward ${band} has an invalid tier.`);
  }

  if (d.rankedMinimumPartyPoints < d.partyMilestones[0]?.points) warnings.push('Rank qualification is below the first Party milestone.');
  if (d.durationHours === 24 && d.partyMilestones.at(-1)?.points > d.contributionRules.dailyAccountCreditCap * 4) warnings.push('Final Party milestone may require near-cap contribution from all four members in a 24-hour event.');
  if (!d.eventTags.length) warnings.push('No event tags are configured; LFG soft matching will be weaker.');

  return { definition: d, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function collectRewardBundleIds(definition) {
  const d = normalizeDefinition(definition);
  const ids = new Set();
  for (const m of [...d.personalMilestones, ...d.partyMilestones]) if (m.reward?.bundleId) ids.add(m.reward.bundleId);
  for (const reward of Object.values(d.rankingRewards ?? {})) if (reward?.bundleId) ids.add(reward.bundleId);
  return [...ids];
}

export function scheduleValidation(definition, startsAt, endsAt, graceMinutes) {
  const errors = [];
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push('Start and end timestamps are required.');
  const hours = (end - start) / 3600000;
  if (Number.isFinite(hours) && (hours < 24 || hours > 72)) errors.push('Scheduled duration must be 24–72 hours.');
  if (!Number.isInteger(graceMinutes) || graceMinutes < 5 || graceMinutes > 30) errors.push('Settlement grace must be 5–30 minutes.');
  const defHours = Number(definition?.durationHours ?? 0);
  if (Number.isFinite(hours) && Math.abs(hours - defHours) > 0.01) {
    // This is allowed by v17's scheduler as long as the event stays in range, but call it out for operators.
  }
  return errors;
}
