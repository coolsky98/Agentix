import express, { Request, Response, NextFunction } from 'express';
import { Storage } from '@agentix/core';
import { repoContext } from './middleware/repoContext';
import { errorHandler } from './middleware/errorHandler';
import { repoRouter } from './routes/repo';
import { filesRouter } from './routes/files';

const STATUS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agentix API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    p { color: #555; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    ul { color: #555; line-height: 1.8; }
  </style>
</head>
<body>
  <h1>Agentix API</h1>
  <p>Status: <strong style="color:green">online</strong></p>
  <p>Available endpoints:</p>
  <ul>
    <li><code>GET /status</code> — repo status</li>
    <li><code>POST /repo/init</code> — initialize repo</li>
    <li><code>GET /files</code> — list files</li>
  </ul>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;

export function createApp(storage: Storage) {
  const app = express();

  app.use(express.json());
  app.use(repoContext(storage));

  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(STATUS_PAGE);
  });

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
