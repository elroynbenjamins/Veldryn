"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCentralResetTick = runCentralResetTick;
function pad(n) { return String(n).padStart(2, '0'); }
function periodKeyForDue(def, due) {
    if (def.cadence === 'monthly')
        return `${due.getUTCFullYear()}-${pad(due.getUTCMonth() + 1)}`;
    return due.toISOString().slice(0, 10);
}
function mostRecentDue(def, now) {
    const h = def.utc_hour || 0, m = def.utc_minute || 0;
    let due;
    if (def.cadence === 'daily') {
        due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m));
        if (due > now)
            due.setUTCDate(due.getUTCDate() - 1);
        return due;
    }
    if (def.cadence === 'weekly') {
        const target = def.day_of_week ?? 1;
        const diff = (now.getUTCDay() - target + 7) % 7;
        due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff, h, m));
        if (due > now)
            due.setUTCDate(due.getUTCDate() - 7);
        return due;
    }
    const day = Math.max(1, Math.min(28, def.day_of_month ?? 1));
    due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, h, m));
    if (due > now)
        due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, h, m));
    return due;
}
function advanceDue(def, due) {
    if (def.cadence === 'daily')
        return new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1, def.utc_hour || 0, def.utc_minute || 0));
    if (def.cadence === 'weekly')
        return new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 7, def.utc_hour || 0, def.utc_minute || 0));
    return new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, Math.max(1, Math.min(28, def.day_of_month ?? 1)), def.utc_hour || 0, def.utc_minute || 0));
}
function runsToEnqueue(def, now) {
    const latest = mostRecentDue(def, now);
    if (def.catch_up_policy === 'latest_only' || !def.next_due_at)
        return [{ dueAt: latest.toISOString(), periodKey: periodKeyForDue(def, latest) }];
    let cursor = new Date(def.next_due_at);
    if (Number.isNaN(cursor.getTime()))
        cursor = latest;
    if (def.catch_up_policy === 'skip_missed')
        return [];
    const out = [];
    const max = Math.max(1, Math.min(31, Number(def.max_catchup_runs || 1)));
    while (cursor <= now && out.length < max) {
        out.push({ dueAt: cursor.toISOString(), periodKey: periodKeyForDue(def, cursor) });
        cursor = advanceDue(def, cursor);
    }
    return out;
}
async function runCentralResetTick(repo, handlers, now = new Date()) {
    const definitions = await repo.listEnabledDefinitions();
    for (const def of definitions) {
        if (def.catch_up_policy === 'skip_missed' && def.next_due_at && Date.parse(def.next_due_at) <= now.getTime()) {
            let cursor = new Date(def.next_due_at);
            while (cursor <= now)
                cursor = advanceDue(def, cursor);
            await repo.updateDefinitionNextDue(def.reset_key, cursor.toISOString());
            continue;
        }
        for (const due of runsToEnqueue(def, now))
            await repo.enqueueRun({ resetKey: def.reset_key, periodKey: due.periodKey, dueAt: due.dueAt });
    }
    const runs = await repo.claimRuns(20);
    const defMap = new Map(definitions.map(d => [d.reset_key, d]));
    const results = [];
    for (const run of runs) {
        const def = defMap.get(run.reset_key);
        const handler = def ? handlers[def.handler_key] : undefined;
        try {
            if (!def || !handler)
                throw new Error(`reset_handler_missing:${run.reset_key}`);
            const result = await handler({ resetKey: run.reset_key, periodKey: run.period_key, dueAt: run.due_at });
            const next = advanceDue(def, new Date(run.due_at)).toISOString();
            await repo.markSucceeded(run.id, result);
            await repo.markDefinitionSuccess(run.reset_key, run.period_key, new Date().toISOString(), next);
            results.push({ id: run.id, ok: true });
        }
        catch (error) {
            const attempts = Number(run.attempts || 0);
            const dead = attempts >= 5;
            const retryAt = new Date(Date.now() + Math.min(3600000, Math.max(60000, 2 ** attempts * 30000))).toISOString();
            await repo.markFailed(run.id, error instanceof Error ? error.message : String(error), retryAt, dead);
            results.push({ id: run.id, ok: false, dead });
        }
    }
    return { enqueuedDefinitions: definitions.length, processed: runs.length, results };
}
/** Required handlers in v17.2:
 * daily_world_reset: only systems explicitly migrated into the central reset service.
 * weekly_party_contracts_reset: rotate Party Contract definitions/weekly social goal keys. Must be idempotent by periodKey.
 * monthly_companion_trials_reset: clear monthly floor/checkpoint/first-clear/challenge state only; preserve ownership/progression/lifetime stats.
 */
