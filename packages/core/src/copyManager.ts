import { v4 as uuidv4 } from 'uuid';
import { FileCopy, CopyEntry } from './types';
import { Storage } from './storage';

export async function createCopy(
  storage: Storage,
  sourceFileId: string,
  agentId: string,
  lockId: string,
  initialContent: string,
): Promise<FileCopy> {
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

  await storage.writeCopy(copy);
  return copy;
}

export async function appendToCopy(
  storage: Storage,
  copy: FileCopy,
  content: string,
): Promise<FileCopy> {
  const nextSeq = copy.entries.length > 0 ? Math.max(...copy.entries.map((e) => e.seq)) + 1 : 1;
  const entry: CopyEntry = {
    seq: nextSeq,
    timestamp: new Date().toISOString(),
    content,
  };
  copy.entries.push(entry);
  await storage.writeCopy(copy);
  return copy;
}

export async function findPendingCopy(
  storage: Storage,
  fileId: string,
  agentId: string,
  lockId: string,
): Promise<FileCopy | undefined> {
  const copies = await storage.listCopiesForFile(fileId);
  return copies.find(
    (c) => c.status === 'pending' && c.agentId === agentId && c.lockId === lockId,
  );
}
