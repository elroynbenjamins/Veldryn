"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realCoopEntrySource = void 0;
const coop_client_1 = require("./coop-client");
const coop_qmode_1 = require("../core/coop-qmode");
exports.realCoopEntrySource = { kind: 'real', load: async () => { const entry = await coop_client_1.coopClient.entry(); return { ...entry, activeRun: entry.activeRunProjection ? (0, coop_qmode_1.presentQModeRun)(entry.activeRunProjection) : entry.activeRun }; } };
