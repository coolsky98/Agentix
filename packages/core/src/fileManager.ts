import { v4 as uuidv4 } from 'uuid';
import { Manifest, TrackedFile, LogEntry } from './types';
import { Storage } from './storage';
import { FileNotFoundError, DuplicateFilePathError } from './errors';

export async function trackFile(
  manifest: Manifest,
  storage: Storage,
  name: string,
  filePath: string,
  agentId: string,
  initialContent?: string,
): Promise<TrackedFile> {
  // Check for duplicate path
  for (const f of Object.values(manifest.files)) {
    if (f.path === filePath) {
      throw new DuplicateFilePathError(filePath);
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  const tracked: TrackedFile = {
    id,
    name,
    path: filePath,
    createdAt: now,
    lock: null,
  };

  manifest.files[id] = tracked;

  // Create initial log entry
  const entry: LogEntry = {
    seq: 1,
    agentId,
    timestamp: now,
    content: initialContent ?? '',
    type: 'create',
  };
  await storage.appendLogEntry(id, entry);

  return tracked;
}

export async function replayContent(storage: Storage, fileId: string): Promise<string> {
  const entries = await storage.readLog(fileId);
  return entries.map((e) => e.content).join('');
}

export async function getNextSeq(storage: Storage, fileId: string): Promise<number> {
  const entries = await storage.readLog(fileId);
  if (entries.length === 0) return 1;
  return Math.max(...entries.map((e) => e.seq)) + 1;
}

export function getTrackedFile(manifest: Manifest, fileId: string): TrackedFile {
  const file = manifest.files[fileId];
  if (!file) throw new FileNotFoundError(fileId);
  return file;
}

export function findFileByPath(manifest: Manifest, filePath: string): TrackedFile | undefined {
  return Object.values(manifest.files).find((f) => f.path === filePath);
}
