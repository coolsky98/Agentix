import { v4 as uuidv4 } from 'uuid';
import { Manifest, LockInfo } from './types';
import { FileNotFoundError, FileAlreadyLockedError, FileNotLockedError, NotLockOwnerError } from './errors';

export function acquireLock(manifest: Manifest, fileId: string, agentId: string): LockInfo {
  const file = manifest.files[fileId];
  if (!file) throw new FileNotFoundError(fileId);

  if (file.lock !== null) {
    if (file.lock.agentId === agentId) {
      // Already locked by same agent — idempotent
      return file.lock;
    }
    throw new FileAlreadyLockedError(fileId, file.lock.agentId);
  }

  const lockInfo: LockInfo = {
    agentId,
    lockedAt: new Date().toISOString(),
    lockId: uuidv4(),
  };

  manifest.files[fileId].lock = lockInfo;
  return lockInfo;
}

export function releaseLock(manifest: Manifest, fileId: string, agentId: string): void {
  const file = manifest.files[fileId];
  if (!file) throw new FileNotFoundError(fileId);
  if (file.lock === null) throw new FileNotLockedError(fileId);
  if (file.lock.agentId !== agentId) throw new NotLockOwnerError(fileId, agentId);

  manifest.files[fileId].lock = null;
}

export function getLockInfo(manifest: Manifest, fileId: string): LockInfo | null {
  const file = manifest.files[fileId];
  if (!file) throw new FileNotFoundError(fileId);
  return file.lock;
}
