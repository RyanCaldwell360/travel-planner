import { findTradeoffs } from './tradeoffs';
import type { State } from './model';
self.onmessage = (event: MessageEvent<{ state: State; scenarioId: string; targetId?: string }>) => {
  try {
    const { state, scenarioId, targetId } = event.data;
    const scenario = state.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) throw new Error('Scenario not found');
    self.postMessage({ result: findTradeoffs(state, scenario, targetId) });
  } catch (e) {
    self.postMessage({ error: (e as Error).message });
  }
};
