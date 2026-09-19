"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qModeConflictFixture = exports.qModeShortageFixture = exports.qModeResumeFixture = exports.qModeReadyFixture = void 0;
const members = [{ memberId: 'controller', displayName: 'You', role: 'support', kind: 'controller', effectiveLevel: 25, status: 'ready' }, { memberId: 'echo-tank', displayName: 'Aster Guard', role: 'tank', kind: 'echo', effectiveLevel: 25, status: 'ready' }, { memberId: 'echo-damage-1', displayName: 'Trail Arrow', role: 'damage', kind: 'echo', effectiveLevel: 25, status: 'ready' }, { memberId: 'echo-damage-2', displayName: 'Gloam Step', role: 'damage', kind: 'echo', effectiveLevel: 25, status: 'ready' }];
exports.qModeReadyFixture = { runId: 'q-gallery-run', requestId: 'q-gallery-request', status: 'ready', members };
exports.qModeResumeFixture = { ...exports.qModeReadyFixture, status: 'resuming', stateVersion: 7 };
exports.qModeShortageFixture = { requestId: 'q-shortage-request', status: 'candidate_shortage', members: members.slice(0, 3), message: 'No current Damage candidate matches this content version.' };
exports.qModeConflictFixture = { requestId: 'q-conflict-request', status: 'content_conflict', members: [], message: 'Saved build content version no longer matches the expedition.' };
