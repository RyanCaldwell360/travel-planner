import { useState } from 'react';
import {
  type Trip,
  type State,
  type Scenario,
  type PersonId,
  PEOPLE,
  nameOf,
  id,
  type Day,
} from '../core/model';
import { destinations } from '../core/destinations';
import { dates, weekday, assertScenario } from '../core/pto';
import { Modal } from './Modal';
import { ForecastCards } from './Forecast';
import { Lock, Unlock, Trash2, Info } from 'lucide-react';
import { EvidencePanel } from './Evidence';
export function TripEditor({
  initial,
  state,
  scenario,
  defaultDestination,
  onClose,
  onPreview,
  onUnlock,
}: {
  initial: Trip | null;
  state: State;
  scenario: Scenario;
  defaultDestination: string;
  onClose: () => void;
  onPreview: (state: State, title: string, targetId?: string) => void;
  onUnlock: (trip: Trip, person?: PersonId, date?: string) => Promise<void>;
}) {
  const [trip, setTrip] = useState<Trip>(() =>
    initial
      ? structuredClone(initial)
      : {
          id: id(),
          title: '',
          destination: defaultDestination,
          locked: false,
          note: '',
          participants: [],
        },
  );
  const [error, setError] = useState('');
  const [ranges, setRanges] = useState<Record<PersonId, { start: string; end: string }>>(
    () =>
      Object.fromEntries(
        PEOPLE.map((p) => {
          const ds =
            initial?.participants
              .find((x) => x.person === p)
              ?.days.map((d) => d.date)
              .sort() ?? [];
          return [p, { start: ds[0] ?? '', end: ds.at(-1) ?? '' }];
        }),
      ) as Record<PersonId, { start: string; end: string }>,
  );
  const next = structuredClone(state);
  const s = next.scenarios.find((s) => s.id === scenario.id)!;
  s.trips = s.trips.filter((t) => t.id !== trip.id);
  if (trip.participants.every((p) => p.days.length)) s.trips.push(trip);
  function range(person: PersonId, key: 'start' | 'end', value: string) {
    const r = { ...ranges[person], [key]: value };
    setRanges({ ...ranges, [person]: r });
    if (r.start && r.end) {
      try {
        const ds = dates(r.start, r.end);
        setTrip((t) => ({
          ...t,
          participants: t.participants.map((p) =>
            p.person !== person
              ? p
              : {
                  ...p,
                  days: ds.map(
                    (date) =>
                      p.days.find((d) => d.date === date) ?? {
                        date,
                        kind: weekday(date) ? 'pto' : 'off',
                        hours: weekday(date) ? '8' : '0',
                        locked: false,
                        status: 'planned',
                      },
                  ),
                },
          ),
        }));
        setError('');
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  function day(person: PersonId, date: string, patch: Partial<Day>) {
    setTrip((t) => ({
      ...t,
      participants: t.participants.map((p) =>
        p.person === person
          ? { ...p, days: p.days.map((d) => (d.date === date ? { ...d, ...patch } : d)) }
          : p,
      ),
    }));
  }
  function preview(remove = false) {
    try {
      const result = structuredClone(state);
      const target = result.scenarios.find((s) => s.id === scenario.id)!;
      target.trips = target.trips.filter((t) => t.id !== trip.id);
      if (!remove) target.trips.push(trip);
      assertScenario(target);
      onPreview(
        result,
        remove ? 'Review trip removal' : `Review ${trip.title}`,
        remove ? undefined : trip.id,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={initial ? 'A closer look at your trip' : 'Where shall we go?'}
      onClose={onClose}
      wide
    >
      <div className="modal-content">
        <div className="trip-form-top">
          <label>
            Trip name
            <input
              placeholder="Give this possibility a name"
              value={trip.title}
              disabled={trip.locked}
              onChange={(e) => setTrip({ ...trip, title: e.target.value })}
            />
          </label>
          <label>
            Destination
            <select
              value={trip.destination}
              disabled={trip.locked}
              onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.country}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="lock-setting">
          <label className="check-label">
            <input
              type="checkbox"
              checked={trip.locked}
              disabled={!!initial?.locked}
              onChange={(e) => setTrip({ ...trip, locked: e.target.checked })}
            />
            <Lock size={15} />
            Protect this whole trip
          </label>
          {initial?.locked && (
            <button className="secondary" onClick={() => onUnlock(initial)}>
              <Unlock size={14} />
              Explicitly unlock trip
            </button>
          )}
        </div>
        <div className="notice small">
          <Info size={16} />
          <span>
            Travel presence is separate from PTO. Weekdays default to 8 h PTO for your review. Set
            remote work only when your employer permits it. Date changes require fresh travel
            estimates.
          </span>
        </div>
        {PEOPLE.map((person) => {
          const part = trip.participants.find((p) => p.person === person);
          return (
            <section key={person} className="participant">
              <label className="check-label person-label">
                <input
                  type="checkbox"
                  checked={!!part}
                  disabled={
                    trip.locked ||
                    !!initial?.participants
                      .find((p) => p.person === person)
                      ?.days.some((d) => d.locked)
                  }
                  onChange={(e) =>
                    setTrip({
                      ...trip,
                      participants: e.target.checked
                        ? [...trip.participants, { person, days: [] }]
                        : trip.participants.filter((p) => p.person !== person),
                    })
                  }
                />
                <span className={'avatar ' + person}>{nameOf(person)[0]}</span>
                {nameOf(person)} is traveling
              </label>
              {part && (
                <>
                  <div className="form-grid">
                    <label>
                      {nameOf(person)} arrives
                      <input
                        type="date"
                        value={ranges[person].start}
                        disabled={trip.locked}
                        onChange={(e) => range(person, 'start', e.target.value)}
                      />
                    </label>
                    <label>
                      {nameOf(person)} departs
                      <input
                        type="date"
                        value={ranges[person].end}
                        disabled={trip.locked}
                        onChange={(e) => range(person, 'end', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="day-scroll">
                    <table className="days-table">
                      <thead>
                        <tr>
                          <th>Travel day</th>
                          <th>Day treatment</th>
                          <th>PTO hours</th>
                          <th>Usage</th>
                          <th>Protection</th>
                        </tr>
                      </thead>
                      <tbody>
                        {part.days.map((d) => (
                          <tr key={d.date}>
                            <td>
                              <strong>
                                {new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  timeZone: 'UTC',
                                })}
                              </strong>
                              <span className="small muted">{d.date}</span>
                            </td>
                            <td>
                              <select
                                aria-label={`${nameOf(person)} ${d.date} treatment`}
                                value={d.kind}
                                disabled={trip.locked || d.locked}
                                onChange={(e) =>
                                  day(person, d.date, {
                                    kind: e.target.value as Day['kind'],
                                    hours: e.target.value === 'pto' && weekday(d.date) ? '8' : '0',
                                  })
                                }
                              >
                                <option value="pto">PTO</option>
                                <option value="remote">Remote work</option>
                                <option value="business">Working / business</option>
                                <option value="off">Already off</option>
                              </select>
                            </td>
                            <td>
                              <input
                                aria-label={`${nameOf(person)} ${d.date} hours`}
                                type="number"
                                min="0"
                                max="8"
                                step="0.0001"
                                value={d.hours}
                                disabled={
                                  trip.locked || d.locked || d.kind !== 'pto' || !weekday(d.date)
                                }
                                onChange={(e) => day(person, d.date, { hours: e.target.value })}
                              />
                            </td>
                            <td>
                              <select
                                aria-label={`${nameOf(person)} ${d.date} usage`}
                                value={d.status}
                                disabled={trip.locked || d.locked}
                                onChange={(e) =>
                                  day(person, d.date, { status: e.target.value as Day['status'] })
                                }
                              >
                                <option value="planned">Planned</option>
                                <option value="actual">Actual</option>
                                <option value="cancelled">Cancelled PTO</option>
                              </select>
                            </td>
                            <td>
                              {initial?.participants
                                .find((p) => p.person === person)
                                ?.days.find((x) => x.date === d.date)?.locked ? (
                                <button
                                  className="text-button"
                                  disabled={trip.locked}
                                  onClick={() => onUnlock(initial, person, d.date)}
                                >
                                  <Unlock size={13} />
                                  Unlock day
                                </button>
                              ) : (
                                <label className="check-label">
                                  <input
                                    aria-label={`Protect ${nameOf(person)} ${d.date}`}
                                    type="checkbox"
                                    checked={d.locked}
                                    disabled={trip.locked}
                                    onChange={(e) =>
                                      day(person, d.date, { locked: e.target.checked })
                                    }
                                  />
                                  Lock
                                </label>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          );
        })}
        <label>
          Journal notes
          <textarea
            value={trip.note}
            disabled={trip.locked}
            onChange={(e) => setTrip({ ...trip, note: e.target.value })}
            placeholder="What are we looking forward to?"
          />
        </label>
        {trip.participants.some((p) =>
          p.days.some((d) => Number(d.date.slice(0, 4)) !== scenario.year),
        ) && (
          <p className="notice">
            Travel dates outside {scenario.year} are retained. This view checks PTO only through
            December 31, {scenario.year}; next-year feasibility is not checked.
          </p>
        )}
        <h3>The year, with this possibility</h3>
        <ForecastCards state={next} scenario={s} />
        {initial && <EvidencePanel state={state} scenario={scenario} trip={trip} />}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        {initial && (
          <button
            className="danger secondary"
            disabled={trip.locked || trip.participants.some((p) => p.days.some((d) => d.locked))}
            onClick={() => preview(true)}
          >
            <Trash2 size={15} />
            Remove trip
          </button>
        )}
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={() => preview()}>
          Preview year impact
        </button>
      </footer>
    </Modal>
  );
}
