"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementApplicationService = void 0;
class AchievementApplicationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    snapshot(accountId) { if (!accountId?.trim())
        throw new Error('AUTH_REQUIRED'); return this.repository.snapshot(accountId.trim()); }
    claim(accountId, achievementId, requestId, nowMs) { if (!accountId?.trim())
        throw new Error('AUTH_REQUIRED'); if (!achievementId?.trim())
        throw new Error('ACHIEVEMENT_ID_REQUIRED'); if (requestId.length < 8 || requestId.length > 128)
        throw new Error('INVALID_REQUEST_ID'); if (!Number.isFinite(nowMs) || nowMs < 0)
        throw new Error('INVALID_TIME'); return this.repository.claim(accountId.trim(), achievementId.trim(), requestId, nowMs); }
    setShowcase(accountId, ids, requestId, nowMs) { if (!accountId?.trim())
        throw new Error('AUTH_REQUIRED'); if (requestId.length < 8 || requestId.length > 128)
        throw new Error('INVALID_REQUEST_ID'); if (new Set(ids).size !== ids.length || ids.length > 3)
        throw new Error('ACHIEVEMENT_SHOWCASE_INVALID'); if (!Number.isFinite(nowMs) || nowMs < 0)
        throw new Error('INVALID_TIME'); return this.repository.setShowcase(accountId.trim(), ids, requestId, nowMs); }
}
exports.AchievementApplicationService = AchievementApplicationService;
