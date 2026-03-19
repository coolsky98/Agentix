export interface LockInfo {
  agentId: string;
  lockedAt: string;
  lockId: string;
}

export interface TrackedFile {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lock: LockInfo | null;
}

export type LogEntryType = 'create' | 'append' | 'copy-reconcile';

export interface LogEntry {
  seq: number;
  agentId: string;
  timestamp: string;
  content: string;
  type: LogEntryType;
}

export interface CopyEntry {
  seq: number;
  timestamp: string;
  content: string;
}

export type CopyStatus = 'pending' | 'reconciled';

export interface FileCopy {
  copyId: string;
  sourceFileId: string;
  agentId: string;
  createdAt: string;
  lockId: string;
  status: CopyStatus;
  entries: CopyEntry[];
}

export interface Manifest {
  version: '1.0.0';
  files: Record<string, TrackedFile>;
}

export interface AppendResult {
  action: 'appended' | 'copy-created';
  copyId?: string;
  fileId: string;
  seq: number;
}

export interface ReconcileResult {
  reconciledCopies: string[];
  appendedEntries: number;
}

export interface RepoInfo {
  repoId: string;
  name: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface RepoRecord extends RepoInfo {
  secret: string | null;
}
