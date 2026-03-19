import express, { Request, Response, NextFunction } from 'express';
import { repoContext } from './middleware/repoContext';
import { errorHandler } from './middleware/errorHandler';
import { repoRouter } from './routes/repo';
import { filesRouter } from './routes/files';

export function createApp(repoRoot: string) {
  const app = express();

  app.use(express.json());
  app.use(repoContext(repoRoot));

  app.use('/repo', repoRouter);

  // GET /status — top-level status endpoint
  app.get('/status', (req: Request, res: Response, next: NextFunction): void => {
    try {
      const status = req.repo.getStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  app.use('/files', filesRouter);

  app.use(errorHandler);

  return app;
}
