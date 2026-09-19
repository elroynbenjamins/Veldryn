"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadyCheckService = exports.MemoryReadyCheckRepository = void 0;
exports.freezeCommittedReadyRoster = freezeCommittedReadyRoster;
const config_1 = require("./config");
const invariants_1 = require("./invariants");
const loadout_snapshots_1 = require("./loadout-snapshots");
function freezeCommittedReadyRoster(check, minLevel, syncLevel, repository) {
    if (check.status !== 'committed' || !check.roster.every(member => check.accepts[member.accountId]))
        throw new Error('ready_check_not_committed');
    return (0, loadout_snapshots_1.freezeCoopRosterAtCommit)({ minLevel, syncLevel, repository, selections: check.roster.map(member => ({ accountId: member.accountId, characterId: member.characterId, loadoutId: member.loadoutId, expectedRevision: member.loadoutRevision, queuedSnapshotHash: member.loadoutSnapshotHash })) });
}
class MemoryReadyCheckRepository {
    checks = new Map();
    save(check) { this.checks.set(check.id, structuredClone(check)); }
    get(id) { const check = this.checks.get(id); return check ? structuredClone(check) : undefined; }
}
exports.MemoryReadyCheckRepository = MemoryReadyCheckRepository;
class ReadyCheckService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    open(id, partyId, rosterRevision, roster, nowMs) {
        if (roster.length !== 4 || new Set(roster.map(member => member.accountId)).size !== 4 || !(0, invariants_1.hasExactCoopRoles)(roster.map(member => member.role)))
            throw new Error('invalid_ready_roster');
        const check = { id, partyId, rosterRevision, roster: structuredClone(roster), accepts: {}, status: 'open', openedAtMs: nowMs, closesAtMs: nowMs + config_1.COOP_ROGUELITE_CONFIG.readyCheckMs };
        this.repository.save(check);
        return check;
    }
    respond(id, rosterRevision, accountId, accept, nowMs) {
        const check = this.required(id);
        if (check.rosterRevision !== rosterRevision)
            throw new Error('stale_ready_roster');
        if (check.status !== 'open')
            throw new Error('ready_check_closed');
        if (nowMs >= check.closesAtMs) {
            this.fail(check, nowMs);
            throw new Error('ready_check_closed');
        }
        if (!check.roster.some(member => member.accountId === accountId))
            throw new Error('not_ready_member');
        if (!accept) {
            this.fail(check, nowMs, accountId);
            return this.required(id);
        }
        check.accepts[accountId] = true;
        if (check.roster.every(member => check.accepts[member.accountId]))
            check.status = 'committed';
        this.repository.save(check);
        return structuredClone(check);
    }
    timeout(id, nowMs) { const check = this.required(id); if (check.status !== 'open')
        return check; if (nowMs < check.closesAtMs)
        throw new Error('ready_deadline_not_reached'); this.fail(check, nowMs); return this.required(id); }
    cancel(id, accountId, nowMs) { const check = this.required(id); if (check.status === 'committed')
        throw new Error('run_already_committed'); if (check.status !== 'open')
        throw new Error('ready_check_closed'); this.fail(check, nowMs, accountId); return this.required(id); }
    refill(id, newId, replacement, nowMs) {
        const prior = this.required(id);
        if (prior.status !== 'refilling')
            throw new Error('not_refilling');
        if (nowMs - (prior.refillStartedAtMs ?? nowMs) >= config_1.COOP_ROGUELITE_CONFIG.reconnectGraceMs) {
            prior.status = 'requeued';
            this.repository.save(prior);
            throw new Error('refill_window_expired');
        }
        const retained = prior.roster.filter(member => prior.accepts[member.accountId]);
        const roster = [...retained, replacement];
        if (roster.length !== 4)
            throw new Error('replacement_does_not_complete_roster');
        return this.open(newId, prior.partyId, prior.rosterRevision + 1, roster, nowMs);
    }
    fail(check, nowMs, explicitAccountId) {
        const failed = new Set(explicitAccountId ? [explicitAccountId] : check.roster.filter(member => !check.accepts[member.accountId]).map(member => member.accountId));
        check.roster = check.roster.filter(member => !failed.has(member.accountId));
        check.status = 'refilling';
        check.refillStartedAtMs = check.refillStartedAtMs ?? nowMs;
        this.repository.save(check);
    }
    required(id) { const check = this.repository.get(id); if (!check)
        throw new Error('ready_check_not_found'); return check; }
}
exports.ReadyCheckService = ReadyCheckService;
