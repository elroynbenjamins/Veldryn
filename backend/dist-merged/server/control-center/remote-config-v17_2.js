"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeldrynRemoteConfig = void 0;
function stableBucket(accountId, key, seed) {
    const text = `${accountId || 'anonymous'}:${key}:${seed}`;
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash % 10000;
}
class VeldrynRemoteConfig {
    repo;
    ttlMs;
    rows = new Map();
    loadedAt = 0;
    constructor(repo, ttlMs = 15_000) {
        this.repo = repo;
        this.ttlMs = ttlMs;
    }
    async refresh(force = false) {
        if (!force && Date.now() - this.loadedAt < this.ttlMs && this.rows.size)
            return;
        try {
            const rows = await this.repo.listRemoteConfig();
            this.rows = new Map(rows.map(r => [r.config_key, r]));
            this.loadedAt = Date.now();
        }
        catch (error) {
            if (this.rows.size) {
                this.loadedAt = Date.now() - Math.max(0, this.ttlMs - 2_000);
                return;
            }
            throw error;
        }
    }
    async resolve(key, accountId, fallback) {
        await this.refresh();
        const row = this.rows.get(key);
        if (!row)
            return fallback;
        const now = Date.now();
        if (!row.enabled)
            return row.default_value ?? fallback;
        if (row.active_from && now < Date.parse(row.active_from))
            return row.default_value ?? fallback;
        if (row.active_until && now >= Date.parse(row.active_until))
            return row.default_value ?? fallback;
        const bucket = stableBucket(accountId, key, row.rollout_seed);
        if (bucket >= Math.round(Number(row.rollout_percent) * 100))
            return row.default_value ?? fallback;
        return row.current_value ?? fallback;
    }
    async boolean(key, accountId, fallback) { return Boolean(await this.resolve(key, accountId, fallback)); }
    async number(key, accountId, fallback) { const n = Number(await this.resolve(key, accountId, fallback)); return Number.isFinite(n) ? n : fallback; }
    async requireGameplayWrite(accountId) {
        if (await this.boolean('maintenance.write_actions_disabled', accountId, false))
            throw new Error('gameplay_writes_temporarily_disabled');
    }
    async requireFeature(key, accountId) {
        await this.requireGameplayWrite(accountId);
        if (!(await this.boolean(key, accountId, true)))
            throw new Error(`feature_temporarily_disabled:${key}`);
    }
    async clientSafe(accountId) {
        await this.refresh();
        const out = {};
        for (const [key, row] of this.rows)
            if (row.exposure === 'client_safe')
                out[key] = await this.resolve(key, accountId, row.default_value);
        return out;
    }
}
exports.VeldrynRemoteConfig = VeldrynRemoteConfig;
/** Integration rules:
 * - Every authoritative endpoint enforces its feature gate; UI hiding is convenience only.
 * - For immutable Party Event caps: effectiveCap = min(definitionCap, remote safety hard cap). Never raise a live definition cap remotely.
 * - Existing Live Dungeon runs and already-started crafting jobs should settle safely when new-entry switches are disabled.
 * - Cache is intentionally short (15s default) for emergency response; preserve last good cache if your repository transiently fails.
 */
