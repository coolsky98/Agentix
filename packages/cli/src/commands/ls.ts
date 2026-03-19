import { Command } from 'commander';
import { api } from '../api';

export function lsCommand(program: Command): void {
  program
    .command('ls')
    .description('List all tracked files')
    .action(async () => {
      try {
        const files = await api.listFiles();
        if (files.length === 0) {
          console.log('No tracked files.');
          return;
        }
        for (const f of files) {
          const lockStr = f.lock ? ` [LOCKED by ${(f.lock as { agentId: string }).agentId}]` : '';
          console.log(`${f.path}${lockStr}  (id: ${f.id})`);
        }
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
