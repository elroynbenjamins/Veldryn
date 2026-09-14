import React from 'react';
import { shouldShowPartyChat, type PersistentPartySummary } from '../core/party-social';

/** Party Chat is intentionally absent from the UI when the account is not a current Party member. */
export function PartyChatGate({ party, accountId, children }: { party: PersistentPartySummary | null; accountId: string; children: React.ReactNode }) {
  return shouldShowPartyChat(party,accountId) ? <>{children}</> : null;
}
