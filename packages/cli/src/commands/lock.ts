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

export function lockCommand(program: Command): void {
  program
    .command('lock <filepath>')
    .description('Acquire a lock on a tracked file')
    .requiredOption('--agent <id>', 'Agent ID')
    .action(async (filepath: string, opts: { agent: string }) => {
      try {
        const fileId = await resolveFileId(filepath);
        const result = await api.lockFile(fileId, opts.agent);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
