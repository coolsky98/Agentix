import express, { Request, Response, NextFunction } from 'express';
import { Storage } from '@agentix/core';
import { repoContext } from './middleware/repoContext';
import { errorHandler } from './middleware/errorHandler';
import { repoRouter } from './routes/repo';
import { filesRouter } from './routes/files';

export function createApp(storage: Storage) {
  const app = express();

  app.use(express.json());
  app.use(repoContext(storage));

  app.use('/repo', repoRouter);

  // GET /status — top-level status endpoint
  app.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await req.repo.getStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  app.use('/files', filesRouter);

  app.use(errorHandler);

  return app;
}
