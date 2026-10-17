import { useState } from 'react';
import {
  type State,
  type PersonId,
  type Policy,
  PEOPLE,
  emptyPolicy,
  nameOf,
  id,
} from '../core/model';
import { creditsFor, units, displayHours } from '../core/pto';
import { Check, Plus, Trash2, Info } from 'lucide-react';
export function Setup({
  state,
  year,
  onPreview,
}: {
  state: State;
  year: number;
  onPreview: (s: State, title: string) => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(state));
  const [person, setPerson] = useState<PersonId>('ryan');
  const [error, setError] = useState('');
  const profiles = draft.policies[String(year)] ?? { ryan: emptyPolicy(), lily: emptyPolicy() };
  const p = profiles[person];
  function patch(next: Partial<Policy>) {
    setDraft((d) => ({
      ...d,
      policies: { ...d.policies, [year]: { ...profiles, [person]: { ...p, ...next } } },
    }));
  }
  const a = p.accrual;
  let creditList: ReturnType<typeof creditsFor> = [];
  try {
    creditList = creditsFor(p, `${year}-12-31`);
  } catch {}
  function parseLines(value: string, kind: 'holiday' | 'credit') {
    try {
      return value
        .split('\n')
        .filter((x) => x.trim())
        .map((line) => {
          const [date, hours, ...label] = line.split(',').map((x) => x.trim());
          units(hours);
          return kind === 'holiday'
            ? { date, hours, label: label.join(', ') || 'Employer holiday' }
            : { date, hours };
        });
    } catch {
      throw new Error('Use one date,hours,label entry per line.');
    }
  }
  const [holidays, setHolidays] = useState(
    p.holidays.map((h) => `${h.date}, ${h.hours}, ${h.label}`).join('\n'),
  );
  const [credits, setCredits] = useState(
    a?.credits.map((c) => `${c.date}, ${c.hours}`).join('\n') ?? '',
  );
  function switchPerson(next: PersonId) {
    setPerson(next);
    const pol = profiles[next];
    setHolidays(pol.holidays.map((h) => `${h.date}, ${h.hours}, ${h.label}`).join('\n'));
    setCredits(pol.accrual?.credits.map((c) => `${c.date}, ${c.hours}`).join('\n') ?? '');
  }
  function commitLines() {
    try {
      patch({
        holidays: parseLines(holidays, 'holiday') as Policy['holidays'],
        ...(a
          ? {
              accrual: {
                ...a,
                credits: parseLines(credits, 'credit') as NonNullable<Policy['accrual']>['credits'],
              },
            }
          : {}),
      });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="setup-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE FACTS BEHIND THE POSSIBILITIES</span>
          <h1>PTO, on your terms.</h1>
          <p>Enter your real employer details for {year}. Nothing here is assumed.</p>
        </div>
        <span className="pill">Shared inputs · all alternatives</span>
      </div>
      <div className="notice">
        <Info size={18} />
        <span>
          Closing balances include all activity on the as-of date. For a future year, enter an
          explicit opening balance as of the prior December 31; bridging earlier-year usage is not
          yet supported. Credits post at the start of their actual date; leave is deducted
          afterward. Corrections update every alternative. The checked horizon is December 31,{' '}
          {year}.
        </span>
      </div>
      <div className="setup-layout">
        <div className="panel">
          <div className="person-tabs">
            {PEOPLE.map((x) => (
              <button
                key={x}
                className={person === x ? 'active' : ''}
                onClick={() => switchPerson(x)}
              >
                {nameOf(x)}
                {profiles[x].anchor && <Check size={14} />}
              </button>
            ))}
          </div>
          <h2>{nameOf(person)}’s employment inputs</h2>
          <div className="form-grid">
            <label>
              Known closing balance (hours)
              <input
                type="number"
                step="0.0001"
                value={p.anchor?.hours ?? ''}
                placeholder="Enter exact hours"
                onChange={(e) =>
                  patch({ anchor: { date: p.anchor?.date ?? '', hours: e.target.value } })
                }
              />
            </label>
            <label>
              Balance as of
              <input
                type="date"
                value={p.anchor?.date ?? ''}
                onChange={(e) =>
                  patch({ anchor: { hours: p.anchor?.hours ?? '', date: e.target.value } })
                }
              />
            </label>
          </div>
          <label>
            Payroll credit schedule
            <select
              value={a?.cadence ?? ''}
              onChange={(e) =>
                patch({
                  accrual: e.target.value
                    ? {
                        cadence: e.target.value as NonNullable<Policy['accrual']>['cadence'],
                        nextDate: '',
                        hours: e.target.value === 'explicit' ? '0' : '',
                        monthDays: [1, 15],
                        credits: [],
                      }
                    : null,
                })
              }
            >
              <option value="">Choose actual schedule</option>
              <option value="biweekly">Every 14 days</option>
              <option value="semimonthly">Twice per month</option>
              <option value="explicit">Explicit dates / no credits</option>
            </select>
          </label>
          {a && a.cadence !== 'explicit' && (
            <>
              <div className="form-grid">
                <label>
                  Next actual credit date
                  <input
                    type="date"
                    value={a.nextDate}
                    onChange={(e) => patch({ accrual: { ...a, nextDate: e.target.value } })}
                  />
                </label>
                <label>
                  Hours per credit
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={a.hours}
                    onChange={(e) => patch({ accrual: { ...a, hours: e.target.value } })}
                  />
                </label>
              </div>
              {a.cadence === 'semimonthly' && (
                <div className="form-grid">
                  {[0, 1].map((i) => (
                    <label key={i}>
                      Monthly credit day {i + 1}
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={a.monthDays[i]}
                        onChange={(e) => {
                          const ds = [...a.monthDays] as [number, number];
                          ds[i] = Number(e.target.value);
                          patch({ accrual: { ...a, monthDays: ds } });
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
              <p className="small muted">
                Month days 29–31 clamp to that month’s final day. No weekend adjustment is inferred.
                Use explicit dates for exceptions.
              </p>
            </>
          )}
          {a?.cadence === 'explicit' && (
            <label>
              Actual credit dates: date, hours (blank means no credits)
              <textarea
                rows={4}
                value={credits}
                placeholder={`${year}-01-15, 7.6923`}
                onChange={(e) => setCredits(e.target.value)}
                onBlur={commitLines}
              />
            </label>
          )}
          <label>
            Employer holidays: date, PTO hours, label
            <textarea
              rows={4}
              value={holidays}
              placeholder={`${year}-01-01, 8, Enter an actual observed holiday`}
              onChange={(e) => setHolidays(e.target.value)}
              onBlur={commitLines}
            />
          </label>
          <p className="small muted">
            Enter 0 hours for paid holidays, or the required PTO hours. Lily’s exact holiday dates
            still need review. Paid holidays cost zero; required holiday + trip PTO uses the larger
            amount once.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.holidaysConfirmed}
              onChange={(e) => patch({ holidaysConfirmed: e.target.checked })}
            />
            I reviewed {nameOf(person)}’s complete holiday calendar, including any intentionally
            empty calendar.
          </label>
          <div className="form-grid">
            <label>
              Maximum accrued balance (optional)
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="No cap configured"
                value={p.balanceCap ?? ''}
                onChange={(e) => patch({ balanceCap: e.target.value || null })}
              />
            </label>
            <label>
              Year-end carryover limit (optional)
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="No carryover limit configured"
                value={p.carryover ?? ''}
                onChange={(e) => patch({ carryover: e.target.value || null })}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.rolloverConfirmed}
              onChange={(e) => patch({ rolloverConfirmed: e.target.checked })}
            />
            I confirmed the carryover rule, including no limit if left blank. Required when the
            anchor is in the prior year.
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            onClick={() => {
              try {
                const next = structuredClone(draft);
                next.policies[String(year)] = {
                  ...profiles,
                  [person]: {
                    ...p,
                    holidays: parseLines(holidays, 'holiday') as Policy['holidays'],
                    accrual: a
                      ? {
                          ...a,
                          credits: parseLines(credits, 'credit') as NonNullable<
                            Policy['accrual']
                          >['credits'],
                        }
                      : null,
                  },
                };
                onPreview(next, 'Review shared employment changes');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Preview shared input changes
          </button>
        </div>
        <aside>
          <div className="panel">
            <span className="eyebrow">PAYDAY, NOT EVERY DAY</span>
            <h2>Credit-date preview</h2>
            <p className="small muted">
              {creditList.length} credits through December 31. Only dates after your anchor affect
              the projection.
            </p>
            <div className="credit-list">
              {creditList.length ? (
                creditList.map((c) => (
                  <div key={c.date}>
                    <span>{c.date}</span>
                    <strong>+{c.hours} h</strong>
                  </div>
                ))
              ) : (
                <p className="muted">Add your real schedule to see the dates here.</p>
              )}
            </div>
          </div>
          <div className="panel subtle">
            <h3>Monday–Friday, 8 hours</h3>
            <p className="small">
              This version uses the confirmed 40-hour weekday schedule. Weekend leave exceptions
              require a future schedule extension. No five-week allowance or 40-hour rollover is
              assumed.
            </p>
          </div>
        </aside>
      </div>
      <div className="panel">
        <h2>Kaia’s school breaks</h2>
        <p className="muted small">
          Opportunity highlights, never restrictions. Enter dates from your actual school calendar.
        </p>
        {draft.breaks.map((b, i) => (
          <div className="break-row" key={b.id}>
            <label>
              Label
              <input
                value={b.title}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breaks: d.breaks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  }))
                }
              />
            </label>
            <label>
              Starts
              <input
                type="date"
                value={b.start}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breaks: d.breaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)),
                  }))
                }
              />
            </label>
            <label>
              Ends
              <input
                type="date"
                value={b.end}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breaks: d.breaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)),
                  }))
                }
              />
            </label>
            <button
              aria-label={'Remove ' + b.title}
              className="icon-button"
              onClick={() =>
                setDraft((d) => ({ ...d, breaks: d.breaks.filter((_, j) => j !== i) }))
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <button
          className="secondary"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              breaks: [...d.breaks, { id: id(), title: 'School break', start: '', end: '' }],
            }))
          }
        >
          <Plus size={15} />
          Add a school break
        </button>
        <button className="primary" onClick={() => onPreview(draft, 'Review school-break changes')}>
          Preview school breaks
        </button>
      </div>
    </div>
  );
}
