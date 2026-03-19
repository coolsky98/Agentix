import { Command } from 'commander';
import * as path from 'path';
import { api } from '../api';
import type { LogEntry } from '@agentix/core';

async function resolveFileId(filepath: string): Promise<string> {
  const absPath = path.resolve(filepath);
  const files = await api.listFiles();
  const file = files.find((f) => f.path === absPath);
  if (!file) {
    throw new Error(`No tracked file found for path: ${absPath}`);
  }
  return file.id;
}

export function logCommand(program: Command): void {
  program
    .command('log <filepath>')
    .description('Show append history for a tracked file')
    .action(async (filepath: string) => {
      try {
        const fileId = await resolveFileId(filepath);
        const entries = (await api.getLog(fileId)) as LogEntry[];
        for (const entry of entries) {
          console.log(
            `[${entry.seq}] ${entry.type} by ${entry.agentId} at ${entry.timestamp}`,
          );
          if (entry.content) {
            console.log(`  ${entry.content}`);
          }
        }
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
