"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyChatAuthorizer = void 0;
const send_message_1 = require("../chat/send-message");
class PartyChatAuthorizer {
    membership;
    constructor(membership) {
        this.membership = membership;
    }
    channelId() { return `${this.membership.partyId}:${this.membership.channelEpoch}`; }
    canAccess(accountId, channelId) { return this.membership.mode === 'live' && this.membership.activeAccountIds.includes(accountId) && channelId === this.channelId(); }
    remove(accountId) { this.membership = { ...this.membership, channelEpoch: this.membership.channelEpoch + 1, activeAccountIds: this.membership.activeAccountIds.filter(id => id !== accountId) }; }
    async send(repository, accountId, text) { if (!this.canAccess(accountId, this.channelId()))
        return { ok: false, code: 'forbidden' }; return (0, send_message_1.sendChatMessage)(repository, { accountId, channelType: 'party', channelId: this.channelId(), text }); }
}
exports.PartyChatAuthorizer = PartyChatAuthorizer;
