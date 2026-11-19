"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pieceStatBudgetV23 = pieceStatBudgetV23;
exports.upgradeStatMultiplierV23 = upgradeStatMultiplierV23;
const TIER_BASE = { T1: 12, T2: 20, T3: 31, T4: 44, T5: 62, T6: 83, T7: 108, T8: 138, T9: 172 };
const SLOT = { Gloves: .70, Boots: .75, Helmet: .85, Legs: 1, Chest: 1.20, 'Off-hand': 1.15, Weapon: 1.35 };
const STAT_KEY = { 'Max HP': 'maxHp', 'Power': 'power', 'Armor': 'armor', 'Ward': 'ward', 'Accuracy': 'accuracy', 'Evasion': 'evasion', 'Crit Rate': 'critRate', 'Crit Damage': 'critDamage', 'Haste': 'haste', 'Tenacity': 'tenacity', 'Penetration': 'penetration', 'Potency': 'potency' };
const UNIT = { maxHp: 8, power: 1, armor: 1, ward: 1, accuracy: 1, evasion: 1, critRate: .03, critDamage: .12, haste: .04, tenacity: .04, penetration: 1, potency: .04 };
const key = (s) => STAT_KEY[s] ?? (() => { throw new Error(`unknown_stat:${s}`); })();
function pieceStatBudgetV23(piece, tertiaryStat) {
    const base = TIER_BASE[piece.tier], slotBudget = base * (SLOT[piece.slot] ?? 1);
    const shares = [.55, .30, .15];
    const stats = [piece.primaryStat, piece.secondaryStat, tertiaryStat];
    const lines = stats.map((s, i) => { const stat = key(s); const budget = slotBudget * shares[i]; return { stat, budget: Number(budget.toFixed(3)), value: Number((budget * UNIT[stat]).toFixed(3)) }; });
    return { pieceId: piece.id, baseBudget: base, slotBudget: Number(slotBudget.toFixed(3)), lines };
}
function upgradeStatMultiplierV23(rank) { if (!Number.isInteger(rank) || rank < 0 || rank > 10)
    throw new Error('bad_upgrade_rank'); return Number((1 + rank * .04 + Math.max(0, rank - 5) * .01).toFixed(3)); }
