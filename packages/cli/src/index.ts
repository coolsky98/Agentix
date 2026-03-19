#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { trackCommand } from './commands/track';
import { lockCommand } from './commands/lock';
import { unlockCommand } from './commands/unlock';
import { appendCommand } from './commands/append';
import { statusCommand } from './commands/status';
import { logCommand } from './commands/log';
import { lsCommand } from './commands/ls';
import { repoCommand } from './commands/repo';

const program = new Command();

program
  .name('agentix')
  .description('Agent-only append-only version control system')
  .version('1.0.0');

initCommand(program);
trackCommand(program);
lockCommand(program);
unlockCommand(program);
appendCommand(program);
statusCommand(program);
logCommand(program);
lsCommand(program);
repoCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
