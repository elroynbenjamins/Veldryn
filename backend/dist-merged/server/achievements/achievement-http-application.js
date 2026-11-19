"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementHttpApplication = void 0;
const achievement_api_contracts_1 = require("./achievement-api-contracts");
class AchievementHttpApplication {
    service;
    now;
    constructor(service, now = () => Date.now()) {
        this.service = service;
        this.now = now;
    }
    get(accountId) { return this.service.snapshot(accountId); }
    claim(accountId, achievementId, body) { if (!achievementId)
        throw new Error('ACHIEVEMENT_ID_REQUIRED'); const parsed = (0, achievement_api_contracts_1.parseAchievementClaimBody)(body); return this.service.claim(accountId, achievementId, parsed.requestId, this.now()); }
    showcase(accountId, body) { const parsed = (0, achievement_api_contracts_1.parseAchievementShowcaseBody)(body); return this.service.setShowcase(accountId, parsed.achievementIds, parsed.requestId, this.now()); }
}
exports.AchievementHttpApplication = AchievementHttpApplication;
