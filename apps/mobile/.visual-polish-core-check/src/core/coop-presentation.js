"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoopRunView = validateCoopRunView;
exports.liveAffordances = liveAffordances;
function validateCoopRunView(view) {
    if (view.roleSlots.length !== 4 || view.roleSlots.filter(slot => slot.role === 'tank').length !== 1 || view.roleSlots.filter(slot => slot.role === 'damage').length !== 2 || view.roleSlots.filter(slot => slot.role === 'support').length !== 1)
        throw new Error('invalid_role_slots');
    if (!Number.isInteger(view.syncedLevel) || view.syncedLevel < 1 || view.roleSlots.some(slot => !slot.name.trim()))
        throw new Error('invalid_run_summary');
    if (view.options.length > 0 && view.options.length < 3)
        throw new Error('insufficient_route_options');
    if (new Set(view.options.map(option => option.nodeId)).size !== view.options.length || view.options.some(option => !option.nodeId.trim() || !option.title.trim() || !option.kind.trim() || !option.risk.trim() || !option.reward.trim()))
        throw new Error('invalid_route_options');
    if (view.mode === 'qmode' && view.options.some(option => option.votes !== undefined))
        throw new Error('qmode_cannot_show_votes');
}
function liveAffordances(mode) { return mode === 'live' ? { ready: true, votes: true, chat: true } : { ready: false, votes: false, chat: false }; }
