import {
  AppendResult,
  ReconcileResult,
  TrackedFile,
  LogEntry,
  FileCopy,
} from './types';
import { readManifest, writeManifest, initRepo, isInitialized } from './manifest';
import { acquireLock } from './lockManager';
import {
  trackFile,
  appendLogEntry,
  readLog,
  replayContent,
  getNextSeq,
  getTrackedFile,
  findFileByPath,
} from './fileManager';
import { createCopy, appendToCopy, findPendingCopy, listCopiesForFile } from './copyManager';
import { reconcileOnUnlock } from './reconcileManager';

export class RepoManager {
  constructor(private readonly repoRoot: string) {}

  init(): void {
    initRepo(this.repoRoot);
  }

  isInitialized(): boolean {
    return isInitialized(this.repoRoot);
  }

  trackFile(name: string, filePath: string, agentId: string, initialContent?: string): TrackedFile {
    const manifest = readManifest(this.repoRoot);
    const file = trackFile(manifest, this.repoRoot, name, filePath, agentId, initialContent);
    writeManifest(this.repoRoot, manifest);
    return file;
  }

  lockFile(fileId: string, agentId: string): TrackedFile {
    const manifest = readManifest(this.repoRoot);
    acquireLock(manifest, fileId, agentId);
    writeManifest(this.repoRoot, manifest);
    return manifest.files[fileId];
  }

  unlockFile(fileId: string, agentId: string): ReconcileResult {
    const manifest = readManifest(this.repoRoot);
    const result = reconcileOnUnlock(this.repoRoot, manifest, fileId, agentId);
    writeManifest(this.repoRoot, manifest);
    return result;
  }

  appendToFile(fileId: string, agentId: string, content: string): AppendResult {
    const manifest = readManifest(this.repoRoot);
    const file = getTrackedFile(manifest, fileId);

    if (file.lock === null || file.lock.agentId === agentId) {
      // Direct append
      const seq = getNextSeq(this.repoRoot, fileId);
      const entry: LogEntry = {
        seq,
        agentId,
        timestamp: new Date().toISOString(),
        content,
        type: 'append',
      };
      appendLogEntry(this.repoRoot, fileId, entry);
      return { action: 'appended', fileId, seq };
    }

    // File locked by another agent — create or append to copy
    const lockId = file.lock.lockId;
    const existingCopy = findPendingCopy(this.repoRoot, fileId, agentId, lockId);

    if (existingCopy) {
      const updated = appendToCopy(this.repoRoot, existingCopy, content);
      const seq = updated.entries[updated.entries.length - 1].seq;
      return { action: 'copy-created', copyId: existingCopy.copyId, fileId, seq };
    }

    const copy = createCopy(this.repoRoot, fileId, agentId, lockId, content);
    return { action: 'copy-created', copyId: copy.copyId, fileId, seq: 1 };
  }

  getFile(fileId: string): TrackedFile & { content: string } {
    const manifest = readManifest(this.repoRoot);
    const file = getTrackedFile(manifest, fileId);
    const content = replayContent(this.repoRoot, fileId);
    return { ...file, content };
  }

  listFiles(): TrackedFile[] {
    const manifest = readManifest(this.repoRoot);
    return Object.values(manifest.files);
  }

  getLog(fileId: string): LogEntry[] {
    const manifest = readManifest(this.repoRoot);
    getTrackedFile(manifest, fileId); // validates existence
    return readLog(this.repoRoot, fileId);
  }

  listCopies(fileId: string): FileCopy[] {
    const manifest = readManifest(this.repoRoot);
    getTrackedFile(manifest, fileId);
    return listCopiesForFile(this.repoRoot, fileId);
  }

  findFileByPath(filePath: string): TrackedFile | undefined {
    const manifest = readManifest(this.repoRoot);
    return findFileByPath(manifest, filePath);
  }

  getStatus(): {
    files: TrackedFile[];
    lockedFiles: number;
    pendingCopies: number;
  } {
    const manifest = readManifest(this.repoRoot);
    const files = Object.values(manifest.files);
    const lockedFiles = files.filter((f) => f.lock !== null).length;

    let pendingCopies = 0;
    for (const file of files) {
      const copies = listCopiesForFile(this.repoRoot, file.id);
      pendingCopies += copies.filter((c) => c.status === 'pending').length;
    }

    return { files, lockedFiles, pendingCopies };
  }
}
