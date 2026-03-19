import { Request, Response, NextFunction } from 'express';
import {
  AgentixError,
  RepoNotInitializedError,
  FileNotFoundError,
  FileLockConflictError,
  NotLockOwnerError,
  FileAlreadyLockedError,
  FileNotLockedError,
  DuplicateFilePathError,
} from '@agentix/core';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof RepoNotInitializedError) {
    res.status(409).json({ error: err.name, message: err.message });
    return;
  }
  if (err instanceof FileNotFoundError) {
    res.status(404).json({ error: err.name, message: err.message });
    return;
  }
  if (err instanceof FileLockConflictError) {
    res.status(423).json({ error: err.name, message: err.message });
    return;
  }
  if (err instanceof NotLockOwnerError) {
    res.status(403).json({ error: err.name, message: err.message });
    return;
  }
  if (
    err instanceof FileAlreadyLockedError ||
    err instanceof FileNotLockedError ||
    err instanceof DuplicateFilePathError
  ) {
    res.status(409).json({ error: err.name, message: err.message });
    return;
  }
  if (err instanceof AgentixError) {
    res.status(400).json({ error: err.name, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'InternalError', message: err.message });
}
