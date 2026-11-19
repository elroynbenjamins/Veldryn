"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnnouncementWorker = runAnnouncementWorker;
async function runAnnouncementWorker(store, delivery, now = new Date(), limit = 20) {
    const due = await store.due(now.toISOString(), limit);
    let activated = 0, ended = 0;
    for (const a of due) {
        if (a.ends_at && Date.parse(a.ends_at) <= now.getTime()) {
            await store.markEnded(a.id);
            ended++;
            continue;
        }
        if (a.in_game_enabled)
            await delivery.publishInGame(a, `announcement:${a.id}:ingame`);
        if (a.push_enabled)
            await delivery.publishPush(a, `announcement:${a.id}:push`);
        await store.markActive(a.id);
        activated++;
    }
    return { activated, ended };
}
