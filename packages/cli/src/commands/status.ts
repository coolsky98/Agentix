import { Command } from 'commander';
import { api } from '../api';

export function statusCommand(program: Command): void {
  program
    .command('status')
    .description('Show repository status')
    .action(async () => {
      try {
        const status = await api.status();
        console.log(`Files: ${(status.files as unknown[]).length}`);
        console.log(`Locked files: ${status.lockedFiles}`);
        console.log(`Pending copies: ${status.pendingCopies}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
