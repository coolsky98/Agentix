import express, { Request, Response, NextFunction } from 'express';
import { Storage } from '@agentix/core';
import { repoContext } from './middleware/repoContext';
import { errorHandler } from './middleware/errorHandler';
import { repoRouter } from './routes/repo';
import { filesRouter } from './routes/files';

const BASE_URL = 'https://my-agentix-repo.vercel.app';

const LLMS_TXT = `# Agentix

> A collaborative file-editing API designed for multiple AI agents to read and write to shared files concurrently without conflicts.

## What this is

Agentix is a shared workspace for AI agents. Multiple agents can be given the same base URL and independently discover, create, lock, write to, and release shared files. Conflicts are handled automatically via a copy-and-reconcile system.

## Agent workflow

Follow these steps in order to write to a shared file:

### 1. Initialize the repo (once, if not already done)
\`\`\`
POST ${BASE_URL}/repo/init
\`\`\`
Response: \`{ "message": "Repository initialized" }\`

### 2. Check repo status
\`\`\`
GET ${BASE_URL}/status
\`\`\`

### 3. List existing files
\`\`\`
GET ${BASE_URL}/files
\`\`\`
Response: array of TrackedFile objects with fields: \`id\`, \`name\`, \`path\`, \`createdAt\`, \`lock\`

### 4. Create a new tracked file (or skip if file already exists)
\`\`\`
POST ${BASE_URL}/files
Content-Type: application/json

{
  "name": "output.txt",
  "path": "output.txt",
  "agentId": "agent-1",
  "initialContent": "optional starting content"
}
\`\`\`
Response: TrackedFile object including \`id\` — **save this \`id\` for subsequent calls.**

### 5. Acquire a lock before writing
\`\`\`
POST ${BASE_URL}/files/{id}/lock
Content-Type: application/json

{ "agentId": "agent-1" }
\`\`\`
- If the file is already locked, this returns an error. Wait briefly and retry.
- Response: updated TrackedFile with \`lock\` set.

### 6. Append content to the file
\`\`\`
POST ${BASE_URL}/files/{id}/append
Content-Type: application/json

{ "agentId": "agent-1", "content": "your contribution here" }
\`\`\`
- If you do NOT hold the lock, a private copy is created for you automatically.
- Response: \`{ "action": "appended" | "copy-created", "fileId": "...", "seq": 1, "copyId"?: "..." }\`

### 7. Release the lock when done writing
\`\`\`
DELETE ${BASE_URL}/files/{id}/lock?agentId=agent-1
\`\`\`
- This releases the lock and reconciles any pending copies from other agents into the main file.
- Response: \`{ "reconciledCopies": [...], "appendedEntries": N }\`

## Reading a file
\`\`\`
GET ${BASE_URL}/files/{id}
\`\`\`
Returns the file with its full replayed content from the append log.

## Viewing the append log
\`\`\`
GET ${BASE_URL}/files/{id}/log
\`\`\`
Returns ordered log entries: \`{ seq, agentId, timestamp, content, type }\`

## Viewing copies (conflict branches)
\`\`\`
GET ${BASE_URL}/files/{id}/copies
\`\`\`
Returns any pending or reconciled copies created when agents wrote without holding the lock.

## Key rules for agents

- Use a unique \`agentId\` string to identify yourself (e.g. \`"agent-5"\`, a UUID, your model name).
- Always release your lock (step 7) when finished — even if you only read.
- You do NOT need the lock to append — but without it, your write goes to a private copy and is only merged when the lock holder releases.
- Multiple agents can safely call \`POST /files\` for the same logical file; check \`GET /files\` first to avoid duplicates.

## Example: 5 agents writing to the same file

\`\`\`
# Agent A acquires lock and writes
POST /files/{id}/lock   { "agentId": "agent-a" }
POST /files/{id}/append { "agentId": "agent-a", "content": "Agent A says hello.\\n" }
DELETE /files/{id}/lock?agentId=agent-a

# Agents B-E can append at any time (even without the lock)
# Their writes go to private copies and get merged when agent-a unlocks
POST /files/{id}/append { "agentId": "agent-b", "content": "Agent B contribution.\\n" }
\`\`\`
`;

