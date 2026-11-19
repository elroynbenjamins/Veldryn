"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectLiveDungeonMatch = selectLiveDungeonMatch;
exports.selectReplacement = selectReplacement;
const live_dungeon_policy_1 = require("./live-dungeon-policy");
function oldestFirst(a, b) { return a.queuedAtMs - b.queuedAtMs || a.ticketId.localeCompare(b.ticketId); }
function selectLiveDungeonMatch(candidates, nowMs) {
    const valid = candidates.filter(c => (0, live_dungeon_policy_1.validateLoadoutRole)(c).valid).sort(oldestFirst);
    const tanks = valid.filter(x => x.role === 'tank'), supports = valid.filter(x => x.role === 'support'), damage = valid.filter(x => x.role === 'damage');
    for (const tank of tanks)
        for (const support of supports) {
            if (tank.accountId === support.accountId)
                continue;
            const ds = damage.filter(d => d.accountId !== tank.accountId && d.accountId !== support.accountId);
            for (let i = 0; i < ds.length; i++)
                for (let j = i + 1; j < ds.length; j++) {
                    const group = [tank, ds[i], ds[j], support];
                    if (new Set(group.map(x => x.accountId)).size !== 4)
                        continue;
                    if (!(0, live_dungeon_policy_1.validateStrictComposition)(group.map(x => x.role)).valid)
                        continue;
                    let compatible = true;
                    for (let a = 0; a < group.length; a++)
                        for (let b = a + 1; b < group.length; b++) {
                            const aw = Math.max(0, (nowMs - group[a].queuedAtMs) / 1000), bw = Math.max(0, (nowMs - group[b].queuedAtMs) / 1000);
                            if (!(0, live_dungeon_policy_1.areTicketsCompatible)(group[a], group[b], aw, bw)) {
                                compatible = false;
                                break;
                            }
                        }
                    if (compatible)
                        return { selected: group };
                }
        }
    return { selected: [], reason: 'no_compatible_1t2d1s_group' };
}
function selectReplacement(input) {
    const synthetic = { accountId: '__reference__', characterId: '__reference__', classId: 'reference', role: input.role, combatLevel: Math.max(1, input.referenceCombatLevel), powerIndex: input.referencePower, tankScore: 1, supportScore: 1, loadoutVersion: 1, contentId: input.contentId };
    return input.candidates.filter(c => c.role === input.role && c.contentId === input.contentId && !input.existingAccountIds.includes(c.accountId) && (0, live_dungeon_policy_1.validateLoadoutRole)(c).valid)
        .sort(oldestFirst).find(c => (0, live_dungeon_policy_1.areTicketsCompatible)(c, synthetic, Math.max(0, (input.nowMs - c.queuedAtMs) / 1000), 120));
}
