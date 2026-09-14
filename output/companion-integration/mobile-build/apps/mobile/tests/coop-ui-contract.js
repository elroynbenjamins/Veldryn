"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_ui_contract_1 = require("../src/core/coop-ui-contract");
function equal(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`${message}: ${JSON.stringify(actual)}`);
}
equal(coop_ui_contract_1.COOP_PRIMARY_TABS, ['Home', 'Character', 'World', 'Inventory', 'More'], 'primary tab contract changed');
equal(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS.length, 28, 'ready asset count changed');
equal(new Set(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS).size, 28, 'ready asset IDs must be unique');
equal(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS.filter(id => id.startsWith('node_')).length, 10, 'node tile count changed');
equal(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS.filter(id => id.startsWith('role_')).length, 3, 'role tile count changed');
equal(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS.filter(id => id.startsWith('boon_')).length, 3, 'boon tile count changed');
equal(coop_ui_contract_1.COOP_UI_READY_ASSET_IDS.filter(id => id.startsWith('skill_')).length, 4, 'skill tile count changed');
equal((0, coop_ui_contract_1.isCoopUiAssetId)('rootbound_hero'), true, 'known ready asset rejected');
equal((0, coop_ui_contract_1.isCoopUiAssetId)('tank_portrait'), false, 'prototype portrait entered ready registry');
equal((0, coop_ui_contract_1.isCoopUiAssetId)('nav_world'), false, 'prototype navigation tile entered ready registry');
console.log('co-op UI contract OK');
