import { type State, type Scenario, PEOPLE, nameOf } from '../core/model';
import { forecast, displayHours } from '../core/pto';
import { destination } from '../core/destinations';
import { Lock } from 'lucide-react';
export function Comparison({
  state,
  left,
  right,
  leftState = state,
}: {
  state: State;
  left: Scenario;
  right: Scenario;
  leftState?: State;
}) {
  return (
    <div className="comparison">
      <table>
        <thead>
          <tr>
            <th>Through Dec 31, {left.year}</th>
            <th>{left.name}</th>
            <th>{right.name}</th>
          </tr>
        </thead>
        <tbody>
          {PEOPLE.flatMap((p) => {
            const a = forecast(leftState, left, p),
              b = forecast(state, right, p);
            return [
              ['PTO allocated', a.total, b.total],
              ['Lowest projected balance', a.minimum, b.minimum],
              ['Year-end balance', a.ending, b.ending],
            ]
              .map(([label, x, y]) => (
                <tr key={p + label}>
                  <td>
                    <span className={'person-dot ' + p} />
                    {nameOf(p)} · {label}
                  </td>
                  <td>{x === null ? 'Unknown' : displayHours(x as number) + ' h'}</td>
                  <td>{y === null ? 'Unknown' : displayHours(y as number) + ' h'}</td>
                </tr>
              ))
              .concat([
                <tr key={p + 'deficit'}>
                  <td>{nameOf(p)} · first shortfall</td>
                  <td>
                    {!a.complete
                      ? 'Setup incomplete'
                      : a.firstDeficit
                        ? `${a.firstDeficit.date}: ${displayHours(-a.firstDeficit.balance)} h`
                        : 'None'}
                  </td>
                  <td>
                    {!b.complete
                      ? 'Setup incomplete'
                      : b.firstDeficit
                        ? `${b.firstDeficit.date}: ${displayHours(-b.firstDeficit.balance)} h`
                        : 'None'}
                  </td>
                </tr>,
              ]);
          })}
        </tbody>
      </table>
      <div className="compare-trips">
        {[left, right].map((s, i) => (
          <div key={i}>
            <h3>{s.name}</h3>
            {s.trips.map((t) => (
              <article key={t.id}>
                <strong>
                  {t.locked && <Lock size={13} />} {t.title} · {destination(t.destination).name}
                </strong>
                {t.participants.map((p) => (
                  <p key={p.person}>
                    {nameOf(p.person)}: {p.days[0]?.date} → {p.days.at(-1)?.date}
                    <br />
                    <span className="muted small">
                      {p.days.filter((d) => d.kind === 'remote').length} remote days ·{' '}
                      {p.days.filter((d) => d.locked).length} protected days
                    </span>
                  </p>
                ))}
              </article>
            ))}
          </div>
        ))}
      </div>
      <p className="small muted">
        Both use the current shared employment inputs. Dates, locks, travel treatment, and non-trip
        leave remain scenario-specific. Travel estimates need a matching date/traveler scope before
        comparison.
      </p>
    </div>
  );
}
