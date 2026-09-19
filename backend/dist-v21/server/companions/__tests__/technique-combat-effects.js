"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("node:assert/strict"));
const engine_1 = require("../../combat/engine");
const combat_adapter_1 = require("../combat-adapter");
const character_assist_1 = require("../character-assist");
const actor = (id, team) => ({ id, name: id, team, role: team === 'players' ? 'damage' : 'enemy', level: 20, stats: { maxHp: 100, attackPower: 100, healingPower: 100, defense: 0, accuracy: 100000, evasion: 0, critChance: 0, critMultiplier: 1, haste: 0 }, basicAttackMs: 1000, basicAttackCoeff: 0, abilities: [] });
const player = actor('player', 'players'), enemy = actor('enemy', 'enemies');
player.abilities = [{ id: 'execute', name: 'Execute', cooldownMs: 1000, castTimeMs: 0, target: 'current_target', effects: [{ kind: 'damage', coeff: .1, executeBelowHpPct: .3, executeBonus: .5 }], priority: 1 }];
const execute = (0, engine_1.simulateCombat)({ seed: 'execute-effects', players: [player], enemies: [enemy], maxDurationMs: 20000 });
const damage = execute.events.filter(e => e.abilityId === 'execute' && e.type === 'damage');
assert.ok(damage[0].amount < 11, 'execute must not boost a healthy target');
assert.ok(damage.some(e => e.amount > 14), 'execute must actually boost low-HP damage');
const defender = actor('defender', 'players');
defender.abilities = [{ id: 'reflect', name: 'Reflect', cooldownMs: 100000, castTimeMs: 0, target: 'self', effects: [{ kind: 'shield', flat: 40, shieldReflectPct: .2 }], priority: 1 }];
enemy.basicAttackCoeff = .2;
const reflected = (0, engine_1.simulateCombat)({ seed: 'reflection-effects', players: [defender], enemies: [enemy], maxDurationMs: 15000 });
const hits = reflected.events.filter(e => e.abilityId === 'COMPANION_REFLECT');
assert.ok(hits.length > 0, 'absorbed damage must reflect');
assert.ok(hits.reduce((s, e) => s + (e.amount ?? 0), 0) <= 8.02, 'reflection cannot outlive its 40-HP shield');
const p = { companionId: 'UNIT_002', level: 20, xp: 0, ascensionTier: 2, bondLevel: 10, bondXp: 2520, bondTraitUnlocked: true, selectedTechniqueId: 'UNIT_002_REFLECTIVE' };
assert.equal((0, combat_adapter_1.buildOwnedCompanionCombatant)(p, { mode: 'companion_trial' }).abilities[0].effects[0].shieldReflectPct, .12);
const owner = { ...actor('owner', 'players'), classId: 'WAYFINDER' };
assert.equal((0, character_assist_1.applyCharacterCompanionAssist)(owner, p).abilities[0].effects[0].shieldReflectPct, .12);
const d = { ...p, companionId: 'UNIT_001', selectedTechniqueId: 'UNIT_001_EXECUTIONER' };
assert.equal((0, character_assist_1.applyCharacterCompanionAssist)({ ...owner, classId: 'IRONWARDEN', role: 'tank' }, d).abilities[0].effects[0].executeBonus, .10);
console.log('PASS actual execute damage, finite shield reflection, Trial and co-op technique effects');
