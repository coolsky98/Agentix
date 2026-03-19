import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// POST /repo/init
router.post('/init', (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.repo.init();
    res.status(201).json({ message: 'Repository initialized' });
  } catch (err) {
    next(err);
  }
});

// GET /status
router.get('/status', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const status = req.repo.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

export { router as repoRouter };
