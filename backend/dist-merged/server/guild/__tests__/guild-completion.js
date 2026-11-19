"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const guild_api_contracts_1 = require("../guild-api-contracts");
const guild_application_1 = require("../guild-application");
class Memory {
    async self() { return null; }
    async directory() { return []; }
    async leaderboard() { return []; }
    async create() { return {}; }
    async updateProfile() { return {}; }
    async allocateSkill() { return {}; }
    async contributeProject() { return {}; }
}
const service = new guild_application_1.GuildApplicationService(new Memory());
node_assert_1.strict.equal((0, guild_api_contracts_1.parseGuildCreate)({ requestId: 'request-1', characterId: 'char', name: 'Asterfall', joinPolicy: 'open', minimumLevel: 1 }).name, 'Asterfall');
node_assert_1.strict.equal((0, guild_api_contracts_1.parseGuildProfileUpdate)({ requestId: 'request-1', joinPolicy: 'invite' }).joinPolicy, 'invite');
let threw = false;
try {
    (0, guild_api_contracts_1.parseGuildCreate)({ requestId: 'short', characterId: 'char', name: 'x' });
}
catch {
    threw = true;
}
node_assert_1.strict.equal(threw, true);
try {
    service.self('');
}
catch (error) {
    node_assert_1.strict.equal(error.message, 'AUTH_REQUIRED');
}
console.log('guild completion PASS');
