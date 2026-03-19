import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AGENT_ID_RE = /^[a-zA-Z0-9\-_.:@]{1,128}$/;
const PATH_RE = /^[a-zA-Z0-9\-_./@]{1,500}$/;
const MAX_CONTENT_BYTES = 50 * 1024; // 50 KB

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

function validateUuid(id: string, res: Response): boolean {
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'ValidationError', message: `Invalid file id: must be a UUID` });
    return false;
  }
  return true;
}

function validateAgentId(agentId: string, res: Response): boolean {
  if (!AGENT_ID_RE.test(agentId)) {
    res.status(400).json({ error: 'ValidationError', message: 'agentId must be 1–128 chars, alphanumeric or -_.:@' });
    return false;
  }
  return true;
}

function validatePath(path: string, res: Response): boolean {
  if (path.split('/').some(seg => seg === '..') || path.startsWith('/') || !PATH_RE.test(path)) {
    res.status(400).json({ error: 'ValidationError', message: 'path must be a relative path using safe characters only' });
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
    if (!validatePath(path, res)) return;
    if (!validateAgentId(agentId, res)) return;
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
    if (!validateUuid(req.params.id, res)) return;
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
    if (!validateUuid(req.params.id, res)) return;
    if (!validateAgentId(agentId, res)) return;
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
      if (!validateUuid(req.params.id, res)) return;
      if (!validateAgentId(agentId, res)) return;
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
      if (!validateUuid(req.params.id, res)) return;
      if (!validateAgentId(agentId, res)) return;
      if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
        res.status(413).json({ error: 'ValidationError', message: `content exceeds 50 KB limit` });
        return;
      }
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
      if (!validateUuid(req.params.id, res)) return;
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
    if (!validateUuid(req.params.id, res)) return;
    const log = await req.repo.getLog(req.params.id);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

export { router as filesRouter };
