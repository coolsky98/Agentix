import { Command } from 'commander';
import * as path from 'path';
import { api } from '../api';

async function resolveFileId(filepath: string): Promise<string> {
  const absPath = path.resolve(filepath);
  const files = await api.listFiles();
  const file = files.find((f) => f.path === absPath);
  if (!file) {
    throw new Error(`No tracked file found for path: ${absPath}`);
  }
  return file.id;
}

export function unlockCommand(program: Command): void {
  program
    .command('unlock <filepath>')
    .description('Release the lock on a tracked file (triggers reconcile)')
    .requiredOption('--agent <id>', 'Agent ID')
    .action(async (filepath: string, opts: { agent: string }) => {
      try {
        const fileId = await resolveFileId(filepath);
        const result = await api.unlockFile(fileId, opts.agent);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
