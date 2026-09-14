"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realCoopEntrySource = void 0;
const coop_client_1 = require("./coop-client");
exports.realCoopEntrySource = { kind: 'real', load: () => coop_client_1.coopClient.entry() };
