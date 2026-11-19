"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompanionAffinityRequirements = validateCompanionAffinityRequirements;
const companion_affinity_catalog_1 = require("../../shared/companion-affinity-catalog");
const companionAffinity = (def) => def.affinity ?? (0, companion_affinity_catalog_1.companionAffinityById)(def.id);
const companionAffinityDiversity = (defs) => new Set(defs.map(companionAffinity)).size;
function validateCompanionAffinityRequirements(defs, requirements) {
    for (const req of requirements) {
        if (req.type === 'affinity_count' && defs.filter(def => companionAffinity(def) === req.affinity).length < req.count)
            return { ok: false, reason: `mission_requires_${req.affinity}_affinity` };
        if (req.type === 'affinity_diversity' && companionAffinityDiversity(defs) < req.count)
            return { ok: false, reason: 'mission_requires_affinity_diversity' };
        if (req.type === 'affinity_unique' && companionAffinityDiversity(defs) < defs.length)
            return { ok: false, reason: 'mission_requires_unique_affinities' };
    }
    return { ok: true };
}
