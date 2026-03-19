import { createApp } from '@agentix/server';
import { KvStorage } from './kvStorage';

const storage = new KvStorage();
const app = createApp(storage);

export default app;
