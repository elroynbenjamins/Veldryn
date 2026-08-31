export type ChatModerationAction = 'allow' | 'mask' | 'block' | 'mute_review';

export interface ChatFilterRule {
  id: string;
  term: string;
  severity: 1 | 2 | 3 | 4;
  wholeWord?: boolean;
  action?: Exclude<ChatModerationAction, 'allow'>;
}

export interface ChatModerationResult {
  action: ChatModerationAction;
  normalized: string;
  matchedRuleIds: string[];
  matchedSeverities: number[];
  maskedText?: string;
  reason?: string;
}

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '+': 't',
};

export function normalizeChatForMatching(input: string): string {
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

function normalizeTerm(term: string): string {
  return normalizeChatForMatching(term);
}

export function containsRule(normalizedMessage: string, rule: ChatFilterRule): boolean {
  const needle = normalizeTerm(rule.term);
  if (!needle) return false;
  return normalizedMessage.includes(needle);
}

function defaultActionForSeverity(severity: number): Exclude<ChatModerationAction, 'allow'> {
  if (severity >= 4) return 'mute_review';
  if (severity >= 3) return 'block';
  return 'mask';
}

export function maskOriginalText(text: string): string {
  // The server should never echo a prohibited term back to clients. We intentionally
  // mask the full message rather than trying to reveal the exact matched substring.
  return text.replace(/\S/g, '•');
}

export function moderateChatMessage(
  text: string,
  rules: ChatFilterRule[],
  allowlistTerms: string[] = [],
): ChatModerationResult {
  const normalized = normalizeChatForMatching(text);
  if (!normalized) {
    return { action: 'block', normalized, matchedRuleIds: [], matchedSeverities: [], reason: 'empty_or_invalid' };
  }

  const allowNormalized = allowlistTerms.map(normalizeTerm).filter(Boolean);
  const matched = rules.filter((rule) => {
    const needle = normalizeTerm(rule.term);
    if (!needle || !normalized.includes(needle)) return false;
    // Exact allowlisted token prevents obvious false positives in known safe terms.
    return !allowNormalized.includes(needle);
  });

  if (matched.length === 0) {
    return { action: 'allow', normalized, matchedRuleIds: [], matchedSeverities: [] };
  }

  const maxSeverity = Math.max(...matched.map((r) => r.severity));
  const explicit = matched
    .map((r) => r.action)
    .filter((a): a is Exclude<ChatModerationAction, 'allow'> => Boolean(a));
  const priority: ChatModerationAction[] = ['allow', 'mask', 'block', 'mute_review'];
  const action = explicit.length
    ? explicit.reduce((best, a) => priority.indexOf(a) > priority.indexOf(best) ? a : best, 'mask' as Exclude<ChatModerationAction, 'allow'>)
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
