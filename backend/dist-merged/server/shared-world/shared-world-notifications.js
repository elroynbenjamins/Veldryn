"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionDisplayName = regionDisplayName;
exports.worldBossSpawnedNotification = worldBossSpawnedNotification;
exports.worldBossPhaseNotification = worldBossPhaseNotification;
exports.worldBossDefeatedNotification = worldBossDefeatedNotification;
exports.worldBossEndingSoonNotification = worldBossEndingSoonNotification;
exports.crisisStartedNotification = crisisStartedNotification;
exports.crisisStageNotification = crisisStageNotification;
exports.crisisSecuredNotification = crisisSecuredNotification;
exports.crisisFailedNotification = crisisFailedNotification;
/** Display name for a region id such as `frostmarch` or `kings_road` when no authored name is supplied. */
function regionDisplayName(regionId) {
    return regionId.split(/[_-]+/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join(' ') || regionId;
}
const bossLink = (instanceId) => `veldryn://world/world-boss/${instanceId}`;
const crisisLink = (instanceId) => `veldryn://world/crisis/${instanceId}`;
function worldBossSpawnedNotification(input) { return { key: 'world_boss_spawned', title: `World Boss: ${input.bossName}`, body: `A World Boss has appeared in ${input.regionName ?? regionDisplayName(input.regionId)}. Your attempts are asynchronous; fight when it suits you.`, deepLink: bossLink(input.instanceId), dedupeKey: `world-boss-spawned:${input.instanceId}` }; }
function worldBossPhaseNotification(input) { return { key: 'world_boss_phase', title: `${input.bossName}: ${input.phaseName}`, body: 'The World Boss has entered a new phase.', deepLink: bossLink(input.instanceId), dedupeKey: `world-boss-phase:${input.instanceId}:${input.phaseId}` }; }
function worldBossDefeatedNotification(input) { return { key: 'world_boss_defeated', title: `${input.bossName} defeated`, body: input.echoAvailable ? 'The server defeated the World Boss. Players without a scored attempt can still enter the Echo encounter for participation.' : 'The server defeated the World Boss. Rewards are finalized after the encounter closes.', deepLink: bossLink(input.instanceId), dedupeKey: `world-boss-defeated:${input.instanceId}` }; }
function worldBossEndingSoonNotification(input) { const hours = Math.max(1, Math.ceil(input.hoursRemaining)); return { key: 'world_boss_ending_soon', title: `${input.bossName} is escaping`, body: `About ${hours} ${hours === 1 ? 'hour' : 'hours'} remain to bring down the World Boss.`, deepLink: bossLink(input.instanceId), dedupeKey: `world-boss-ending-soon:${input.instanceId}` }; }
function crisisStartedNotification(input) { return { key: 'regional_crisis_started', title: `Regional Crisis: ${input.crisisName}`, body: `A crisis has begun in ${input.regionName ?? regionDisplayName(input.regionId)}. Eligible regional activity contributes automatically.`, deepLink: crisisLink(input.instanceId), dedupeKey: `crisis-started:${input.instanceId}` }; }
/** Dedupe on the stable stage id: stage names are authored copy and may be renamed or localized. */
function crisisStageNotification(input) { return { key: 'regional_crisis_stage', title: `${input.crisisName}: ${input.stageName}`, body: 'The server has reached a new regional crisis stage.', deepLink: crisisLink(input.instanceId), dedupeKey: `crisis-stage:${input.instanceId}:${input.stageId}` }; }
function crisisSecuredNotification(input) { return { key: 'regional_crisis_secured', title: `${input.crisisName}: Region Secured`, body: 'The server secured the region. Success rewards are available to eligible contributors.', deepLink: crisisLink(input.instanceId), dedupeKey: `crisis-secured:${input.instanceId}` }; }
function crisisFailedNotification(input) { return { key: 'regional_crisis_failed', title: `${input.crisisName}: Crisis Ended`, body: 'The crisis ended before the region was secured. Personal milestones you reached are still yours.', deepLink: crisisLink(input.instanceId), dedupeKey: `crisis-failed:${input.instanceId}` }; }
