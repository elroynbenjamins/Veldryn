"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildHttpApplication = void 0;
const guild_api_contracts_1 = require("./guild-api-contracts");
class GuildHttpApplication {
    service;
    constructor(service) {
        this.service = service;
    }
    self(accountId) { return this.service.self(accountId); }
    directory(accountId, limit) { return this.service.directory(accountId, limit); }
    leaderboard(accountId, limit) { return this.service.leaderboard(accountId, limit); }
    create(accountId, body, nowMs) { return this.service.create(accountId, (0, guild_api_contracts_1.parseGuildCreate)(body), nowMs); }
    updateProfile(accountId, body, nowMs) { return this.service.updateProfile(accountId, (0, guild_api_contracts_1.parseGuildProfileUpdate)(body), nowMs); }
    allocateSkill(accountId, skillId, requestId, nowMs) { return this.service.allocateSkill(accountId, skillId, requestId, nowMs); }
    contributeProject(accountId, characterId, optionId, requestId, nowMs) { return this.service.contributeProject(accountId, characterId, optionId, requestId, nowMs); }
}
exports.GuildHttpApplication = GuildHttpApplication;
