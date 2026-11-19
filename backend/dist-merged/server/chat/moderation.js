"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeChatForMatching = normalizeChatForMatching;
exports.containsRule = containsRule;
exports.maskOriginalText = maskOriginalText;
exports.moderateChatMessage = moderateChatMessage;
const LEET = {
    '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
    '@': 'a', '$': 's', '!': 'i', '+': 't',
};
function normalizeChatForMatching(input) {
    return input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split('')
        .map((ch) => LEET[ch] ?? ch)
        .join('')
        .replace(/(.)\1{2,}/g, '$1$1')
        .replace(/[\s._\-*/\\|]+/g, '')
        .replace(/[^a-z0-9]/g, '');
}
function normalizeTerm(term) {
    return normalizeChatForMatching(term);
}
function containsRule(normalizedMessage, rule) {
    const needle = normalizeTerm(rule.term);
    if (!needle)
        return false;
    return normalizedMessage.includes(needle);
}
function defaultActionForSeverity(severity) {
    if (severity >= 4)
        return 'mute_review';
    if (severity >= 3)
        return 'block';
    return 'mask';
}
function maskOriginalText(text) {
    // The server should never echo a prohibited term back to clients. We intentionally
    // mask the full message rather than trying to reveal the exact matched substring.
    return text.replace(/\S/g, '•');
}
function moderateChatMessage(text, rules, allowlistTerms = []) {
    const normalized = normalizeChatForMatching(text);
    if (!normalized) {
        return { action: 'block', normalized, matchedRuleIds: [], matchedSeverities: [], reason: 'empty_or_invalid' };
    }
    const allowNormalized = allowlistTerms.map(normalizeTerm).filter(Boolean);
    const matched = rules.filter((rule) => {
        const needle = normalizeTerm(rule.term);
        if (!needle || !normalized.includes(needle))
            return false;
        // Exact allowlisted token prevents obvious false positives in known safe terms.
        return !allowNormalized.includes(needle);
    });
    if (matched.length === 0) {
        return { action: 'allow', normalized, matchedRuleIds: [], matchedSeverities: [] };
    }
    const maxSeverity = Math.max(...matched.map((r) => r.severity));
    const explicit = matched
        .map((r) => r.action)
        .filter((a) => Boolean(a));
    const priority = ['allow', 'mask', 'block', 'mute_review'];
    const action = explicit.length
        ? explicit.reduce((best, a) => priority.indexOf(a) > priority.indexOf(best) ? a : best, 'mask')
        : defaultActionForSeverity(maxSeverity);
    return {
        action,
        normalized,
        matchedRuleIds: matched.map((r) => r.id),
        matchedSeverities: matched.map((r) => r.severity),
        maskedText: action === 'mask' ? maskOriginalText(text) : undefined,
        reason: `blocked_term_severity_${maxSeverity}`,
    };
}
