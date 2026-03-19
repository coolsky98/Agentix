import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

function requireFields(fields: Record<string, unknown>, res: Response): boolean {
  const missing = Object.entries(fields)
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([k]) => k);
  if (missing.length > 0) {
    res.status(400).json({ error: 'ValidationError', message: `Missing required fields: ${missing.join(', ')}` });
    return false;
  }
  return true;
}

// POST /files — track a new file
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, path, agentId, initialContent } = req.body as {
      name?: string;
      path: string;
      agentId: string;
      initialContent?: string;
    };
    if (!requireFields({ path, agentId }, res)) return;
    const resolvedName = (name && name.trim()) || path.split('/').pop()!;
    const file = await req.repo.trackFile(resolvedName, path, agentId, initialContent);
    res.status(201).json(file);
  } catch (err) {
    next(err);
  }
});

// GET /files — list all tracked files
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = await req.repo.listFiles();
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// GET /files/:id — get file with replayed content
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await req.repo.getFile(req.params.id);
    res.json(file);
  } catch (err) {
    next(err);
  }
});

// POST /files/:id/lock — acquire lock
router.post('/:id/lock', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { agentId } = req.body as { agentId: string };
    if (!requireFields({ agentId }, res)) return;
    const file = await req.repo.lockFile(req.params.id, agentId);
    res.json(file);
  } catch (err) {
    next(err);
  }
});

// DELETE /files/:id/lock — release lock + reconcile
router.delete(
  '/:id/lock',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.query.agentId as string;
      if (!requireFields({ agentId }, res)) return;
      const result = await req.repo.unlockFile(req.params.id, agentId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /files/:id/append — append content
router.post(
  '/:id/append',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { agentId, content } = req.body as { agentId: string; content: string };
      if (!requireFields({ agentId, content }, res)) return;
      const result = await req.repo.appendToFile(req.params.id, agentId, content);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /files/:id/copies — list copies
router.get(
  '/:id/copies',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const copies = await req.repo.listCopies(req.params.id);
      res.json(copies);
    } catch (err) {
      next(err);
    }
  },
);

// GET /files/:id/log — get append log
router.get('/:id/log', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const log = await req.repo.getLog(req.params.id);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

export { router as filesRouter };
