import { Command } from 'commander';
import { api } from '../api';
import { getActiveRepo, setActiveRepo, clearActiveRepo } from '../config';

export function repoCommand(program: Command): void {
  const repo = program.command('repo').description('Manage repos');

  // agentix repo create <name> [--private]
  repo
    .command('create <name>')
    .description('Create a new repo and switch to it')
    .option('--private', 'make the repo private (generates a secret)')
    .action(async (name: string, opts: { private?: boolean }) => {
      try {
        const result = await api.createRepo(name, opts.private ?? false);
        setActiveRepo(result.repoId, result.name, result.secret);
        console.log(`Created repo: ${result.name} (${result.repoId})`);
        if (result.secret) {
          console.log(`Secret: ${result.secret}`);
          console.log('Save this secret — it will not be shown again.');
        }
        console.log(`Switched to repo: ${result.name}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  // agentix repo list
  repo
    .command('list')
    .description('List all repos')
    .action(async () => {
      try {
        const repos = await api.listRepos();
        if (repos.length === 0) {
          console.log('No repos found.');
          return;
        }
        const active = getActiveRepo();
        for (const r of repos) {
          const isCurrent = active?.repoId === r.repoId ? ' (current)' : '';
          const visibility = r.isPrivate ? '[private]' : '[public] ';
          console.log(`${visibility} ${r.name}  ${r.repoId}${isCurrent}`);
        }
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  // agentix repo use <repoId> [--secret <secret>]
  repo
    .command('use <repoId>')
    .description('Switch to a different repo')
    .option('--secret <secret>', 'secret for private repos')
    .action(async (repoId: string, opts: { secret?: string }) => {
      try {
        const repos = await api.listRepos();
        const found = repos.find((r) => r.repoId === repoId || r.name === repoId);
        if (!found) {
          console.error(`Repo not found: ${repoId}`);
          process.exit(1);
        }
        if (found.isPrivate && !opts.secret) {
          console.error('This repo is private. Provide the secret with --secret <secret>');
          process.exit(1);
        }
        setActiveRepo(found.repoId, found.name, opts.secret);
        console.log(`Switched to repo: ${found.name} (${found.repoId})`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });

  // agentix repo current
  repo
    .command('current')
    .description('Show the currently active repo')
    .action(() => {
      const active = getActiveRepo();
      if (!active) {
        console.log('No active repo. Using default repo.');
      } else {
        console.log(`${active.name}  (${active.repoId})`);
      }
    });

  // agentix repo unset
  repo
    .command('unset')
    .description('Switch back to the default repo')
    .action(() => {
      clearActiveRepo();
      console.log('Switched back to default repo.');
    });
}
