"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArenaHttpApplication = void 0;
const arena_api_contracts_1 = require("./arena-api-contracts");
/** Framework-neutral authenticated boundary. The caller supplies only verified identity and server time. */
class ArenaHttpApplication {
    arena;
    constructor(arena) {
        this.arena = arena;
    }
    verified(accountId, nowMs) { if (typeof accountId !== 'string' || accountId.trim().length < 1 || accountId.length > 128)
        throw new Error('invalid_authenticated_account'); if (!Number.isSafeInteger(nowMs) || nowMs < 0)
        throw new Error('invalid_server_time'); return accountId.trim(); }
    entry(accountId, nowMs) { return this.arena.entry(...this.verifiedArgs(accountId, nowMs)); }
    publishDefense(accountId, body, nowMs) { const [id, time] = this.verifiedArgs(accountId, nowMs); return this.arena.publishDefense(id, { ...(0, arena_api_contracts_1.parseArenaPublishRequest)(body), nowMs: time }); }
    opponents(accountId, body, nowMs) { const [id, time] = this.verifiedArgs(accountId, nowMs); return this.arena.opponents(id, { ...(0, arena_api_contracts_1.parseArenaOpponentRequest)(body), nowMs: time }); }
    startMatch(accountId, body, nowMs) { const [id, time] = this.verifiedArgs(accountId, nowMs); return this.arena.startMatch(id, { ...(0, arena_api_contracts_1.parseArenaStartRequest)(body), nowMs: time }); }
    history(accountId, limit = 20) { return this.arena.history(this.verified(accountId, Date.now()), limit); }
    claimReward(accountId, entitlementId, body, nowMs) { const [id, time] = this.verifiedArgs(accountId, nowMs); if (typeof entitlementId !== 'string' || entitlementId.trim().length < 1 || entitlementId.length > 128)
        throw new Error('invalid_entitlement_id'); return this.arena.claimReward(id, entitlementId.trim(), (0, arena_api_contracts_1.parseArenaClaimRequest)(body).requestId, time); }
    verifiedArgs(accountId, nowMs) { return [this.verified(accountId, nowMs), nowMs]; }
}
exports.ArenaHttpApplication = ArenaHttpApplication;
