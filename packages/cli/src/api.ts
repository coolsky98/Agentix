const BASE_URL = process.env.AGENTIX_API_URL ?? 'http://localhost:3000';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string>,
): Promise<T> {
  let url = `${BASE_URL}${path}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data as { error: string; message: string };
    throw new Error(`[${res.status}] ${err.error}: ${err.message}`);
  }

  return data as T;
}

export const api = {
  initRepo: () => request<{ message: string }>('POST', '/repo/init'),

  status: () =>
    request<{ files: unknown[]; lockedFiles: number; pendingCopies: number }>('GET', '/status'),

  trackFile: (name: string, path: string, agentId: string, initialContent?: string) =>
    request('POST', '/files', { name, path, agentId, initialContent }),

  listFiles: () => request<Array<{ id: string; name: string; path: string; lock: unknown }>>('GET', '/files'),

  getFile: (id: string) => request('GET', `/files/${id}`),

  lockFile: (id: string, agentId: string) =>
    request('POST', `/files/${id}/lock`, { agentId }),

  unlockFile: (id: string, agentId: string) =>
    request('DELETE', `/files/${id}/lock`, undefined, { agentId }),

  appendToFile: (id: string, agentId: string, content: string) =>
    request('POST', `/files/${id}/append`, { agentId, content }),

  listCopies: (id: string) => request('GET', `/files/${id}/copies`),

  getLog: (id: string) => request('GET', `/files/${id}/log`),
};
