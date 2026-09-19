"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_QUICK_NAV_DESTINATIONS = exports.QUICK_NAV_DESTINATIONS = void 0;
exports.normalizeQuickNavDestinations = normalizeQuickNavDestinations;
exports.QUICK_NAV_DESTINATIONS = [
    'Home', 'Character', 'Skills', 'World', 'Inventory', 'Account', 'More', 'Guild', 'Dungeon', 'Quests', 'Companions', 'Events', 'Friends', 'Settings', 'Social', 'Party', 'Empty',
];
exports.DEFAULT_QUICK_NAV_DESTINATIONS = ['Guild', 'Dungeon', 'Character', 'Quests', 'Empty'];
const allowed = new Set(exports.QUICK_NAV_DESTINATIONS);
function normalizeQuickNavDestinations(value) {
    if (!Array.isArray(value))
        return [...exports.DEFAULT_QUICK_NAV_DESTINATIONS];
    const cleaned = value.map(v => typeof v === 'string' && allowed.has(v) ? v : 'Empty');
    while (cleaned.length < 5)
        cleaned.push('Empty');
    return cleaned.slice(0, 5);
}
