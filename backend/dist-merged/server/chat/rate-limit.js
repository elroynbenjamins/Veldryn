"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateChatRateLimit = evaluateChatRateLimit;
function evaluateChatRateLimit(input) {
    if (input.messagesLast10Seconds >= 5)
        return { allowed: false, retryAfterSeconds: 10, reason: 'burst_limit' };
    if (input.messagesLast60Seconds >= 20)
        return { allowed: false, retryAfterSeconds: 30, reason: 'minute_limit' };
    if (input.duplicateMessagesLast60Seconds >= 4)
        return { allowed: false, retryAfterSeconds: 45, reason: 'duplicate_spam' };
    if (input.accountAgeMinutes < 10 && input.messagesLast60Seconds >= 8) {
        return { allowed: false, retryAfterSeconds: 30, reason: 'new_account_limit' };
    }
    return { allowed: true, retryAfterSeconds: 0 };
}
