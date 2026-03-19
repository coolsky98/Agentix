export class AgentixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RepoNotInitializedError extends AgentixError {
  constructor() {
    super('Repository is not initialized. Run `agentix init` first.');
  }
}

export class FileNotFoundError extends AgentixError {
  constructor(id: string) {
    super(`File not found: ${id}`);
  }
}

export class FileLockConflictError extends AgentixError {
  constructor(fileId: string, lockedBy: string) {
    super(`File ${fileId} is locked by agent ${lockedBy}`);
  }
}

export class NotLockOwnerError extends AgentixError {
  constructor(fileId: string, agentId: string) {
    super(`Agent ${agentId} does not hold the lock on file ${fileId}`);
  }
}

export class FileAlreadyLockedError extends AgentixError {
  constructor(fileId: string, lockedBy: string) {
    super(`File ${fileId} is already locked by agent ${lockedBy}`);
  }
}

export class FileNotLockedError extends AgentixError {
  constructor(fileId: string) {
    super(`File ${fileId} is not locked`);
  }
}

export class DuplicateFilePathError extends AgentixError {
  constructor(path: string) {
    super(`A file with path '${path}' is already tracked`);
  }
}
