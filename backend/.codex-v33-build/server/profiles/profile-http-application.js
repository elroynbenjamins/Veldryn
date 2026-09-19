"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileHttpApplication = void 0;
const profile_api_contracts_1 = require("./profile-api-contracts");
class ProfileHttpApplication {
    profiles;
    constructor(profiles) {
        this.profiles = profiles;
    }
    self(accountId) { return this.profiles.self(accountId); }
    view(accountId, targetAccountId) { return this.profiles.view(accountId, targetAccountId); }
    update(accountId, body, nowMs) { return this.profiles.update(accountId, (0, profile_api_contracts_1.parseProfileUpdateRequest)(body), nowMs); }
}
exports.ProfileHttpApplication = ProfileHttpApplication;
