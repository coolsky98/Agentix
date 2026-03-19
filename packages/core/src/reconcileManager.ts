import { Manifest, ReconcileResult, LogEntry } from './types';
import { FileNotFoundError, FileNotLockedError, NotLockOwnerError } from './errors';
import { listCopiesForFile, persistCopy } from './copyManager';
import { appendLogEntry, getNextSeq } from './fileManager';

export function reconcileOnUnlock(
  repoRoot: string,
  manifest: Manifest,
  fileId: string,
  agentId: string,
): ReconcileResult {
  const file = manifest.files[fileId];
  if (!file) throw new FileNotFoundError(fileId);
  if (file.lock === null) throw new FileNotLockedError(fileId);
  if (file.lock.agentId !== agentId) throw new NotLockOwnerError(fileId, agentId);

  // Find all pending copies sorted by createdAt asc
  const pendingCopies = listCopiesForFile(repoRoot, fileId)
    .filter((c) => c.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const reconciledCopies: string[] = [];
  let appendedEntries = 0;

  // Reconcile each copy — append entries to main log first
  for (const copy of pendingCopies) {
    for (const entry of copy.entries) {
      const seq = getNextSeq(repoRoot, fileId);
      const logEntry: LogEntry = {
        seq,
        agentId: copy.agentId,
        timestamp: entry.timestamp,
        content: entry.content,
        type: 'copy-reconcile',
      };
      appendLogEntry(repoRoot, fileId, logEntry);
      appendedEntries++;
    }

    // Mark copy as reconciled
    copy.status = 'reconciled';
    persistCopy(repoRoot, copy);
    reconciledCopies.push(copy.copyId);
  }

  // Release lock last (safe failure mode)
  manifest.files[fileId].lock = null;

  return { reconciledCopies, appendedEntries };
}
