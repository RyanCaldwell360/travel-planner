import { type State, type Scenario, PEOPLE, nameOf, type PersonId } from '../core/model';
import { forecast, displayHours, safeExtra } from '../core/pto';
import { ArrowUpRight, AlertTriangle, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
export function ForecastCards({
  state,
  scenario,
  onInspect,
}: {
  state: State;
  scenario: Scenario;
  onInspect?: (p: PersonId) => void;
}) {
  return (
    <div className="forecast-cards">
      {PEOPLE.map((p) => {
        const f = forecast(state, scenario, p);
        const points = f.rows.filter((_, i) => i % 7 === 0);
        const values = points.map((r) => r.balance);
        const lo = Math.min(0, ...values),
          hi = Math.max(80000, ...values);
        const path = values
          .map(
            (v, i) =>
              `${(i / (values.length - 1 || 1)) * 130},${32 - ((v - lo) / (hi - lo || 1)) * 28}`,
          )
          .join(' ');
        return (
          <button className={'forecast-card ' + p} onClick={() => onInspect?.(p)} key={p}>
            <div className="forecast-top">
              <span className={'avatar ' + p}>{nameOf(p)[0]}</span>
              <strong>{nameOf(p)}’s PTO</strong>
              <ArrowUpRight size={16} />
            </div>
            <div className="balance-row">
              <div>
                <strong className="balance">
                  {f.complete ? displayHours(f.ending!) : '—'}
                  <small> h</small>
                </strong>
                <p>projected at year end</p>
              </div>
              <svg
                width="130"
                height="38"
                viewBox="0 0 130 38"
                aria-label="Calculated balance trend"
              >
                <polyline
                  points={path}
                  fill="none"
                  stroke={f.firstDeficit ? '#ad553d' : p === 'ryan' ? '#426f5b' : '#b78558'}
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className={'forecast-foot ' + (!f.complete || f.firstDeficit ? 'warning' : '')}>
              {!f.complete ? (
                <>
                  <AlertTriangle size={14} />
                  Setup incomplete · review inputs
                </>
              ) : f.firstDeficit ? (
                <>
                  <AlertTriangle size={14} />
                  {displayHours(-f.firstDeficit.balance)} h short on {f.firstDeficit.date}
                </>
              ) : (
                <>
                  <LockKeyhole size={13} />
                  All projected balances stay ≥ 0 h
                </>
              )}
            </div>
            <div className="anchor-note">
              {f.anchor
                ? `Known ${f.anchor.hours} h · closing ${f.anchor.date}`
                : 'No known balance entered'}{' '}
              · {scenario.year} checked
            </div>
          </button>
        );
      })}
    </div>
  );
}
export function Ledger({
  state,
  scenario,
  person,
}: {
  state: State;
  scenario: Scenario;
  person: PersonId;
}) {
  const f = forecast(state, scenario, person);
  const [selected, setSelected] = useState(`${scenario.year}-02-15`);
  const safe = safeExtra(state, scenario, person, selected);
  const row = f.rows.find((r) => r.date === selected);
  return (
    <div className="ledger">
      <p>
        Known closing balance: <strong>{f.anchor?.hours ?? 'Unknown'} h</strong> as of{' '}
        {f.anchor?.date ?? 'not entered'}. Forecast through December 31, {scenario.year}.
      </p>
      {!f.complete && (
        <p className="notice">
          Missing: {f.missing.join('; ')}. These provisional numbers are not a reliable forecast.
        </p>
      )}
      <div className="form-grid">
        <label>
          Inspect a date
          <input type="date" value={selected} onChange={(e) => setSelected(e.target.value)} />
        </label>
        <div className="date-inspection">
          <strong>{row ? displayHours(row.balance) + ' h' : '—'}</strong>
          <span>projected closing balance that day</span>
          <strong>{safe.hours === null ? 'Unavailable' : displayHours(safe.hours) + ' h'}</strong>
          <span>safe additional leave · {safe.reason}</span>
        </div>
      </div>
      <p className="small muted">
        Past planned entries are assumed used until marked actual or cancelled. The anchor
        supersedes all activity up to its closing date. Holidays and trip PTO share one effective
        debit per date.
      </p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Credit</th>
            <th>Leave</th>
            <th>Closing</th>
          </tr>
        </thead>
        <tbody>
          {f.rows
            .filter((r) => r.credit || r.debit || r.carriedOff)
            .map((r) => (
              <tr key={r.date} className={r.balance < 0 ? 'deficit-row' : ''}>
                <td>{r.date}</td>
                <td>
                  {r.reasons.join('; ') || 'Pay-period credit'}
                  {r.carriedOff
                    ? ` · ${displayHours(r.carriedOff)} h removed by configured cap/carryover`
                    : ''}
                </td>
                <td>{r.credit ? '+' + displayHours(r.credit) : '—'}</td>
                <td>{r.debit ? '−' + displayHours(r.debit) : '—'}</td>
                <td>
                  <strong>{displayHours(r.balance)} h</strong>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
