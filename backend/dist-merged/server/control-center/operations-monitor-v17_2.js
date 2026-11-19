"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOperationsMonitor = runOperationsMonitor;
async function runOperationsMonitor(repo, { staleMinutes = 5, goldNetWarningAbsolute = 0 } = {}) {
    const now = Date.now();
    const health = await repo.listHealth();
    const expected = ['party_liveops_worker', 'central_reset_worker'];
    for (const component of expected) {
        const row = health.find(h => h.component === component);
        const stale = !row?.last_ok_at || now - Date.parse(row.last_ok_at) > staleMinutes * 60000;
        const key = `worker_stale:${component}`;
        if (stale)
            await repo.upsertAlert({ alertKey: key, severity: 'critical', title: `${component} heartbeat stale`, detail: row?.last_ok_at ? `Last successful heartbeat ${row.last_ok_at}` : 'No successful heartbeat recorded.', context: { component, lastOkAt: row?.last_ok_at ?? null } });
        else
            await repo.resolveAlert(key);
    }
    const social = await repo.countSocialDeadLetters();
    if (social > 0)
        await repo.upsertAlert({ alertKey: 'dead_letter:social_contribution', severity: 'critical', title: 'Social contribution dead letters', detail: `${social} contribution envelopes require review.`, context: { count: social } });
    else
        await repo.resolveAlert('dead_letter:social_contribution');
    const resets = await repo.countResetDeadLetters();
    if (resets > 0)
        await repo.upsertAlert({ alertKey: 'dead_letter:central_resets', severity: 'critical', title: 'Central reset dead letters', detail: `${resets} reset runs require review.`, context: { count: resets } });
    else
        await repo.resolveAlert('dead_letter:central_resets');
    const goldNet = await repo.goldNet24h();
    if (goldNetWarningAbsolute > 0 && Math.abs(goldNet) >= goldNetWarningAbsolute)
        await repo.upsertAlert({ alertKey: 'economy:gold_net_24h', severity: 'warning', title: '24h Gold net exceeded review threshold', detail: `Net Gold over the last 24 hours is ${goldNet}.`, metricKey: 'economy.gold.created', context: { goldNet24h: goldNet, threshold: goldNetWarningAbsolute } });
    else
        await repo.resolveAlert('economy:gold_net_24h');
    return { healthComponents: health.length, socialDeadLetters: social, resetDeadLetters: resets, goldNet24h: goldNet };
}
