"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_QUICK_NAV_DESTINATIONS = exports.QUICK_NAV_DESTINATIONS = void 0;
exports.normalizeQuickNavDestinations = normalizeQuickNavDestinations;
exports.QUICK_NAV_DESTINATIONS = [
    'Home', 'Character', 'World', 'Inventory', 'More', 'Quests', 'Skills', 'Events', 'Friends', 'Guild', 'Settings', 'Social', 'Party',
];
exports.DEFAULT_QUICK_NAV_DESTINATIONS = ['Quests', 'Skills', 'Events', 'Guild', 'Settings'];
const allowed = new Set(exports.QUICK_NAV_DESTINATIONS);
/** Keeps older or malformed saves from producing an incomplete shortcut menu. */
function normalizeQuickNavDestinations(value) {
    if (!Array.isArray(value))
        return [...exports.DEFAULT_QUICK_NAV_DESTINATIONS];
    const unique = [...new Set(value.filter((entry) => typeof entry === 'string' && allowed.has(entry)))];
    return unique.length === 5 ? unique : [...exports.DEFAULT_QUICK_NAV_DESTINATIONS];
}
