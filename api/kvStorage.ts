import { kv } from '@vercel/kv';
import { Storage, Manifest, LogEntry, FileCopy, RepoNotInitializedError } from '@agentix/core';

export class KvStorage implements Storage {
  async readManifest(): Promise<Manifest> {
    const data = await kv.get<Manifest>('manifest');
    if (!data) throw new RepoNotInitializedError();
    return data;
  }

  async writeManifest(manifest: Manifest): Promise<void> {
    await kv.set('manifest', manifest);
  }

  async isInitialized(): Promise<boolean> {
    const exists = await kv.exists('manifest');
    return exists === 1;
  }

  async initRepo(): Promise<void> {
    const manifest: Manifest = { version: '1.0.0', files: {} };
    await this.writeManifest(manifest);
  }

  async appendLogEntry(fileId: string, entry: LogEntry): Promise<void> {
    const key = `log:${fileId}`;
    const existing = (await kv.get<LogEntry[]>(key)) ?? [];
    existing.push(entry);
    await kv.set(key, existing);
  }

  async readLog(fileId: string): Promise<LogEntry[]> {
    return (await kv.get<LogEntry[]>(`log:${fileId}`)) ?? [];
  }

  async writeCopy(copy: FileCopy): Promise<void> {
    await kv.set(`copy:${copy.copyId}`, copy);
    // Track copyId under the file's copy list
    const copiesKey = `copies:${copy.sourceFileId}`;
    const existing = (await kv.get<string[]>(copiesKey)) ?? [];
    if (!existing.includes(copy.copyId)) {
      existing.push(copy.copyId);
      await kv.set(copiesKey, existing);
    }
  }

  async readCopy(copyId: string): Promise<FileCopy | null> {
    return kv.get<FileCopy>(`copy:${copyId}`);
  }

  async listCopiesForFile(fileId: string): Promise<FileCopy[]> {
    const copyIds = (await kv.get<string[]>(`copies:${fileId}`)) ?? [];
    const copies: FileCopy[] = [];
    for (const id of copyIds) {
      const copy = await this.readCopy(id);
      if (copy) copies.push(copy);
    }
    return copies;
  }
}
