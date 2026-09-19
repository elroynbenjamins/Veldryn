"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.craftingScreenModelV32 = craftingScreenModelV32;
const equipment_crafting_v31_1 = require("./equipment-crafting-v31");
function craftingScreenModelV32(p) { const requirements = p.blockers.map(b => ({ key: b.key, label: b.label, progressLabel: `Need ${b.missing}`, state: b.kind === 'skill' || b.kind === 'character_level' || b.kind === 'recipe_unlock' ? 'blocked' : 'missing', source: b.source, actionLabel: (0, equipment_crafting_v31_1.sourceActionLabelV31)(b.action) })); const queue = p.steps.map((s, i) => ({ id: s.id, label: `${s.label}${s.quantity > 1 ? ` ×${s.quantity}` : ''}`, kind: s.kind, status: s.status === 'blocked' ? 'blocked' : 'pending', timeLabel: `${Math.ceil(s.seconds / 60)}m`, dependencyCount: s.dependsOn.length })); return { header: p.detail, requirements, queue, pve: p.pve, sections: ['Result', 'Requirements', 'Crafting chain', 'Sources', 'Set / Skin'] }; }
