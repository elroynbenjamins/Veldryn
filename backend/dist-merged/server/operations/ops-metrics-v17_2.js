"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpsMetrics = void 0;
exports.hourBucket = hourBucket;
function hourBucket(at = new Date()) { const d = new Date(at); d.setUTCMinutes(0, 0, 0); return d.toISOString(); }
class OpsMetrics {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    record(metricKey, value, { dimensionKey = 'all', dimensions = {}, type = 'counter', at = new Date(), count = 1 } = {}) {
        if (!Number.isFinite(value))
            return Promise.resolve();
        return this.repo.recordMetric({ metricKey, bucketStart: hourBucket(at), bucketMinutes: 60, dimensionKey, dimensions, metricType: type, value, incrementCount: count });
    }
    goldCreated(amount, source) { return this.record('economy.gold.created', amount, { dimensionKey: `source:${source}`, dimensions: { source } }); }
    goldDestroyed(amount, sink) { return this.record('economy.gold.destroyed', amount, { dimensionKey: `sink:${sink}`, dimensions: { sink } }); }
    itemCreated(quantity, itemId, source) { return this.record('economy.items.created', quantity, { dimensionKey: `source:${source}`, dimensions: { source, itemId } }); }
    activitySeconds(skillId, seconds) { return this.record('activity.seconds', seconds, { dimensionKey: `skill:${skillId}`, dimensions: { skillId } }); }
    dungeonCompleted(mode) { return this.record('dungeon.completions', 1, { dimensionKey: `mode:${mode}`, dimensions: { mode } }); }
    socialPoints(system, points) { return this.record('social.contribution_points', points, { dimensionKey: `system:${system}`, dimensions: { system } }); }
}
exports.OpsMetrics = OpsMetrics;
