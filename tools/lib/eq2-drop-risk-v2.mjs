/**
 * Pure, review-only Equipment 2.0 economy risk helpers.
 * No gameplay imports, runtime mutation, network access or nondeterministic RNG.
 */
const whole = (n, label, allowZero = false) => {
  if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1)) {
    throw new Error('Invalid ' + label + ': ' + n);
  }
  return n;
};
const rate = (p, label) => {
  if (!Number.isFinite(p) || p <= 0 || p > 1) throw new Error('Invalid ' + label + ': ' + p);
  return p;
};
export function seededRng(seed) {
  whole(seed, 'seed', true);
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
export function killsUntilDrops(required, chance, rng) {
  whole(required, 'required drops', true);
  if (required === 0) return 0;
  rate(chance, 'drop chance');
  if (typeof rng !== 'function') throw new Error('Explicit seeded RNG required');
  const denominator = Math.log1p(-chance);
  let kills = 0;
  for (let i = 0; i < required; i += 1) {
    const u = rng();
    if (!Number.isFinite(u) || u < 0 || u >= 1) throw new Error('RNG outside [0,1)');
    kills += Math.floor(Math.log1p(-u) / denominator) + 1;
  }
  return kills;
}
const quantiles = (ordered) => {
  const n = ordered.length;
  return {
    p50: ordered[Math.ceil(n * 0.50) - 1],
    p90: ordered[Math.ceil(n * 0.90) - 1],
    p95: ordered[Math.ceil(n * 0.95) - 1]
  };
};
export function simulateDropRisk({common, scarce, commonChance, scarceChance, trials = 4096, seed = 20261121}) {
  whole(common, 'common quantity', true);
  whole(scarce, 'scarce quantity', true);
  whole(trials, 'trials');
  if (trials < 256 || trials > 100000) throw new Error('Trials outside safe review bounds');
  if (!common && !scarce) throw new Error('At least one combat drop required');
  if (common) rate(commonChance, 'common chance');
  if (scarce) rate(scarceChance, 'scarce chance');
  const rng = seededRng(seed);
  const shared = [];
  const separate = [];
  for (let sample = 0; sample < trials; sample += 1) {
    // Independent Bernoulli drop streams on the same eligible normal kills.
    // Time to satisfy both goals in the shared stream is max(Tcommon, Tscarce).
    // Different eligible enemy pools require the sum of their waiting times.
    const commonKills = killsUntilDrops(common, commonChance, rng);
    const scarceKills = killsUntilDrops(scarce, scarceChance, rng);
    shared.push(Math.max(commonKills, scarceKills));
    separate.push(commonKills + scarceKills);
  }
  shared.sort((a, b) => a - b);
  separate.sort((a, b) => a - b);
  return {
    trials, seed, common, scarce,
    expectedComponentKills: {
      common: common ? common / commonChance : 0,
      scarce: scarce ? scarce / scarceChance : 0
    },
    sharedPoolKills: quantiles(shared),
    separatePoolKills: quantiles(separate)
  };
}
export function quantileHours(kills, eligibleKillsPerHour) {
  if (!Number.isFinite(eligibleKillsPerHour) || eligibleKillsPerHour <= 0) throw new Error('Bad eligible kill rate');
  return Object.fromEntries(Object.entries(kills).map(([key, value]) =>
    [key, Number((value / eligibleKillsPerHour).toFixed(2))]
  ));
}
export function processingIndex(tierSpecs) {
  const index = new Map();
  for (const tier of tierSpecs) {
    for (const step of tier.processing || []) {
      if (!step.output || index.has(step.output)) throw new Error('Duplicate processing output');
      whole(step.quantity, 'processing output quantity');
      whole(step.seconds, 'processing time', true);
      whole(step.xp, 'processing XP', true);
      if (!step.xpSkill || !step.inputs || !Object.keys(step.inputs).length) {
        throw new Error('Incomplete processing recipe: ' + step.output);
      }
      for (const [id, quantity] of Object.entries(step.inputs)) {
        if (!id) throw new Error('Unnamed processing input');
        whole(quantity, 'processing input');
      }
      index.set(step.output, step);
    }
  }
  return index;
}
export function expandProcessingInputs(craftInputs, index) {
  if (!(index instanceof Map)) throw new Error('A processing index is required');
  const rawInputs = new Map();
  const xpBySkill = new Map();
  const processingBatches = new Map();
  let processingSeconds = 0;
  function visit(id, quantity, ancestors) {
    whole(quantity, 'material quantity', true);
    if (!quantity) return;
    if (ancestors.has(id)) throw new Error('Circular processing dependency: ' + id);
    const step = index.get(id);
    if (!step) {
      rawInputs.set(id, (rawInputs.get(id) || 0) + quantity);
      return;
    }
    const batches = Math.ceil(quantity / step.quantity);
    const next = new Set(ancestors);
    next.add(id);
    processingSeconds += batches * step.seconds;
    xpBySkill.set(step.xpSkill, (xpBySkill.get(step.xpSkill) || 0) + batches * step.xp);
    processingBatches.set(id, (processingBatches.get(id) || 0) + batches);
    for (const [component, count] of Object.entries(step.inputs)) {
      visit(component, batches * count, next);
    }
  }
  for (const entry of craftInputs) {
    if (typeof entry.itemId !== 'string' || !entry.itemId) throw new Error('Missing ingredient ID');
    visit(entry.itemId, entry.quantity, new Set());
  }
  const sorted = map => Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
  return {
    rawInputs: sorted(rawInputs),
    processingBatches: sorted(processingBatches),
    processingXPBySkill: sorted(xpBySkill),
    processingSeconds
  };
}
