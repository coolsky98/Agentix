import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface ActiveRepo {
  repoId: string;
  name: string;
  secret?: string;
}

interface AgentixConfig {
  activeRepo?: ActiveRepo;
}

const CONFIG_DIR = path.join(os.homedir(), '.agentix');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function readConfig(): AgentixConfig {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as AgentixConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: AgentixConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getActiveRepo(): ActiveRepo | null {
  return readConfig().activeRepo ?? null;
}

export function setActiveRepo(repoId: string, name: string, secret?: string): void {
  const config = readConfig();
  config.activeRepo = { repoId, name, ...(secret ? { secret } : {}) };
  writeConfig(config);
}

export function clearActiveRepo(): void {
  const config = readConfig();
  delete config.activeRepo;
  writeConfig(config);
}
