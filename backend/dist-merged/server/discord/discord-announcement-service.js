"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordAnnouncementService = void 0;
const COLORS = { event: 0xD67B3E, patch: 0x6D8CFF, maintenance: 0xE7B84B, content: 0x6BCB9A, ended: 0x8B96A8 };
function formatWhen(value) {
    if (!value)
        return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : `<t:${Math.floor(date.getTime() / 1000)}:F> (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
}
function embedFor(announcement) {
    const fields = (announcement.details ?? []).slice(0, 8).map((detail, index) => ({ name: `Detail ${index + 1}`, value: detail.slice(0, 1024) }));
    if (announcement.startsAt)
        fields.unshift({ name: 'Starts', value: formatWhen(announcement.startsAt) });
    if (announcement.endsAt)
        fields.push({ name: 'Ends', value: formatWhen(announcement.endsAt) });
    const color = announcement.kind === 'event_started' ? COLORS.event : announcement.kind === 'event_ended' ? COLORS.ended : announcement.kind === 'patch' ? COLORS.patch : announcement.kind === 'maintenance' ? COLORS.maintenance : COLORS.content;
    return { title: announcement.title.slice(0, 256), description: announcement.summary.slice(0, 4096), color, fields: fields.length ? fields : undefined, url: announcement.url, footer: { text: 'VELDRYN · Official announcement' }, timestamp: new Date().toISOString() };
}
function contentFor(announcement) {
    return announcement.mentionRoleId ? `<@&${announcement.mentionRoleId}>` : undefined;
}
class DiscordAnnouncementService {
    client;
    config;
    delivered;
    constructor(client, config, delivered = new Set()) {
        this.client = client;
        this.config = config;
        this.delivered = delivered;
    }
    async publish(announcement, idempotencyKey) {
        if (!idempotencyKey.trim())
            throw new Error('discord_idempotency_key_required');
        if (this.delivered.has(idempotencyKey))
            return { skipped: true, idempotencyKey };
        const channelId = this.channelFor(announcement.kind);
        const payload = { content: contentFor(announcement), embeds: [embedFor(announcement)], allowed_mentions: { parse: [] } };
        if (announcement.mentionRoleId)
            payload.allowed_mentions = { parse: [], roles: [announcement.mentionRoleId] };
        if (this.config.dryRun) {
            this.delivered.add(idempotencyKey);
            return { skipped: false, dryRun: true, idempotencyKey, payload, channelId };
        }
        const sent = await this.client.send(channelId, payload);
        this.delivered.add(idempotencyKey);
        return { skipped: false, dryRun: false, idempotencyKey, payload, channelId, messageId: sent.id };
    }
    eventStarted(input) { return this.publish({ kind: 'event_started', title: `Event started: ${input.name}`, summary: input.summary, startsAt: input.startsAt, endsAt: input.endsAt, details: input.details, url: input.url, mentionRoleId: input.mentionRoleId }, `event:${input.eventId}:started`); }
    eventEnded(input) { return this.publish({ kind: 'event_ended', title: `Event ended: ${input.name}`, summary: input.summary, endsAt: input.endsAt, details: input.details, url: input.url }, `event:${input.eventId}:ended`); }
    patchNotice(input) { return this.publish({ kind: 'patch', title: `Patch ${input.version} is live`, summary: input.summary, details: input.details, url: input.url }, `patch:${input.releaseId}`); }
    maintenance(input) { return this.publish({ kind: 'maintenance', title: input.title, summary: input.summary, startsAt: input.startsAt, endsAt: input.endsAt, details: input.details, url: input.url, mentionRoleId: input.mentionRoleId }, `maintenance:${input.maintenanceId}`); }
    newContent(input) { return this.publish({ kind: 'new_content', title: `New content: ${input.name}`, summary: input.summary, startsAt: input.startsAt, details: input.details, url: input.url }, `content:${input.contentId}`); }
    channelFor(kind) { return kind === 'event_started' || kind === 'event_ended' ? this.config.eventChannelId ?? this.config.defaultChannelId : kind === 'patch' ? this.config.releaseChannelId ?? this.config.defaultChannelId : kind === 'maintenance' ? this.config.maintenanceChannelId ?? this.config.defaultChannelId : this.config.contentChannelId ?? this.config.defaultChannelId; }
}
exports.DiscordAnnouncementService = DiscordAnnouncementService;
