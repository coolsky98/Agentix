import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileCopy, CopyEntry } from './types';
import { copyPath, copiesDir } from './paths';

export function createCopy(
  repoRoot: string,
  sourceFileId: string,
  agentId: string,
  lockId: string,
  initialContent: string,
): FileCopy {
  const copyId = uuidv4();
  const now = new Date().toISOString();

  const firstEntry: CopyEntry = {
    seq: 1,
    timestamp: now,
    content: initialContent,
  };

  const copy: FileCopy = {
    copyId,
    sourceFileId,
    agentId,
    createdAt: now,
    lockId,
    status: 'pending',
    entries: [firstEntry],
  };

  persistCopy(repoRoot, copy);
  return copy;
}

export function appendToCopy(repoRoot: string, copy: FileCopy, content: string): FileCopy {
  const nextSeq = copy.entries.length > 0 ? Math.max(...copy.entries.map((e) => e.seq)) + 1 : 1;
  const entry: CopyEntry = {
    seq: nextSeq,
    timestamp: new Date().toISOString(),
    content,
  };
  copy.entries.push(entry);
  persistCopy(repoRoot, copy);
  return copy;
}

export function persistCopy(repoRoot: string, copy: FileCopy): void {
  const cp = copyPath(repoRoot, copy.copyId);
  fs.writeFileSync(cp, JSON.stringify(copy, null, 2), 'utf-8');
}

export function readCopy(repoRoot: string, copyId: string): FileCopy | null {
  const cp = copyPath(repoRoot, copyId);
  if (!fs.existsSync(cp)) return null;
  return JSON.parse(fs.readFileSync(cp, 'utf-8')) as FileCopy;
}

export function listCopiesForFile(repoRoot: string, fileId: string): FileCopy[] {
  const dir = copiesDir(repoRoot);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const copies: FileCopy[] = [];

  for (const f of files) {
    try {
      const raw = fs.readFileSync(`${dir}/${f}`, 'utf-8');
      const copy = JSON.parse(raw) as FileCopy;
      if (copy.sourceFileId === fileId) {
        copies.push(copy);
      }
    } catch {
      // Skip malformed files
    }
  }

  return copies;
}

export function findPendingCopy(
  repoRoot: string,
  fileId: string,
  agentId: string,
  lockId: string,
): FileCopy | undefined {
  const copies = listCopiesForFile(repoRoot, fileId);
  return copies.find(
    (c) => c.status === 'pending' && c.agentId === agentId && c.lockId === lockId,
  );
}
