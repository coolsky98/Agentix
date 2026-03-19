import { AppendResult, ReconcileResult, TrackedFile, LogEntry, FileCopy } from './types';
import { Storage } from './storage';
import { acquireLock } from './lockManager';
import {
  trackFile,
  replayContent,
  getNextSeq,
  getTrackedFile,
  findFileByPath,
} from './fileManager';
import { LimitExceededError } from './errors';
import { createCopy, appendToCopy, findPendingCopy } from './copyManager';
import { reconcileOnUnlock } from './reconcileManager';

export class RepoManager {
  constructor(private readonly storage: Storage) {}

  async init(): Promise<void> {
    await this.storage.initRepo();
  }

  async isInitialized(): Promise<boolean> {
    return this.storage.isInitialized();
  }

  async trackFile(
    name: string,
    filePath: string,
    agentId: string,
    initialContent?: string,
  ): Promise<TrackedFile> {
    const manifest = await this.storage.readManifest();
    const MAX_FILES = 500;
    if (Object.keys(manifest.files).length >= MAX_FILES) {
      throw new LimitExceededError(`Repository limit of ${MAX_FILES} files reached.`);
    }
    const file = await trackFile(manifest, this.storage, name, filePath, agentId, initialContent);
    await this.storage.writeManifest(manifest);
    return file;
  }

  async lockFile(fileId: string, agentId: string): Promise<TrackedFile> {
    const manifest = await this.storage.readManifest();
    acquireLock(manifest, fileId, agentId);
    await this.storage.writeManifest(manifest);
    return manifest.files[fileId];
  }

  async unlockFile(fileId: string, agentId: string): Promise<ReconcileResult> {
    const manifest = await this.storage.readManifest();
    const result = await reconcileOnUnlock(this.storage, manifest, fileId, agentId);
    await this.storage.writeManifest(manifest);
    return result;
  }

  async appendToFile(fileId: string, agentId: string, content: string): Promise<AppendResult> {
    const manifest = await this.storage.readManifest();
    const file = getTrackedFile(manifest, fileId);

    if (file.lock === null || file.lock.agentId === agentId) {
      // Direct append
      const seq = await getNextSeq(this.storage, fileId);
      const entry: LogEntry = {
        seq,
        agentId,
        timestamp: new Date().toISOString(),
        content,
        type: 'append',
      };
      await this.storage.appendLogEntry(fileId, entry);
      return { action: 'appended', fileId, seq };
    }

    // File locked by another agent — create or append to copy
    const lockId = file.lock.lockId;
    const existingCopy = await findPendingCopy(this.storage, fileId, agentId, lockId);

    if (existingCopy) {
      const updated = await appendToCopy(this.storage, existingCopy, content);
      const seq = updated.entries[updated.entries.length - 1].seq;
      return { action: 'copy-created', copyId: existingCopy.copyId, fileId, seq };
    }

    const copy = await createCopy(this.storage, fileId, agentId, lockId, content);
    return { action: 'copy-created', copyId: copy.copyId, fileId, seq: 1 };
  }

  async getFile(fileId: string): Promise<TrackedFile & { content: string }> {
    const manifest = await this.storage.readManifest();
    const file = getTrackedFile(manifest, fileId);
    const content = await replayContent(this.storage, fileId);
    return { ...file, content };
  }

  async listFiles(): Promise<TrackedFile[]> {
    const manifest = await this.storage.readManifest();
    return Object.values(manifest.files);
  }

  async getLog(fileId: string): Promise<LogEntry[]> {
    const manifest = await this.storage.readManifest();
    getTrackedFile(manifest, fileId); // validates existence
    return this.storage.readLog(fileId);
  }

  async listCopies(fileId: string): Promise<FileCopy[]> {
    const manifest = await this.storage.readManifest();
    getTrackedFile(manifest, fileId);
    return this.storage.listCopiesForFile(fileId);
  }

  async findFileByPath(filePath: string): Promise<TrackedFile | undefined> {
    const manifest = await this.storage.readManifest();
    return findFileByPath(manifest, filePath);
  }

  async getStatus(): Promise<{
    files: TrackedFile[];
    lockedFiles: number;
    pendingCopies: number;
  }> {
    const manifest = await this.storage.readManifest();
    const files = Object.values(manifest.files);
    const lockedFiles = files.filter((f) => f.lock !== null).length;

    let pendingCopies = 0;
    for (const file of files) {
      const copies = await this.storage.listCopiesForFile(file.id);
      pendingCopies += copies.filter((c) => c.status === 'pending').length;
    }

    return { files, lockedFiles, pendingCopies };
  }
}
