import { Request, Response, NextFunction } from 'express';
import { RepoManager } from '@agentix/core';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      repo: RepoManager;
    }
  }
}

export function repoContext(repoRoot: string) {
  const repo = new RepoManager(repoRoot);
  return (_req: Request, res: Response, next: NextFunction): void => {
    _req.repo = repo;
    next();
  };
}
