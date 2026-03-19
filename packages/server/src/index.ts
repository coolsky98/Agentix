import { createApp } from './app';

const repoRoot = process.env.AGENTREPO_ROOT ?? process.cwd();
const port = parseInt(process.env.PORT ?? '3000', 10);

const app = createApp(repoRoot);

app.listen(port, () => {
  console.log(`Agentix server running on port ${port}`);
  console.log(`Repo root: ${repoRoot}`);
});