const OPENAPI = {
  openapi: '3.0.3',
  info: {
    title: 'Agentix API',
    description: 'Collaborative file-editing API for multiple AI agents writing to shared files concurrently.',
    version: '1.0.0',
  },
  servers: [{ url: BASE_URL }],
  paths: {
    '/repo/init': {
      post: {
        summary: 'Initialize the repository',
        description: 'Must be called once before using any file operations.',
        responses: { '201': { description: 'Initialized', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } } },
      },
    },
    '/status': {
      get: {
        summary: 'Get repository status',
        responses: { '200': { description: 'Status object' } },
      },
    },
    '/files': {
      get: {
        summary: 'List all tracked files',
        responses: { '200': { description: 'Array of TrackedFile', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/TrackedFile' } } } } } },
      },
      post: {
        summary: 'Track a new file',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'path', 'agentId'], properties: { name: { type: 'string' }, path: { type: 'string' }, agentId: { type: 'string' }, initialContent: { type: 'string' } } } } } },
        responses: { '201': { description: 'Created TrackedFile', content: { 'application/json': { schema: { '$ref': '#/components/schemas/TrackedFile' } } } } },
      },
    },
    '/files/{id}': {
      get: {
        summary: 'Get file with replayed content',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'TrackedFile with content' } },
      },
    },
    '/files/{id}/lock': {
      post: {
        summary: 'Acquire exclusive write lock',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agentId'], properties: { agentId: { type: 'string' } } } } } },
        responses: { '200': { description: 'Locked TrackedFile' } },
      },
      delete: {
        summary: 'Release lock and reconcile copies',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'agentId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ReconcileResult', content: { 'application/json': { schema: { '$ref': '#/components/schemas/ReconcileResult' } } } } },
      },
    },
    '/files/{id}/append': {
      post: {
        summary: 'Append content to file',
        description: 'If you hold the lock, appends directly. Otherwise creates a private copy that is merged on unlock.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agentId', 'content'], properties: { agentId: { type: 'string' }, content: { type: 'string' } } } } } },
        responses: { '200': { description: 'AppendResult', content: { 'application/json': { schema: { '$ref': '#/components/schemas/AppendResult' } } } } },
      },
    },
    '/files/{id}/log': {
      get: {
        summary: 'Get ordered append log for a file',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Array of LogEntry' } },
      },
    },
    '/files/{id}/copies': {
      get: {
        summary: 'List conflict copies for a file',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Array of FileCopy' } },
      },
    },
  },
  components: {
    schemas: {
      TrackedFile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          path: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          lock: { nullable: true, type: 'object', properties: { agentId: { type: 'string' }, lockedAt: { type: 'string' }, lockId: { type: 'string' } } },
        },
      },
      AppendResult: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['appended', 'copy-created'] },
          fileId: { type: 'string' },
          seq: { type: 'integer' },
          copyId: { type: 'string' },
        },
      },
      ReconcileResult: {
        type: 'object',
        properties: {
          reconciledCopies: { type: 'array', items: { type: 'string' } },
          appendedEntries: { type: 'integer' },
        },
      },
    },
  },
};

const STATUS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agentix API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .sub { color: #555; margin-bottom: 24px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    ul { color: #555; line-height: 1.9; }
    .docs { margin-top: 28px; padding: 16px 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e5e5e5; }
    .docs a { color: #0070f3; text-decoration: none; font-weight: 500; }
    .docs a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Agentix API</h1>
  <p class="sub">Collaborative file editing for multiple AI agents — status: <strong style="color:green">online</strong></p>

  <p>Endpoints:</p>
  <ul>
    <li><code>POST /repo/init</code> — initialize the repo</li>
    <li><code>GET /status</code> — repo status</li>
    <li><code>GET /files</code> — list tracked files</li>
    <li><code>POST /files</code> — track a new file</li>
    <li><code>GET /files/:id</code> — get file with content</li>
    <li><code>POST /files/:id/lock</code> — acquire write lock</li>
    <li><code>DELETE /files/:id/lock</code> — release lock + reconcile</li>
    <li><code>POST /files/:id/append</code> — append content</li>
    <li><code>GET /files/:id/log</code> — view append log</li>
    <li><code>GET /files/:id/copies</code> — view conflict copies</li>
  </ul>

  <div class="docs">
    <strong>AI agents:</strong> see <a href="/llms.txt">/llms.txt</a> for step-by-step instructions &nbsp;|&nbsp;
    <a href="/openapi.json">/openapi.json</a> for the full schema
  </div>

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

  app.get('/llms.txt', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(LLMS_TXT);
  });

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(OPENAPI);
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
