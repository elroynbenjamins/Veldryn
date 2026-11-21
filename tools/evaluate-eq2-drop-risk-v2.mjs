#!/usr/bin/env node
/**
 * Offline / review-only EQ2 T1–T4 scarcity stress test.
 * Read-only access to hidden, unmounted Equipment 2.0 draft material files.
 * NO player telemetry, live inventory mutations, loot policy or production writes.
 *
 * Run: node tools/evaluate-eq2-drop-risk-v2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expandProcessingInputs, processingIndex, quantileHours, simulateDropRisk} from './lib/eq2-drop-risk-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const config = JSON.parse(read('docs/equipment-2-0/t1-t4-economy-review-v1.json'));
const draft = JSON.parse(read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json'));
const requireReview = (truth, message) => { if (!truth) throw new Error('EQ2 review failed closed: ' + message); };
requireReview(config.status === 'REVIEW_ONLY_NO_RUNTIME', 'config is not review-only');
requireReview(draft.status === 'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME', 'draft is not review-only');
requireReview(draft.recipes.length === config.expected.recipeRoutes, 'route count drift');

function literalArray(relative, name) {
  const source = read(relative);
  const start = source.indexOf(name);
  const begin = source.indexOf('=[', start);
  const end = source.indexOf('];', begin);
  requireReview(start >= 0 && begin >= 0 && end > begin, 'manifest not pinned: ' + name);
  return JSON.parse(source.slice(begin + 1, end + 1));
}
const sources = [
  ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts', 'V2_SERVER_CORE_PIECES'],
  ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts', 'V2_SERVER_EXPANSION_PIECES'],
  ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts', 'V2_SERVER_ARMAMENT_PIECES']
];
const pieces = sources.flatMap(([file, name]) => literalArray(file, name));
const piecesById = new Map(pieces.map(piece => [piece.id, piece]));
requireReview(pieces.length === config.expected.ordinaryPieces && piecesById.size === pieces.length,
  'piece count / ID uniqueness drift');
const foundation = draft.recipes.filter(recipe => recipe.route === 'foundation');
const allRoutes = new Map();
for (const recipe of draft.recipes) {
  requireReview(recipe.reviewOnly === true, 'executable recipe in review output');
  requireReview(piecesById.has(recipe.pieceId), 'unknown recipe item');
  const tier = config.tierSpecs.find(value => value.tier === recipe.tier);
  requireReview(tier && piecesById.get(recipe.pieceId).tier === tier.tier, 'tier mismatch');
  const common = recipe.inputs.find(input => input.itemId === tier.items.common)?.quantity || 0;
  const rare = recipe.inputs.find(input => input.itemId === tier.items.rare)?.quantity || 0;
  requireReview(common >= 2, 'ordinary equipment bypasses combat material');
  requireReview(rare === (tier.rareBySlot[piecesById.get(recipe.pieceId).slot] || 0),
    'scarce material slot-policy mismatch');
  const existing = allRoutes.get(recipe.pieceId) || [];
  existing.push(recipe);
  allRoutes.set(recipe.pieceId, existing);
}
requireReview(allRoutes.size === pieces.length && foundation.length === pieces.length,
  'one foundation per item required');
for (const [pieceId, routes] of allRoutes) {
  requireReview(routes.length === 2 && new Set(routes.map(value => value.route)).size === 2,
    'foundation/alternate mismatch: ' + pieceId);
  const tier = config.tierSpecs.find(value => value.tier === routes[0].tier);
  for (const id of [tier.items.common, tier.items.rare, tier.items.binder]) {
    const count = recipe => recipe.inputs.find(value => value.itemId === id)?.quantity || 0;
    requireReview(count(routes[0]) === count(routes[1]), 'alternate bypass: ' + pieceId);
  }
  for (const field of ['gold','xp','seconds','characterLevel','professionLevel']) {
    requireReview(routes[0][field] === routes[1][field], 'legacy price/time/level drift: ' + pieceId);
  }
}
const allSlots = ['helmet','chest','gloves','legs','boots','cape','amulet','ring','weapon','offhand'];
const processing = processingIndex(config.tierSpecs);
const qty = (recipe, id) => recipe.inputs.find(input => input.itemId === id)?.quantity || 0;
const count = (recipes, id) => recipes.reduce((sum, recipe) => sum + qty(recipe, id), 0);
function combinedInputs(recipes, attempts) {
  const inputs = new Map();
  for (const recipe of recipes) {
    for (const entry of recipe.inputs) {
      inputs.set(entry.itemId, (inputs.get(entry.itemId) || 0) + entry.quantity * attempts);
    }
  }
  return [...inputs].map(([itemId, quantity]) => ({itemId, quantity}));
}
function profile(tier, recipes, label) {
  const commonPerAttempt = count(recipes, tier.items.common);
  const scarcePerAttempt = count(recipes, tier.items.rare);
  return {
    selection: label, itemsPerAttempt: recipes.length,
    commonPerAttempt, scarcePerAttempt,
    attempts: [1,3,5,10].map(attempts => {
      const risk = simulateDropRisk({
        common: commonPerAttempt * attempts,
        scarce: scarcePerAttempt * attempts,
        commonChance: tier.drops.commonKill,
        scarceChance: tier.drops.scarceKill,
        trials: 4096,
        seed: 20261121 + tier.tier * 1000 + attempts * 13 + (label === 'ten-slot-tank-example' ? 7 : 0)
      });
      return {
        attempts,
        copies: recipes.length * attempts,
        common: risk.common,
        scarce: risk.scarce,
        expectedComponentKills: risk.expectedComponentKills,
        sharedEligibleEnemies: {
          kills: risk.sharedPoolKills,
          hoursAt150: quantileHours(risk.sharedPoolKills, 150),
          hoursAt300: quantileHours(risk.sharedPoolKills, 300),
          hoursAt900: quantileHours(risk.sharedPoolKills, 900)
        },
        disjointEligibleEnemies: {
          kills: risk.separatePoolKills,
          hoursAt150: quantileHours(risk.separatePoolKills, 150),
          hoursAt300: quantileHours(risk.separatePoolKills, 300),
          hoursAt900: quantileHours(risk.separatePoolKills, 900)
        },
        // This is a bill of materials; NOT a claim that these EQ2 sources exist live.
        processingAndRawInputs: attempts === 1
          ? expandProcessingInputs(combinedInputs(recipes, attempts), processing)
          : undefined
      };
    })
  };
}
const tiers = config.tierSpecs.map(tier => {
  const candidates = foundation.filter(value => value.tier === tier.tier);
  const chest = candidates.find(value =>
    piecesById.get(value.pieceId)?.slot === 'chest' && piecesById.get(value.pieceId)?.role === 'tank');
  requireReview(chest, 'missing tank chest for tier ' + tier.tier);
  const gear = allSlots.map(slot => {
    const pinned = slot === 'weapon' ? 'EQ2_WEAPON_T' + tier.tier + '_IRONWARDEN'
      : slot === 'offhand' ? 'EQ2_OFFHAND_T' + tier.tier + '_IRONWARDEN' : null;
    const found = candidates.find(value => pinned ? value.pieceId === pinned
      : piecesById.get(value.pieceId)?.slot === slot && piecesById.get(value.pieceId)?.role === 'tank');
    requireReview(found, 'missing illustrative tank loadout ' + tier.tier + ' ' + slot);
    return found;
  });
  requireReview(new Set(gear.map(value => value.pieceId)).size === allSlots.length,
    'duplicate tank-slot loadout');
  return {
    tier: tier.tier, name: tier.name, canonicalOrdinaryItems: candidates.length,
    dropOddsPerEligibleNormalKill: tier.drops,
    chest: profile(tier, [chest], 'tank-chest'),
    illustrativeLoadout: profile(tier, gear, 'ten-slot-tank-example')
  };
});
console.log(JSON.stringify({
  status: 'REVIEW_ONLY_NO_RUNTIME',
  source: 'EQ2 hidden 169-item catalogue and 338 generated draft methods',
  methodology: '4096 deterministic inverse-geometric waiting-time trials per scenario; nearest-rank P50/P90/P95',
  limitations: [
    'Provisional drop odds apply to eligible normal kills only, not to all encounters',
    'Same-source and disjoint-source cases are separate scenario bounds; actual source overlap is unverified',
    'No elite frequency, pity mechanic, enemy availability, gathering rate, Gold, Forge or Market supply included',
    'Even the processing input bill can reference not-yet-implemented EQ2 items and gathering nodes',
    'Ten-slot tank loadout is not a ten-piece set; repeat attempts mean rerolls for equipment',
    'No balancing change is applied to the game and no UI review approval is implied'
  ],
  tiers
}, null, 2));
