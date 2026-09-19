"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const idle_1 = require("../activities/idle");
const quiet_hours_1 = require("../notifications/quiet-hours");
const party_1 = require("../social/party");
const inventory_1 = require("../items/inventory");
const defaults_1 = require("../settings/defaults");
function ok(v, msg) { if (!v)
    throw new Error(msg); }
const idle = (0, idle_1.calculateIdleClaim)({ activityId: 'mine', startedAtMs: 0, lastClaimAtMs: 0, ratePerHour: 100, xpPerHour: 200, maxOfflineHours: 8 }, 10 * 3600 * 1000);
ok(idle.elapsedSec === 8 * 3600, 'offline cap');
ok((0, quiet_hours_1.isQuiet)('23:00', '22:00', '08:00') && !(0, quiet_hours_1.isQuiet)('12:00', '22:00', '08:00'), 'quiet');
ok((0, party_1.composition)([{ characterId: '1', role: 'tank', power: 1, online: true }, { characterId: '2', role: 'damage', power: 1, online: true }, { characterId: '3', role: 'damage', power: 1, online: true }, { characterId: '4', role: 'support', power: 1, online: true }]).standard, 'party');
const inv = (0, inventory_1.grantItems)([], [{ itemId: 'ore', quantity: 120 }], { ore: { id: 'ore', stackable: true, maxStack: 99, tradable: true } }, 10);
ok(inv.length === 2 && inv[1].quantity === 21, 'inventory');
ok(defaults_1.ANDROID_PACKAGE === 'com.elroybenjamins.veldryn', 'package');
ok(defaults_1.DEFAULT_SETTINGS.chat.autoOpen === false, 'chat default');
console.log(JSON.stringify({ ok: true, idle, inventory: inv, package: defaults_1.ANDROID_PACKAGE }));
