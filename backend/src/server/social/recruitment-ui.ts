import { RecruitmentPost, recruitmentTimeRemainingMs } from './recruitment';

export interface RecruitmentTimeLabel {
  text: string;
  urgency: 'normal' | 'soon' | 'expired';
}

export function recruitmentTimeLabel(post: RecruitmentPost, nowMs: number): RecruitmentTimeLabel {
  const remainingMs = recruitmentTimeRemainingMs(post, nowMs);
  if (remainingMs <= 0) return { text: 'Expired', urgency: 'expired' };

  const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (hours <= 6) return { text: `${hours}h left`, urgency: 'soon' };
  if (hours < 24) return { text: `${hours}h left`, urgency: 'normal' };

  const days = Math.ceil(hours / 24);
  return { text: `${days}d left`, urgency: 'normal' };
}
