import { useState } from 'react';
import { type State, type Scenario, PEOPLE, nameOf, id } from '../core/model';
import { summaries, displayHours } from '../core/pto';
import { type Option, type Cut } from '../core/tradeoffs';
import { Modal } from './Modal';
import { Comparison } from './Compare';
import { ForecastCards } from './Forecast';
import { runTradeoffs } from '../core/tradeoff-client';
import { ArrowRight, Lock, GitBranch, AlertTriangle } from 'lucide-react';
export function Preview({
  original,
  next,
  scenarioId,
  title,
  targetId,
  onClose,
  onSave,
  saving,
  error,
  onReload,
}: {
  original: State;
  next: State;
  scenarioId: string;
  title: string;
  targetId?: string;
  onClose: () => void;
  onSave: (s: State, selectedId?: string) => Promise<void>;
  saving: boolean;
  error: string;
  onReload: () => void;
}) {
  const [draft, setDraft] = useState(next),
    [alternative, setAlternative] = useState(false),
    [name, setName] = useState('A different February'),
    [options, setOptions] = useState<Option[] | null>(null),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false);
  const current = draft.scenarios.find((s) => s.id === scenarioId),
    before = original.scenarios.find((s) => s.id === scenarioId);
  const forecasts = current ? summaries(draft, current) : null;
  const incomplete = forecasts && PEOPLE.some((p) => !forecasts[p].complete);
  const deficit = forecasts && PEOPLE.some((p) => forecasts[p].firstDeficit);
  const globalChange =
    JSON.stringify(original.policies) !== JSON.stringify(draft.policies) ||
    JSON.stringify(original.breaks) !== JSON.stringify(draft.breaks);
  async function find() {
    setBusy(true);
    try {
      const r = await runTradeoffs(draft, scenarioId, targetId);
      setOptions(r.options);
      setSearch(
        `${r.checked} candidate states checked. ${r.truncated ? 'Search bounded; these are examples, not exhaustive.' : 'All reachable boundary cuts in this search checked.'} Only flexible trip boundaries are considered; non-trip leave and mandatory holidays are excluded.`,
      );
    } catch (e) {
      setSearch((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const result = structuredClone(draft);
    let selected = scenarioId;
    if (alternative && current && !globalChange) {
      const cloned = structuredClone(current);
      cloned.id = id();
      cloned.name = name.trim() || 'Named alternative';
      cloned.parentId = current.id;
      selected = cloned.id;
      result.scenarios = result.scenarios.filter((s) => s.id !== current.id);
      if (before) result.scenarios.push(structuredClone(before));
      result.scenarios.push(cloned);
    }
    await onSave(result, selected);
  }
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="modal-content">
        <div className="notice">
          <ArrowRight size={18} />
          <span>
            This is a preview. Nothing has been saved.{' '}
            {globalChange
              ? 'Shared input changes recompute every alternative. Prior anchors remain in revision history.'
              : 'Review the complete year before choosing how to save.'}
          </span>
        </div>
        {forecasts && current && <ForecastCards state={draft} scenario={current} />}
        {incomplete && (
          <div className="notice">
            <AlertTriangle size={17} />
            <div>
              Forecast incomplete.{' '}
              {PEOPLE.map((p) =>
                forecasts![p].missing.length
                  ? `${nameOf(p)}: ${forecasts![p].missing.join(', ')}. `
                  : '',
              )}{' '}
              You may save the plan; feasibility remains unknown.
            </div>
          </div>
        )}
        {current && before && (
          <Comparison state={draft} leftState={original} left={before} right={current} />
        )}
        {deficit && !incomplete && (
          <div className="tradeoff-box">
            <span className="eyebrow">MAKE SPACE, TOGETHER</span>
            <h2>What could change?</h2>
            <p>
              {PEOPLE.filter((p) => forecasts![p].firstDeficit).map(
                (p) =>
                  `${nameOf(p)} is ${displayHours(-forecasts![p].firstDeficit!.balance)} h short on ${forecasts![p].firstDeficit!.date}. `,
              )}{' '}
              Later cuts can only repair balances from their own dates onward.
            </p>
            <button className="primary" onClick={find} disabled={busy}>
              {busy ? 'Checking every balance…' : 'Find flexible-trip tradeoffs'}
            </button>
            {options?.length === 0 && (
              <p className="error">
                No feasible adjustment found among the flexible trip days checked. Protected
                commitments and earlier shortfalls remain unchanged.
              </p>
            )}
            {options?.map((o, i) => {
              const groups = new Map<string, Cut[]>();
              for (const c of o.cuts) {
                const k = c.person + c.tripId;
                groups.set(k, [...(groups.get(k) ?? []), c]);
              }
              return (
                <div className="tradeoff-option" key={i}>
                  <h3>
                    Option {i + 1} · {new Set(o.cuts.map((c) => c.tripId)).size} flexible trips
                  </h3>
                  {[...groups.values()].map((cuts, j) => (
                    <p key={j}>
                      <strong>
                        {nameOf(cuts[0].person)} · {cuts[0].tripTitle}
                      </strong>
                      <br />
                      Remove travel on {cuts.map((c) => c.date).join(', ')} · frees{' '}
                      {displayHours(cuts.reduce((n, c) => n + c.hours, 0))} h
                    </p>
                  ))}
                  <p className="small">
                    The target trip stays as previewed. These boundary edits shorten or remove the
                    named person’s participation; they do not assume remote work or free return
                    travel.
                  </p>
                  {PEOPLE.map((p) => (
                    <p className="small" key={p}>
                      {nameOf(p)}: minimum {displayHours(o.forecasts[p].minimum!)} h · year end{' '}
                      {displayHours(o.forecasts[p].ending!)} h · no remaining shortfall
                    </p>
                  ))}
                  <p className="small">
                    <Lock size={12} /> Protected trips/days preserved. Changed-date estimates become
                    stale.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      const copy = structuredClone(draft);
                      copy.scenarios = copy.scenarios.map((s) =>
                        s.id === scenarioId ? o.scenario : s,
                      );
                      setDraft(copy);
                      setAlternative(true);
                      setOptions(null);
                      setSearch(
                        'Alternative selected for preview. Baseline is preserved until you explicitly save.',
                      );
                    }}
                  >
                    Preview this alternative
                  </button>
                </div>
              );
            })}
            <p className="small muted" role="status">
              {search}
            </p>
          </div>
        )}
        {!globalChange && current && before && (
          <div className="alternative-save">
            <label className="check-label">
              <input
                type="checkbox"
                checked={alternative}
                onChange={(e) => setAlternative(e.target.checked)}
              />
              <GitBranch size={16} />
              Save as a named alternative; preserve {before.name}
            </label>
            {alternative && (
              <label>
                Alternative name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
          </div>
        )}
        {globalChange && (
          <div>
            <h3>All affected scenarios</h3>
            {draft.scenarios.map((s) => (
              <div key={s.id}>
                <strong>
                  {s.name} · {s.year}
                </strong>
                {PEOPLE.map((p) => {
                  const f = summaries(draft, s)[p];
                  return (
                    <p className="small" key={p}>
                      {nameOf(p)}:{' '}
                      {!f.complete
                        ? 'incomplete inputs'
                        : f.firstDeficit
                          ? `${displayHours(-f.firstDeficit.balance)} h short on ${f.firstDeficit.date}`
                          : `minimum ${displayHours(f.minimum!)} h; year end ${displayHours(f.ending!)} h`}
                    </p>
                  );
                })}
              </div>
            ))}
            <p>
              Shared facts will be saved for all scenarios. Current input differences:{' '}
              {JSON.stringify(original.policies) !== JSON.stringify(draft.policies)
                ? 'employment policies / balance anchors; '
                : ''}
              {JSON.stringify(original.breaks) !== JSON.stringify(draft.breaks)
                ? 'school breaks'
                : ''}
              .
            </p>
          </div>
        )}
        {error && (
          <div role="alert" className="error">
            {error}
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(draft, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'unsaved-planner-draft.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download unsaved draft
            </button>
            <button className="secondary" onClick={onReload}>
              Reload shared plan (discard this preview)
            </button>
          </div>
        )}
      </div>
      <footer className="modal-actions">
        <span className="muted small">
          {deficit
            ? 'Known shortfalls remain unless repaired.'
            : 'Only your save action applies this preview.'}
        </span>
        <button className="secondary" onClick={onClose} disabled={saving}>
          Keep editing
        </button>
        <button
          className="primary"
          onClick={save}
          disabled={saving || (alternative && !name.trim())}
        >
          {saving
            ? 'Saving…'
            : alternative
              ? 'Save named alternative'
              : deficit
                ? 'Save with known shortfall'
                : 'Save changes'}
        </button>
      </footer>
    </Modal>
  );
}
