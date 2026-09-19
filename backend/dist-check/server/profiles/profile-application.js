"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileApplicationService = void 0;
class ProfileApplicationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    self(accountId) { if (!accountId?.trim())
        throw new Error('AUTH_REQUIRED'); return this.repository.self(accountId.trim()); }
    view(viewerAccountId, targetAccountId) { if (!viewerAccountId?.trim())
        throw new Error('AUTH_REQUIRED'); if (!targetAccountId?.trim())
        throw new Error('PROFILE_TARGET_REQUIRED'); return this.repository.publicProfile(viewerAccountId.trim(), targetAccountId.trim()); }
    update(accountId, input, nowMs) { if (!accountId?.trim())
        throw new Error('AUTH_REQUIRED'); if (!Number.isFinite(nowMs) || nowMs < 0)
        throw new Error('INVALID_TIME'); return this.repository.update(accountId.trim(), input, nowMs); }
}
exports.ProfileApplicationService = ProfileApplicationService;
