import React from 'react';
import type { ReactNode } from 'react';

export interface PartyChatGateProps {
  partyId?: string | null;
  children: ReactNode;
}

/** Render the persistent Party chat channel only while the account belongs to a persistent Party. */
export function PartyChatGate({ partyId, children }: PartyChatGateProps) {
  if (!partyId) return null;
  return <>{children}</>;
}
