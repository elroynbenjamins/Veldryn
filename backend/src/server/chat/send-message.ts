import { moderateChatMessage, type ChatFilterRule } from './moderation';
import { evaluateChatRateLimit, type ChatRateLimitInput } from './rate-limit';

export type ChatChannelType = 'world' | 'guild' | 'party' | 'private';

export interface SendChatInput {
  accountId: string;
  channelType: ChatChannelType;
  channelId: string;
  text: string;
}

export interface ChatRepository {
  isMuted(accountId: string): Promise<{ muted: boolean; until?: string }>;
  canAccessChannel(accountId: string, type: ChatChannelType, channelId: string): Promise<boolean>;
  getRateLimitState(accountId: string, normalizedText: string): Promise<ChatRateLimitInput>;
  getFilterRules(): Promise<ChatFilterRule[]>;
  getAllowlist(): Promise<string[]>;
  insertMessage(input: SendChatInput & { body: string; moderationAction: 'allow'|'mask' }): Promise<{ id: string; createdAt: string }>;
  logModeration(input: {
    accountId: string;
    channelType: ChatChannelType;
    channelId: string;
    action: 'mask'|'block'|'mute_review'|'rate_limit';
    matchedRuleIds: string[];
    maxSeverity?: number;
    reason: string;
    rawText: string;
  }): Promise<void>;
  addStrikePoints(accountId: string, points: number, requestReview: boolean): Promise<void>;
}

export type SendChatResult =
  | { ok: true; messageId: string; createdAt: string; body: string; masked: boolean }
  | { ok: false; code: 'muted'|'forbidden'|'invalid'|'rate_limited'|'blocked'; retryAfterSeconds?: number };

export async function sendChatMessage(repo: ChatRepository, input: SendChatInput): Promise<SendChatResult> {
  const raw = input.text.trim();
  if (raw.length < 1 || raw.length > 300) return { ok:false, code:'invalid' };

  const sanction = await repo.isMuted(input.accountId);
  if (sanction.muted) return { ok:false, code:'muted' };
  if (!await repo.canAccessChannel(input.accountId, input.channelType, input.channelId)) return { ok:false, code:'forbidden' };

  const rules = await repo.getFilterRules();
  const allowlist = await repo.getAllowlist();
  const moderation = moderateChatMessage(raw, rules, allowlist);

  const rateState = await repo.getRateLimitState(input.accountId, moderation.normalized);
  const rate = evaluateChatRateLimit(rateState);
  if (!rate.allowed) {
    await repo.logModeration({accountId:input.accountId,channelType:input.channelType,channelId:input.channelId,action:'rate_limit',matchedRuleIds:[],reason:rate.reason ?? 'rate_limit',rawText:raw});
    return { ok:false, code:'rate_limited', retryAfterSeconds:rate.retryAfterSeconds };
  }

  if (moderation.action === 'block' || moderation.action === 'mute_review') {
    const maxSeverity = moderation.matchedSeverities.length ? Math.max(...moderation.matchedSeverities) : undefined;
    await repo.logModeration({accountId:input.accountId,channelType:input.channelType,channelId:input.channelId,action:moderation.action,matchedRuleIds:moderation.matchedRuleIds,maxSeverity,reason:moderation.reason ?? 'blocked',rawText:raw});
    if (moderation.action === 'mute_review') await repo.addStrikePoints(input.accountId, 4, true);
    else if ((maxSeverity ?? 0) >= 3) await repo.addStrikePoints(input.accountId, 2, false);
    return { ok:false, code:'blocked' };
  }

  const masked = moderation.action === 'mask';
  const body = masked ? (moderation.maskedText ?? '•••') : raw;
  if (masked) {
    const maxSeverity = Math.max(...moderation.matchedSeverities);
    await repo.logModeration({accountId:input.accountId,channelType:input.channelType,channelId:input.channelId,action:'mask',matchedRuleIds:moderation.matchedRuleIds,maxSeverity,reason:moderation.reason ?? 'masked',rawText:raw});
  }
  const saved = await repo.insertMessage({...input, body, moderationAction: masked ? 'mask' : 'allow'});
  return { ok:true, messageId:saved.id, createdAt:saved.createdAt, body, masked };
}
