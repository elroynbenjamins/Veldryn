import { CoopDomainError } from '../errors';
import type { CoopRunRecord, CoopRunRepository, IdempotencyReceipt, IdempotencyRepository } from './contracts';

export class MemoryCoopRepository implements CoopRunRepository, IdempotencyRepository {
  private readonly runs = new Map<string, CoopRunRecord>();
  private readonly receipts = new Map<string, IdempotencyReceipt>();

  create(run: CoopRunRecord): void {
    if (this.runs.has(run.id)) throw new Error('duplicate_run');
    this.runs.set(run.id, structuredClone(run));
  }

  getAuthorized(runId: string, accountId: string): CoopRunRecord {
    const run = this.runs.get(runId);
    if (!run) throw new Error('run_not_found');
    if (!run.accessAccountIds.includes(accountId)) throw new CoopDomainError('not_participant');
    return structuredClone(run);
  }

  compareAndSet(runId: string, expectedVersion: number, update: (run: CoopRunRecord) => CoopRunRecord): CoopRunRecord {
    const run = this.runs.get(runId);
    if (!run) throw new Error('run_not_found');
    if (run.stateVersion !== expectedVersion) throw new CoopDomainError('stale_state');
    const next = update(structuredClone(run));
    if (next.id !== run.id || next.stateVersion !== expectedVersion + 1) throw new Error('invalid_state_transition');
    this.runs.set(runId, structuredClone(next));
    return structuredClone(next);
  }

  read(callerAccountId: string, operation: string, resourceId: string, requestId: string): IdempotencyReceipt | undefined {
    const found = this.receipts.get(this.receiptKey(callerAccountId, operation, resourceId, requestId));
    return found ? structuredClone(found) : undefined;
  }

  write(receipt: IdempotencyReceipt): void {
    const key = this.receiptKey(receipt.callerAccountId, receipt.operation, receipt.resourceId, receipt.requestId);
    const current = this.receipts.get(key);
    if (current && current.requestHash !== receipt.requestHash) throw new CoopDomainError('idempotency_conflict');
    if (!current) this.receipts.set(key, structuredClone(receipt));
  }

  private receiptKey(accountId: string, operation: string, resourceId: string, requestId: string): string {
    return `${accountId}\u0000${operation}\u0000${resourceId}\u0000${requestId}`;
  }
}
