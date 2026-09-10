import type { CoopMode, CoopRunPhase } from '../../../shared/coop-types';

export interface CoopRunRecord {
  id: string;
  mode: CoopMode;
  controllerAccountId?: string;
  phase: CoopRunPhase;
  stateVersion: number;
  accessAccountIds: string[];
  echoSourceAccountIds: string[];
}

export interface IdempotencyReceipt {
  callerAccountId: string;
  operation: string;
  resourceId: string;
  requestId: string;
  requestHash: string;
  response: unknown;
}

export interface CoopRunRepository {
  create(run: CoopRunRecord): void;
  getAuthorized(runId: string, accountId: string): CoopRunRecord;
  compareAndSet(runId: string, expectedVersion: number, update: (run: CoopRunRecord) => CoopRunRecord): CoopRunRecord;
}

export interface IdempotencyRepository {
  read(callerAccountId: string, operation: string, resourceId: string, requestId: string): IdempotencyReceipt | undefined;
  write(receipt: IdempotencyReceipt): void;
}
