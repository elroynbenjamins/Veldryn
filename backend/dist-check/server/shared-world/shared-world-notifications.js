"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worldBossSpawnedNotification = worldBossSpawnedNotification;
exports.crisisStageNotification = crisisStageNotification;
function worldBossSpawnedNotification(input) { return { key: 'world_boss_spawned', title: `World Boss: ${input.bossName}`, body: `A World Boss has appeared in ${input.regionId}. Your attempts are asynchronous; fight when it suits you.`, deepLink: `veldryn://world/world-boss/${input.instanceId}`, dedupeKey: `world-boss-spawned:${input.instanceId}` }; }
function crisisStageNotification(input) { return { key: 'regional_crisis_stage', title: `${input.crisisName}: ${input.stageName}`, body: 'The server has reached a new regional crisis stage.', deepLink: `veldryn://world/crisis/${input.instanceId}`, dedupeKey: `crisis-stage:${input.instanceId}:${input.stageName}` }; }
