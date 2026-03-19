import * as fs from 'fs';
import { Storage } from './storage';
import { Manifest, LogEntry, FileCopy } from './types';
import { RepoNotInitializedError } from './errors';
import { manifestPath, manifestTmpPath, agentixDir, logPath, copyPath, copiesDir } from './paths';

export class FilesystemStorage implements Storage {
  constructor(private readonly repoRoot: string) {}

  async readManifest(): Promise<Manifest> {
    const mp = manifestPath(this.repoRoot);
    if (!fs.existsSync(mp)) {
      throw new RepoNotInitializedError();
    }
    const raw = fs.readFileSync(mp, 'utf-8');
    return JSON.parse(raw) as Manifest;
  }

  async writeManifest(manifest: Manifest): Promise<void> {
    const tmp = manifestTmpPath(this.repoRoot);
    const dest = manifestPath(this.repoRoot);
    fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2), 'utf-8');
    fs.renameSync(tmp, dest);
  }

  async isInitialized(): Promise<boolean> {
    return fs.existsSync(manifestPath(this.repoRoot));
  }

  async initRepo(): Promise<void> {
    const dir = agentixDir(this.repoRoot);
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(`${dir}/logs`, { recursive: true });
    fs.mkdirSync(`${dir}/copies`, { recursive: true });

    const manifest: Manifest = { version: '1.0.0', files: {} };
    await this.writeManifest(manifest);
  }

  async appendLogEntry(fileId: string, entry: LogEntry): Promise<void> {
    const lp = logPath(this.repoRoot, fileId);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(lp, line, 'utf-8');
  }

  async readLog(fileId: string): Promise<LogEntry[]> {
    const lp = logPath(this.repoRoot, fileId);
    if (!fs.existsSync(lp)) return [];
    const raw = fs.readFileSync(lp, 'utf-8');
    return raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as LogEntry);
  }

  async writeCopy(copy: FileCopy): Promise<void> {
    const cp = copyPath(this.repoRoot, copy.copyId);
    fs.writeFileSync(cp, JSON.stringify(copy, null, 2), 'utf-8');
  }

  async readCopy(copyId: string): Promise<FileCopy | null> {
    const cp = copyPath(this.repoRoot, copyId);
    if (!fs.existsSync(cp)) return null;
    return JSON.parse(fs.readFileSync(cp, 'utf-8')) as FileCopy;
  }

  async listCopiesForFile(fileId: string): Promise<FileCopy[]> {
    const dir = copiesDir(this.repoRoot);
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
}
