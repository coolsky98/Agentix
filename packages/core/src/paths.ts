import * as path from 'path';

export function agentixDir(repoRoot: string): string {
  return path.join(repoRoot, '.agentix');
}

export function manifestPath(repoRoot: string): string {
  return path.join(agentixDir(repoRoot), 'manifest.json');
}

export function manifestTmpPath(repoRoot: string): string {
  return path.join(agentixDir(repoRoot), 'manifest.json.tmp');
}

export function logsDir(repoRoot: string): string {
  return path.join(agentixDir(repoRoot), 'logs');
}

export function logPath(repoRoot: string, fileId: string): string {
  return path.join(logsDir(repoRoot), `${fileId}.jsonl`);
}

export function copiesDir(repoRoot: string): string {
  return path.join(agentixDir(repoRoot), 'copies');
}

export function copyPath(repoRoot: string, copyId: string): string {
  return path.join(copiesDir(repoRoot), `${copyId}.json`);
}
