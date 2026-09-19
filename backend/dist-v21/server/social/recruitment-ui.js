"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recruitmentTimeLabel = recruitmentTimeLabel;
const recruitment_1 = require("./recruitment");
function recruitmentTimeLabel(post, nowMs) {
    const remainingMs = (0, recruitment_1.recruitmentTimeRemainingMs)(post, nowMs);
    if (remainingMs <= 0)
        return { text: 'Expired', urgency: 'expired' };
    const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
    if (hours <= 6)
        return { text: `${hours}h left`, urgency: 'soon' };
    if (hours < 24)
        return { text: `${hours}h left`, urgency: 'normal' };
    const days = Math.ceil(hours / 24);
    return { text: `${days}d left`, urgency: 'normal' };
}
