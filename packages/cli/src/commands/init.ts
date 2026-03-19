import { Command } from 'commander';
import { api } from '../api';

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new Agentix repository')
    .action(async () => {
      try {
        const result = await api.initRepo();
        console.log(result.message);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
