"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveOpsDefinitionHash = liveOpsDefinitionHash;
exports.publishPartyEventDefinition = publishPartyEventDefinition;
exports.schedulePartyEvent = schedulePartyEvent;
const node_crypto_1 = require("node:crypto");
const scheduler_1 = require("./scheduler");
function canonicalize(value) {
    if (Array.isArray(value))
        return value.map(canonicalize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
    }
    return value;
}
function liveOpsDefinitionHash(definition) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(canonicalize(definition))).digest().toString('hex');
}
async function publishPartyEventDefinition(repo, definition) {
    const configHash = liveOpsDefinitionHash(definition);
    const existing = await repo.findDefinition(definition.id, definition.version);
    if (existing) {
        if (existing.configHash !== configHash)
            throw new Error('event_definition_version_conflict');
        return { configHash, inserted: false };
    }
    await repo.insertImmutableDefinition(definition, configHash);
    return { configHash, inserted: true };
}
async function schedulePartyEvent(repo, input) {
    const published = await publishPartyEventDefinition(repo, input.definition);
    const scheduled = (0, scheduler_1.createScheduledPartyEvent)(input);
    (0, scheduler_1.assertNoOverlappingPartyEvents)(scheduled, await repo.listScheduledPartyEvents());
    await repo.insertScheduledPartyEvent(scheduled, published.configHash);
    return scheduled;
}
