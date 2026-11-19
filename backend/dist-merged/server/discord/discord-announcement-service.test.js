"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const discord_announcement_service_1 = require("./discord-announcement-service");
const discord_rest_client_1 = require("./discord-rest-client");
class FakeClient {
    messages = [];
    async send(channelId, payload) { this.messages.push({ channelId, payload }); return { id: `message-${this.messages.length}`, channelId }; }
}
async function main() {
    const client = new FakeClient();
    const service = new discord_announcement_service_1.DiscordAnnouncementService(client, { botToken: 'token', defaultChannelId: 'general', eventChannelId: 'events', releaseChannelId: 'releases' });
    const first = await service.eventStarted({ eventId: 'harvestwake-2026', name: 'Harvestwake', summary: 'The Harvestwake event is now live.', startsAt: '2026-10-01T12:00:00Z', endsAt: '2026-10-31T23:59:59Z', details: ['Earn Candy from event activities.'], mentionRoleId: '123' });
    strict_1.default.equal(first.skipped, false);
    strict_1.default.equal(client.messages[0].channelId, 'events');
    strict_1.default.equal(client.messages[0].payload.allowed_mentions.parse.length, 0);
    strict_1.default.deepEqual(client.messages[0].payload.allowed_mentions.roles, ['123']);
    strict_1.default.match(client.messages[0].payload.embeds[0].fields?.[0].value ?? '', /<t:/);
    const duplicate = await service.eventStarted({ eventId: 'harvestwake-2026', name: 'Harvestwake', summary: 'duplicate', startsAt: '2026-10-01T12:00:00Z' });
    strict_1.default.equal(duplicate.skipped, true);
    const patch = await service.patchNotice({ releaseId: 'mobile-0.1.0-v9', version: '0.1.0', summary: 'Co-op and event improvements are now available.', details: ['Improved event start popup.'], url: 'https://veldryn.example/patches/0.1.0' });
    strict_1.default.equal(patch.channelId, 'releases');
    strict_1.default.throws(() => (0, discord_rest_client_1.discordConfigFromEnv)({ DISCORD_BOT_TOKEN: 'x' }), /DISCORD_ANNOUNCEMENTS_CHANNEL_ID_required/);
    console.log('PASS discord announcement service');
}
void main();
