import type { State } from './model';
import type { findTradeoffs } from './tradeoffs';
export async function runTradeoffs(
  state: State,
  scenarioId: string,
  targetId?: string,
): Promise<ReturnType<typeof findTradeoffs>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./tradeoff-worker.ts', import.meta.url), { type: 'module' });
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('The search took too long. Try a smaller set of flexible trips.'));
    }, 30000);
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    worker.onmessage = (e) => {
      finish();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    worker.onerror = () => {
      finish();
      reject(new Error('The tradeoff search could not finish. Your plan has not changed.'));
    };
    worker.postMessage({ state, scenarioId, targetId });
  });
}
