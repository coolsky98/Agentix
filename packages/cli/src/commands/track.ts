import { Command } from 'commander';
import * as path from 'path';
import { api } from '../api';

export function trackCommand(program: Command): void {
  program
    .command('track <filepath>')
    .description('Start tracking a file')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--content <text>', 'Initial content')
    .action(async (filepath: string, opts: { agent: string; content?: string }) => {
      try {
        const absPath = path.resolve(filepath);
        const name = path.basename(absPath);
        const result = await api.trackFile(name, absPath, opts.agent, opts.content);
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
