import { Manifest, LogEntry, FileCopy } from './types';

export interface Storage {
  // Manifest
  readManifest(): Promise<Manifest>;
  writeManifest(manifest: Manifest): Promise<void>;
  isInitialized(): Promise<boolean>;
  initRepo(): Promise<void>;
  // Log
  appendLogEntry(fileId: string, entry: LogEntry): Promise<void>;
  readLog(fileId: string): Promise<LogEntry[]>;
  // Copies
  writeCopy(copy: FileCopy): Promise<void>;
  readCopy(copyId: string): Promise<FileCopy | null>;
  listCopiesForFile(fileId: string): Promise<FileCopy[]>;
}
