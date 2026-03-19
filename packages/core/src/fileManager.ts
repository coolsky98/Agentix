import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Manifest, TrackedFile, LogEntry, LogEntryType } from './types';
import { logPath } from './paths';
import { FileNotFoundError, DuplicateFilePathError } from './errors';

export function trackFile(
  manifest: Manifest,
  repoRoot: string,
  name: string,
  filePath: string,
  agentId: string,
  initialContent?: string,
): TrackedFile {
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
  appendLogEntry(repoRoot, id, entry);

  return tracked;
}

export function appendLogEntry(repoRoot: string, fileId: string, entry: LogEntry): void {
  const lp = logPath(repoRoot, fileId);
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(lp, line, 'utf-8');
}

export function readLog(repoRoot: string, fileId: string): LogEntry[] {
  const lp = logPath(repoRoot, fileId);
  if (!fs.existsSync(lp)) return [];
  const raw = fs.readFileSync(lp, 'utf-8');
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as LogEntry);
}

export function replayContent(repoRoot: string, fileId: string): string {
  const entries = readLog(repoRoot, fileId);
  return entries.map((e) => e.content).join('');
}

export function getNextSeq(repoRoot: string, fileId: string): number {
  const entries = readLog(repoRoot, fileId);
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
