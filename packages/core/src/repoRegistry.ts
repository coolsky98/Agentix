import { RepoInfo, RepoRecord } from './types';

export interface RepoRegistry {
  listRepos(): Promise<RepoInfo[]>;
  getRepo(repoId: string): Promise<RepoRecord | null>;
  saveRepo(repo: RepoRecord): Promise<void>;
}
