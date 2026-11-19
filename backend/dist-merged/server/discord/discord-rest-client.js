"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordRestClient = void 0;
exports.discordConfigFromEnv = discordConfigFromEnv;
class DiscordRestClient {
    token;
    baseUrl;
    constructor(token, baseUrl = 'https://discord.com/api/v10') {
        this.token = token;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async send(channelId, payload) {
        if (!channelId)
            throw new Error('discord_channel_id_required');
        const response = await fetch(`${this.baseUrl}/channels/${encodeURIComponent(channelId)}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bot ${this.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`discord_send_failed:${response.status}:${body.slice(0, 500)}`);
        }
        const result = await response.json();
        if (!result.id)
            throw new Error('discord_send_missing_message_id');
        return { id: result.id, channelId: result.channel_id ?? channelId };
    }
}
exports.DiscordRestClient = DiscordRestClient;
function discordConfigFromEnv(env = process.env) {
    const botToken = env.DISCORD_BOT_TOKEN?.trim() ?? '';
    const defaultChannelId = env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID?.trim() ?? '';
    if (!botToken)
        throw new Error('DISCORD_BOT_TOKEN_required');
    if (!defaultChannelId)
        throw new Error('DISCORD_ANNOUNCEMENTS_CHANNEL_ID_required');
    return {
        botToken,
        defaultChannelId,
        eventChannelId: env.DISCORD_EVENT_CHANNEL_ID?.trim() || undefined,
        releaseChannelId: env.DISCORD_RELEASE_CHANNEL_ID?.trim() || undefined,
        maintenanceChannelId: env.DISCORD_MAINTENANCE_CHANNEL_ID?.trim() || undefined,
        contentChannelId: env.DISCORD_CONTENT_CHANNEL_ID?.trim() || undefined,
        apiBaseUrl: env.DISCORD_API_BASE_URL?.trim() || undefined,
        dryRun: env.DISCORD_DRY_RUN === 'true',
    };
}
