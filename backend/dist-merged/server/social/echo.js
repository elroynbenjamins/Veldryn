"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freezeEcho = freezeEcho;
exports.echoEligible = echoEligible;
function freezeEcho(s) { return Object.freeze({ ...s, preferences: Object.freeze({ ...s.preferences }) }); }
function echoEligible(s, currentContentVersion) { return s.contentVersion === currentContentVersion && s.profileVersion > 0 && !!s.loadoutHash; }
