import * as fs from 'fs';
import { Manifest } from './types';
import { manifestPath, manifestTmpPath, agentixDir } from './paths';
import { RepoNotInitializedError } from './errors';

export function readManifest(repoRoot: string): Manifest {
  const mp = manifestPath(repoRoot);
  if (!fs.existsSync(mp)) {
    throw new RepoNotInitializedError();
  }
  const raw = fs.readFileSync(mp, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export function writeManifest(repoRoot: string, manifest: Manifest): void {
  const tmp = manifestTmpPath(repoRoot);
  const dest = manifestPath(repoRoot);
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmp, dest);
}

export function isInitialized(repoRoot: string): boolean {
  return fs.existsSync(manifestPath(repoRoot));
}

export function initRepo(repoRoot: string): void {
  const dir = agentixDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(`${dir}/logs`, { recursive: true });
  fs.mkdirSync(`${dir}/copies`, { recursive: true });

  const manifest: Manifest = {
    version: '1.0.0',
    files: {},
  };
  writeManifest(repoRoot, manifest);
}
