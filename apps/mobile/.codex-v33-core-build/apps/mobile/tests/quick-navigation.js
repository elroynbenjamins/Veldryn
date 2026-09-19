"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quick_navigation_1 = require("../src/core/quick-navigation");
const game_1 = require("../src/core/game");
const save_normalization_1 = require("../src/core/save-normalization");
const custom = ['Character', 'Skills', 'World', 'Inventory', 'Account'];
const state = (0, game_1.newGame)(0);
if (state.settings.quickNavDestinations?.join(',') !== quick_navigation_1.DEFAULT_QUICK_NAV_DESTINATIONS.join(','))
    throw new Error('New saves must receive five default shortcuts');
if ((0, quick_navigation_1.normalizeQuickNavDestinations)(custom).join(',') !== custom.join(','))
    throw new Error('Valid custom shortcut order must be preserved');
if ((0, quick_navigation_1.normalizeQuickNavDestinations)(['Unknown', 'Unknown', 'Unknown']).join(',') !== 'Empty,Empty,Empty,Empty,Empty')
    throw new Error('Malformed shortcut data must be normalized safely');
const legacy = JSON.parse(JSON.stringify(state));
delete legacy.settings.quickNavDestinations;
if ((0, save_normalization_1.normalizeSave)(legacy).settings.quickNavDestinations?.length !== 5)
    throw new Error('Older saves must be upgraded with five shortcuts');
console.log('PASS: quick navigation defaults, customization order and legacy-save normalization are stable');
