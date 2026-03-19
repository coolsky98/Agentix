import { kv } from '@vercel/kv';
import { RepoRegistry, RepoInfo, RepoRecord } from '@agentix/core';

export class KvRegistry implements RepoRegistry {
  private readonly REGISTRY_KEY = 'repos:index';

  async listRepos(): Promise<RepoInfo[]> {
    const records = (await kv.get<RepoRecord[]>(this.REGISTRY_KEY)) ?? [];
    return records.map(({ repoId, name, isPrivate, createdAt }) => ({
      repoId,
      name,
      isPrivate,
      createdAt,
    }));
  }

  async getRepo(repoId: string): Promise<RepoRecord | null> {
    const records = (await kv.get<RepoRecord[]>(this.REGISTRY_KEY)) ?? [];
    return records.find((r) => r.repoId === repoId) ?? null;
  }

  async saveRepo(repo: RepoRecord): Promise<void> {
    const records = (await kv.get<RepoRecord[]>(this.REGISTRY_KEY)) ?? [];
    records.push(repo);
    await kv.set(this.REGISTRY_KEY, records);
  }
}
