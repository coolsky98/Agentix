import { createApp } from './app';
import { FilesystemStorage } from '@agentix/core';

export { createApp };

// Only start server when run directly
if (require.main === module) {
  const repoRoot = process.env.AGENTREPO_ROOT ?? process.cwd();
  const port = parseInt(process.env.PORT ?? '3000', 10);

  const app = createApp(new FilesystemStorage(repoRoot));

  app.listen(port, () => {
    console.log(`Agentix server running on port ${port}`);
    console.log(`Repo root: ${repoRoot}`);
  });
}
