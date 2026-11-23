/**
 * Veldryn Equipment 2.0 dungeon loot reviewer — READ-ONLY.
 *
 * This is NOT a loot table, reward issuer, Market admission API, RNG, release
 * toggle or backend authority. It never generates coins/items or writes data.
 * Boss completion eligibility and proof of a real exact-copy EQ2 mint must be
 * enforced in separately approved authoritative gameplay + PostgreSQL custody.
 */

function reject(message) { throw new Error('Review-only pool error: ' + message); }

export function reviewDungeonPoolV5(data, dungeonId, bossName) {
  if (data?.schema !== 'eq2-dungeon-boss-drop-source-and-market-readiness-review-v5') reject('unrecognized schema');
  if (data?.status !== 'REVIEW_ONLY_NO_LIVE_CATALOGUE_SOURCE_OR_LOOT_MARKET_AUTHORITY') reject('unexpected review status');
  if (data?.releaseActivation === true || data?.serverRegistration === true || data?.marketRegistered === true) reject('no runtime authority');
  const dungeon = data.bossPools.find(d => d.dungeonId === dungeonId);
  if (!dungeon || dungeon.registered || dungeon.returnableByRuntime) reject('dungeon not a gated preview');
  const boss = dungeon.bosses.find(b => b.bossName === bossName);
  if (!boss || boss.noCrossBossLoot !== true) reject('wrong frozen boss variant');
  const entries = [];
  const ids = new Set();
  let pctTotal = 0;
  for (const category of boss.categoryWeights) {
    if (!Number.isInteger(category.weightPct) || category.weightPct <= 0 || category.weightPct > 100) reject('invalid category weight');
    if (!Array.isArray(category.itemIds) || category.itemIds.length === 0) reject('empty category');
    pctTotal += category.weightPct;
    for (const itemId of category.itemIds) {
      if (typeof itemId !== 'string' || !itemId.startsWith('EQ2_DUNGEON_') || ids.has(itemId)) reject('duplicate or unsafe item');
      ids.add(itemId);
      entries.push({itemId, category: category.type, categoryWeightPct: category.weightPct, categorySize: category.itemIds.length});
    }
  }
  if (pctTotal !== 100 || ids.size !== boss.poolItemCount) reject('incomplete or non-normalized boss pool');
  return Object.freeze({dungeonId, bossName, poolSize: ids.size, entries: entries.map(x=>Object.freeze(x))});
}

export function previewItemOddsV5(data, dungeonId, bossName, anyGearDropRatePct) {
  if (!Number.isFinite(anyGearDropRatePct) || anyGearDropRatePct < 0 || anyGearDropRatePct > 100) reject('invalid drop percentage');
  const pool = reviewDungeonPoolV5(data, dungeonId, bossName);
  return pool.entries.map(item=>{
    const conditionalOnThisBossAndGearDropPct = item.categoryWeightPct / item.categorySize;
    const perEligibleRunForFrozen50_50BossPct = (anyGearDropRatePct / 2) * conditionalOnThisBossAndGearDropPct / 100;
    const conditionalGivenThisBossPct = anyGearDropRatePct * conditionalOnThisBossAndGearDropPct / 100;
    return {itemId:item.itemId,category:item.category,bossName,conditionalGivenThisBossPct,perEligibleRunForFrozen50_50BossPct};
  });
}

export function previewExpectedGearV5(eligibleSuccessfulBossClaims, anyGearDropRatePct) {
  if (!Number.isInteger(eligibleSuccessfulBossClaims) || eligibleSuccessfulBossClaims < 0) reject('invalid source claim count');
  if (!Number.isFinite(anyGearDropRatePct) || anyGearDropRatePct < 0 || anyGearDropRatePct > 100) reject('invalid drop percentage');
  return eligibleSuccessfulBossClaims * anyGearDropRatePct / 100;
}

export function inspectProposedMarketProofShapeV5(proof) {
  // Shape is NEVER authority: even all fields present requires server checking
  // committed database mint, immutable boss receipt, locks, custody and escrow.
  const keys = ['mintGeneration', 'originalBossClaimReceiptId', 'originalDungeonId', 'originalBossId',
    'physicalInstanceId', 'canonicalTemplateId', 'originalOwnerId', 'currentOwnerId',
    'equipmentRollSnapshotId', 'custodyRevision', 'marketListingLock'];
  const missing = keys.filter(k=> proof == null || typeof proof[k] === 'undefined' || proof[k] === null || proof[k] === '');
  const generationEligibleByShape = proof?.mintGeneration === 'equipment_2_0';
  const sourceEligibleByShape = proof?.originalMintSource === 'authenticated_dungeon_boss_victory';
  return Object.freeze({
    missingFields: missing,
    appearsStructurallyComplete: missing.length === 0 && generationEligibleByShape && sourceEligibleByShape,
    // Never used as a gate; client fields cannot prove backend authenticity.
    marketAuthorized: false,
    reason: 'REQUIRES_NEW_SERVER_DB_PROOF_AND_ATOMIC_CUSTODY_ADAPTER_NOT_IMPLEMENTED'
  });
}
