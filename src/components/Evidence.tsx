import { useState } from 'react';
import { type State, type Scenario, type Trip } from '../core/model';
import { api } from '../api';
import { type Evidence, type EvidenceItem } from '../../server/providers';
import { ExternalLink, CloudSun, Plane, RefreshCw, BedDouble } from 'lucide-react';
const scope = (t: Trip) =>
  JSON.stringify({
    destination: t.destination,
    participants: t.participants.map((p) => ({
      person: p.person,
      dates: p.days.map((d) => d.date).sort(),
    })),
  });
export function EvidencePanel({
  state,
  scenario,
  trip,
}: {
  state: State;
  scenario: Scenario;
  trip: Trip;
}) {
  const [result, setResult] = useState<Evidence | null>(null),
    [query, setQuery] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const stale = !!result && (query !== scope(trip) || Date.now() > Date.parse(result.expiresAt));
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const next = structuredClone(state);
      const s = next.scenarios.find((s) => s.id === scenario.id)!;
      s.trips = s.trips.filter((t) => t.id !== trip.id);
      s.trips.push(trip);
      const data = await api<Evidence>('discovery', {
        state: next,
        scenarioId: scenario.id,
        tripId: trip.id,
      });
      setResult(data);
      setQuery(scope(trip));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const item = (e: EvidenceItem, i: number) => (
    <div className="evidence-item" key={i}>
      <div className="evidence-title">
        {i === 0 ? <Plane size={16} /> : i === 2 ? <CloudSun size={16} /> : <BedDouble size={16} />}
        <strong>{e.label}</strong>
        <span className={'pill ' + (e.status === 'unavailable' ? 'muted-pill' : '')}>
          {stale ? 'Stale' : e.status}
        </span>
      </div>
      {e.status === 'available' && e.amount !== undefined && !stale && (
        <h3>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: e.currency ?? 'USD',
          }).format(e.amount)}
        </h3>
      )}
      <p>{e.detail}</p>
      {e.taxes && <p>{e.taxes}</p>}
      {e.error && <p className="muted">{e.error}</p>}
      <a target="_blank" rel="noreferrer" href={e.sourceUrl}>
        {e.source} <ExternalLink size={12} />
      </a>
    </div>
  );
  return (
    <section className="evidence">
      <div className="section-heading">
        <div>
          <h3>A little more context</h3>
          <p className="muted small">
            MSP flights · one shared room · historical weather. Estimates are not bookings.
          </p>
        </div>
        <button className="secondary" disabled={busy} onClick={refresh}>
          <RefreshCw size={14} className={busy ? 'spin' : ''} />
          {busy ? 'Checking sources…' : 'Check sources'}
        </button>
      </div>
      {!result && (
        <p className="notice small">
          No prices or weather have been retrieved. Flights and lodging need configured provider
          access; historical weather needs network access. You can plan and save without them.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <>
          {stale && (
            <p className="notice">
              Dates, travelers, destination, or freshness changed. These results are stale; refresh
              before comparing.
            </p>
          )}
          {result.flights.map(item)}
          {item(result.lodging, 1)}
          {item(result.weather, 2)}
          <p className="small muted">
            Retrieved {new Date(result.retrievedAt).toLocaleString()} ·{' '}
            {result.cached ? '30-minute cached result' : 'source check'} · each traveler has a
            separate flight query. No combined total is shown when a component is unavailable.
          </p>
        </>
      )}
    </section>
  );
}
