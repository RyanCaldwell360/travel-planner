import { type State } from './core/model';
export interface Snapshot {
  revision: number;
  state: State;
  editor: string;
  savedAt: string;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch('/api/' + path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', 'X-Planner-Request': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok) throw new ApiError(data.error ?? 'Request failed', r.status);
  return data;
}
