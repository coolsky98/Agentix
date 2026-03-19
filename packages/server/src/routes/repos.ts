import { Router, Request, Response, NextFunction } from 'express';
import { RepoRegistry, Storage } from '@agentix/core';
import { scopedRepoContext } from '../middleware/repoContext';
import { filesRouter } from './files';

const REPO_NAME_RE = /^[a-zA-Z0-9\-_.]{1,64}$/;

export function createReposRouter(
  storageFactory: (repoId: string) => Storage,
  registry: RepoRegistry,
): Router {
  const router = Router();

  // POST /repos — create a new repo
  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, isPrivate = false } = req.body as { name?: string; isPrivate?: boolean };
      if (!name) {
        res.status(400).json({ error: 'ValidationError', message: 'Missing required field: name' });
        return;
      }
      if (!REPO_NAME_RE.test(name)) {
        res
          .status(400)
          .json({ error: 'ValidationError', message: 'name must be 1–64 chars, alphanumeric or -_.' });
        return;
      }
      const repoId = crypto.randomUUID();
      const secret = isPrivate ? crypto.randomUUID() : null;
      const record = {
        repoId,
        name,
        isPrivate: Boolean(isPrivate),
        createdAt: new Date().toISOString(),
        secret,
      };
      await registry.saveRepo(record);
      await storageFactory(repoId).initRepo();
      const response: Record<string, unknown> = {
        repoId,
        name,
        isPrivate: record.isPrivate,
        createdAt: record.createdAt,
      };
      if (secret) response.secret = secret;
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  // GET /repos — list all repos (public info only, no secrets)
  router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repos = await registry.listRepos();
      res.json(repos);
    } catch (err) {
      next(err);
    }
  });

  // All /:repoId/... routes — auth-gated per repo
  const repoRouter = Router({ mergeParams: true });
  repoRouter.use(scopedRepoContext(storageFactory, registry));

  repoRouter.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await req.repo.getStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  repoRouter.use('/files', filesRouter);

  router.use('/:repoId', repoRouter);

  return router;
}
