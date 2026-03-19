import * as path from 'path';
import { createApp } from './app';
import { FilesystemStorage, RepoRecord, RepoInfo } from '@agentix/core';

export { createApp };

// Only start server when run directly
if (require.main === module) {
  const repoRoot = process.env.AGENTREPO_ROOT ?? process.cwd();
  const port = parseInt(process.env.PORT ?? '3000', 10);

  const storageFactory = (repoId: string) =>
    new FilesystemStorage(path.join(repoRoot, repoId));

  // Simple in-memory registry for local dev (resets on restart)
  const records = new Map<string, RepoRecord>();
  const memRegistry = {
    async listRepos(): Promise<RepoInfo[]> {
      return [...records.values()].map(({ repoId, name, isPrivate, createdAt }) => ({
        repoId, name, isPrivate, createdAt,
      }));
    },
    async getRepo(id: string): Promise<RepoRecord | null> {
      return records.get(id) ?? null;
    },
    async saveRepo(repo: RepoRecord): Promise<void> {
      records.set(repo.repoId, repo);
    },
  };

  const app = createApp(storageFactory, memRegistry);

  app.listen(port, () => {
    console.log(`Agentix server running on port ${port}`);
    console.log(`Repo root: ${repoRoot}`);
  });
}
