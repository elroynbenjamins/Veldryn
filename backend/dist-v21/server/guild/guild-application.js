"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildApplicationService = void 0;
const id = (v, k) => { if (!v?.trim())
    throw new Error(k); return v.trim(); };
const time = (v) => { if (!Number.isSafeInteger(v) || v < 0)
    throw new Error('INVALID_TIME'); };
class GuildApplicationService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    self(a) { return this.repo.self(id(a, 'AUTH_REQUIRED')); }
    directory(a, l = 50) { return this.repo.directory(id(a, 'AUTH_REQUIRED'), Math.max(1, Math.min(100, Math.floor(l)))); }
    leaderboard(a, l = 50) { return this.repo.leaderboard(id(a, 'AUTH_REQUIRED'), Math.max(1, Math.min(100, Math.floor(l)))); }
    create(a, i, n) { time(n); return this.repo.create(id(a, 'AUTH_REQUIRED'), i, n); }
    updateProfile(a, i, n) { time(n); return this.repo.updateProfile(id(a, 'AUTH_REQUIRED'), i, n); }
    allocateSkill(a, s, r, n) { time(n); return this.repo.allocateSkill(id(a, 'AUTH_REQUIRED'), id(s, 'GUILD_SKILL_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    contributeProject(a, c, o, r, n) { time(n); return this.repo.contributeProject(id(a, 'AUTH_REQUIRED'), id(c, 'CHARACTER_REQUIRED'), id(o, 'PROJECT_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    setRole(a, t, role, r, n) { time(n); if (role !== 'officer' && role !== 'member')
        throw new Error('INVALID_GUILD_ROLE'); return this.repo.setRole(id(a, 'AUTH_REQUIRED'), id(t, 'TARGET_REQUIRED'), role, id(r, 'INVALID_REQUEST_ID'), n); }
    removeMember(a, t, r, n) { time(n); return this.repo.removeMember(id(a, 'AUTH_REQUIRED'), id(t, 'TARGET_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    transferLeadership(a, t, r, n) { time(n); return this.repo.transferLeadership(id(a, 'AUTH_REQUIRED'), id(t, 'TARGET_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    leave(a, r, n) { time(n); return this.repo.leave(id(a, 'AUTH_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    invite(a, t, r, n) { time(n); return this.repo.invite(id(a, 'AUTH_REQUIRED'), id(t, 'TARGET_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    myInvites(a) { return this.repo.myInvites(id(a, 'AUTH_REQUIRED')); }
    acceptInvite(a, i, r, n) { time(n); return this.repo.acceptInvite(id(a, 'AUTH_REQUIRED'), id(i, 'INVITE_REQUIRED'), id(r, 'INVALID_REQUEST_ID'), n); }
    chat(a, l = 50) { return this.repo.chat(id(a, 'AUTH_REQUIRED'), Math.max(1, Math.min(100, Math.floor(l)))); }
    sendChat(a, b, s, r, n) { time(n); const body = b.trim(); if (!body || body.length > 500)
        throw new Error('INVALID_CHAT_BODY'); return this.repo.sendChat(id(a, 'AUTH_REQUIRED'), body, s.trim(), id(r, 'INVALID_REQUEST_ID'), n); }
}
exports.GuildApplicationService = GuildApplicationService;
