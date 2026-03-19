import { Request, Response, NextFunction } from 'express';
import { RepoManager, Storage } from '@agentix/core';

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
  return (_req: Request, res: Response, next: NextFunction): void => {
    _req.repo = repo;
    next();
  };
}
