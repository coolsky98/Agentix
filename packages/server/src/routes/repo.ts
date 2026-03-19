import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// POST /repo/init
router.post('/init', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await req.repo.init();
    res.status(201).json({ message: 'Repository initialized' });
  } catch (err) {
    next(err);
  }
});

// GET /status
router.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await req.repo.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

export { router as repoRouter };
