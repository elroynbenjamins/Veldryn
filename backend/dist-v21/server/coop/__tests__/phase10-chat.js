"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const party_chat_1 = require("../party-chat");
const messages = [];
const repository = { isMuted: async () => ({ muted: false }), canAccessChannel: async () => true, getRateLimitState: async () => ({ messagesLast10Seconds: 0, messagesLast60Seconds: 0, duplicateMessagesLast60Seconds: 0, accountAgeMinutes: 100 }), getFilterRules: async () => [], getAllowlist: async () => [], insertMessage: async (input) => { messages.push(input); return { id: `m${messages.length}`, createdAt: 'now' }; }, logModeration: async () => { }, addStrikePoints: async () => { } };
async function main() {
    const live = new party_chat_1.PartyChatAuthorizer({ partyId: 'run-live', mode: 'live', channelEpoch: 1, activeAccountIds: ['a', 'b'] });
    const oldChannel = live.channelId();
    node_assert_1.strict.equal((await live.send(repository, 'a', 'Ready')).ok, true);
    live.remove('b');
    node_assert_1.strict.equal(live.canAccess('b', oldChannel), false);
    node_assert_1.strict.equal(live.channelId(), 'run-live:2');
    node_assert_1.strict.equal((await live.send(repository, 'b', 'still here')).ok, false);
    const qmode = new party_chat_1.PartyChatAuthorizer({ partyId: 'run-q', mode: 'qmode', channelEpoch: 1, activeAccountIds: ['a'] });
    node_assert_1.strict.equal((await qmode.send(repository, 'a', 'hello')).ok, false);
    node_assert_1.strict.equal(messages.length, 1);
    console.log('coop phase10 chat OK');
}
void main().catch(error => { console.error(error); throw error; });
