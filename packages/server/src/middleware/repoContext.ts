import { Request, Response, NextFunction } from 'express';
import { RepoManager, Storage, RepoRegistry } from '@agentix/core';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      repo: RepoManager;
    }
  }
}

export function repoContext(storage: Storage) {
  const repo = new RepoManager(storage);
  return (_req: Request, _res: Response, next: NextFunction): void => {
    _req.repo = repo;
    next();
  };
}

export function scopedRepoContext(
  storageFactory: (repoId: string) => Storage,
  registry: RepoRegistry,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { repoId } = req.params;
    const record = await registry.getRepo(repoId);
    if (!record) {
      res.status(404).json({ error: 'NotFound', message: `Repository '${repoId}' not found` });
      return;
    }
    if (record.isPrivate) {
      const secret = req.headers['x-repo-secret'] as string | undefined;
      if (!secret || secret !== record.secret) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing X-Repo-Secret header',
        });
        return;
      }
    }
    req.repo = new RepoManager(storageFactory(repoId));
    next();
  };
}
