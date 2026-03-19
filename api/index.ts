import { createApp } from '@agentix/server';
import { KvStorage } from './kvStorage';
import { KvRegistry } from './kvRegistry';

const registry = new KvRegistry();
const storageFactory = (repoId: string) => new KvStorage(repoId);
const app = createApp(storageFactory, registry);

export default app;
