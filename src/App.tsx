import { useEffect, useState } from 'react';
import {
  Compass,
  CalendarDays,
  MapPinned,
  GitBranch,
  Settings2,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Lock,
  RefreshCw,
  LogOut,
  Plane,
  Leaf,
  Heart,
  BookOpen,
  ChevronDown,
  Users,
  Download,
  History,
  Trash2,
} from 'lucide-react';
import { api, type Snapshot } from './api';
import {
  type State,
  type Scenario,
  type Trip,
  type PersonId,
  PEOPLE,
  nameOf,
  id,
  emptyPolicy,
} from './core/model';
import { forecast, displayHours, dates, assertScenario } from './core/pto';
import { destination, destinations } from './core/destinations';
import { ForecastCards, Ledger } from './components/Forecast';
import { Setup } from './components/Setup';
import { TripEditor } from './components/TripEditor';
import { Preview } from './components/Preview';
import { Modal } from './components/Modal';
import { Comparison } from './components/Compare';
import { DestinationMap } from './components/Map';
type Mode = 'year' | 'explore' | 'compare' | 'setup';
export default function App() {
  const [session, setSession] = useState<{
      setupRequired: boolean;
      user: string | null;
      authMode?: 'access';
    } | null>(null),
    [snap, setSnap] = useState<Snapshot | null>(null),
    [error, setError] = useState('');
  const [year, setYear] = useState(2027),
    [scenarioId, setScenarioId] = useState(''),
    [mode, setMode] = useState<Mode>('year'),
    [selectedDest, setSelectedDest] = useState('cozumel');
  const [editing, setEditing] = useState<{ trip: Trip | null; key: string } | null>(null),
    [preview, setPreview] = useState<{
      next: State;
      title: string;
      targetId?: string;
      scenarioId: string;
    } | null>(null),
    [ledger, setLedger] = useState<PersonId | null>(null),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState('');
  const [clone, setClone] = useState(false),
    [cloneName, setCloneName] = useState(''),
    [leaveOpen, setLeaveOpen] = useState(false),
    [history, setHistory] = useState<
      { revision: number; editor: string; saved_at: string }[] | null
    >(null);
  const [search, setSearch] = useState(''),
    [compareId, setCompareId] = useState('');
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [mode, year]);
  useEffect(() => {
    api('session')
      .then(setSession)
      .catch((e) => setError(e.message));
  }, []);
  async function load() {
    const data = await api<Snapshot>('state');
    setSnap(data);
    setError('');
    return data;
  }
  useEffect(() => {
    if (session?.user) load().catch((e) => setError(e.message));
  }, [session?.user]);
  const state = snap?.state;
  const scenarios = state?.scenarios.filter((s) => s.year === year) ?? [];
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  async function save(next: State, selectedId?: string) {
    if (!snap) return;
    setSaving(true);
    setSaveError('');
    try {
      const saved = await api<Snapshot>('state', { state: next, revision: snap.revision }, 'PUT');
      setSnap(saved);
      if (selectedId) setScenarioId(selectedId);
      setPreview(null);
      setEditing(null);
      setClone(false);
      setLeaveOpen(false);
    } catch (e) {
      setSaveError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }
  function showPreview(next: State, title: string, targetId?: string) {
    setSaveError('');
    setPreview({
      next,
      title,
      targetId,
      scenarioId:
        next.scenarios.find((s) => !state?.scenarios.some((old) => old.id === s.id))?.id ??
        scenario?.id ??
        scenarioId,
    });
  }
  async function unlock(trip: Trip, person?: PersonId, date?: string) {
    if (
      !confirm(
        `Explicitly unlock ${person ? nameOf(person) + ' on ' + date : trip.title}? This saves an unlock action. Unsaved editor changes will be discarded.`,
      )
    )
      return;
    try {
      const saved = await api<Snapshot>('unlock', {
        revision: snap!.revision,
        scenarioId: scenario!.id,
        tripId: trip.id,
        person,
        date,
      });
      setSnap(saved);
      setEditing({
        trip: saved.state.scenarios
          .find((s) => s.id === scenario!.id)!
          .trips.find((t) => t.id === trip.id)!,
        key: id(),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!session) return <div className="loading">{error || 'Opening your travel journal…'}</div>;
  if (!session.user && session.authMode === 'access') return <AccessLogin />;
  if (!session.user)
    return (
      <Login
        setup={session.setupRequired}
        onLogin={(user) => setSession({ setupRequired: false, user })}
      />
    );
  if (!state || !snap) return <div className="loading">{error || 'Loading your shared year…'}</div>;
  const allForecasts = scenario ? PEOPLE.map((p) => forecast(state, scenario, p)) : [];
  const known = allForecasts.length > 0 && allForecasts.every((f) => f.complete),
    deficits = allForecasts.filter((f) => f.firstDeficit);
  const trips = scenario
    ? [...scenario.trips].sort((a, b) =>
        (a.participants[0]?.days[0]?.date ?? '').localeCompare(
          b.participants[0]?.days[0]?.date ?? '',
        ),
      )
    : [];
  const edit = (trip: Trip | null = null) => setEditing({ trip, key: id() });
  const addYear = () => {
    const next = structuredClone(state);
    const s: Scenario = { id: id(), name: 'Our year', year, trips: [], leave: [] };
    next.scenarios.push(s);
    next.policies[year] ??= { ryan: emptyPolicy(), lily: emptyPolicy() };
    showPreview(next, `Create our ${year} plan`);
    setScenarioId(s.id);
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setMode('year');
          }}
        >
          <span className="brand-icon">
            <Compass size={27} />
          </span>
          <span>
            travel planner<small>RYAN & LILY</small>
          </span>
        </a>
        <div className="workspace">
          <span className="eyebrow">OUR SHARED JOURNAL</span>
          <label className="year-picker">
            Planning year
            <input
              aria-label="Planning year"
              type="number"
              min="2020"
              max="2099"
              value={year}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 2020 && n <= 2099) setYear(n);
              }}
            />
          </label>
        </div>
        <nav aria-label="Planner views">
          {(
            [
              ['year', CalendarDays, 'Our year'],
              ['explore', MapPinned, 'Explore places'],
              ['compare', GitBranch, 'Compare plans'],
              ['setup', Settings2, 'PTO & setup'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>
              <Icon size={19} />
              {label}
              {key === 'year' && <span className="nav-count">{trips.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={20} />
          <p>
            Less “someday.”
            <br />
            More <em>let’s go.</em>
          </p>
          <span>
            A little planning makes room
            <br />
            for a lot of possibility.
          </span>
        </div>
        <div className="sidebar-bottom">
          <div className="household-avatars">
            <span className="avatar ryan">R</span>
            <span className="avatar lily">L</span>
            <span>Made for the two of you</span>
          </div>
          <button
            className="text-button"
            onClick={async () => {
              const result = await api('logout', {});
              if (session.authMode === 'access') {
                window.location.assign(result.logoutUrl);
                return;
              }
              setSession({ setupRequired: false, user: null });
              setSnap(null);
            }}
          >
            <LogOut size={14} />
            Sign out {nameOf(session.user as PersonId)}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Our shared journal <span>/</span> {year}
          </div>
          <div className="topbar-right">
            <span className="save-state">
              <span />
              Saved · {nameOf(snap.editor as PersonId)} · v{snap.revision}
            </span>
            <button
              className="icon-button"
              aria-label="Reload shared plan"
              title="Reload changes from the other laptop"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              <RefreshCw size={16} />
            </button>
            <span className="avatar top-avatar">{session.user[0].toUpperCase()}</span>
          </div>
        </header>
        <main>
          {state.demo && (
            <div className="demo-banner">
              <BookOpen size={15} />
              <strong>DEMO JOURNAL</strong> Synthetic balances, dates, and trips. These are not your
              employer policies or bookings.
              <button
                className="text-button"
                onClick={async () => {
                  if (
                    !confirm(
                      'Archive the synthetic demo and start an empty real journal? Demo revisions remain recoverable in history. This does not copy any demo balances or bookings into real planning.',
                    )
                  )
                    return;
                  try {
                    const next = await api<Snapshot>('start-real', {
                      revision: snap.revision,
                      confirmation: 'START REAL JOURNAL',
                    });
                    setSnap(next);
                    setScenarioId('');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Start a real journal <ArrowRight size={12} />
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {mode === 'setup' ? (
            <Setup
              key={snap.revision + '-' + year}
              state={state}
              year={year}
              onPreview={showPreview}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A YEAR OF POSSIBILITIES</span>
                  <h1>
                    {mode === 'explore'
                      ? 'Somewhere worth going.'
                      : mode === 'compare'
                        ? 'Different paths. Your call.'
                        : `Let’s make ${year} a good one.`}
                  </h1>
                  <p>
                    {mode === 'explore'
                      ? 'Follow your curiosity. Then find the days to make it happen.'
                      : mode === 'compare'
                        ? 'Keep your favorite ideas side by side, without losing the original.'
                        : 'Big adventures, little escapes, and time for what matters.'}
                  </p>
                </div>
                {scenario && (
                  <button className="primary" onClick={() => edit()}>
                    <Plus size={17} />
                    Add a trip
                  </button>
                )}
              </div>
              {!scenario ? (
                <div className="empty-year">
                  <Compass size={46} />
                  <h2>Your {year} story starts here.</h2>
                  <p>Start with an empty shared plan and your own employment inputs.</p>
                  <button className="primary" onClick={addYear}>
                    Create {year} plan
                  </button>
                  {state.scenarios.length === 0 && (
                    <>
                      <span className="muted">or take a safe look around first</span>
                      <button
                        className="secondary"
                        onClick={async () => {
                          try {
                            const data = await api<Snapshot>('demo', { revision: snap.revision });
                            setSnap(data);
                            setYear(2027);
                            setScenarioId('baseline');
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Open synthetic demo journal
                      </button>
                      <p className="small muted">
                        Demo values are clearly labeled. Archive the demo to start an empty real
                        journal when you are ready.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="plan-toolbar">
                    <div>
                      <span className="plan-dot" />
                      <label className="scenario-select">
                        <span className="sr-only">Active scenario</span>
                        <select value={scenario.id} onChange={(e) => setScenarioId(e.target.value)}>
                          {scenarios.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.parentId ? ' · alternative' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="pill">
                        {scenario.parentId ? 'Named alternative' : 'Shared plan'}
                      </span>
                    </div>
                    <div>
                      <button
                        className="text-button"
                        onClick={() => {
                          setCloneName(scenario.name + ' · alternative');
                          setClone(true);
                        }}
                      >
                        <GitBranch size={14} />
                        Save an alternative
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setMode(mode === 'compare' ? 'year' : 'compare')}
                      >
                        Compare <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                  {mode === 'year' && (
                    <>
                      <section className="hero">
                        <div className="hero-copy">
                          <span className="hero-kicker">
                            <span />
                            THE BEST PLANS LEAVE ROOM TO WANDER
                          </span>
                          <h2>
                            Make room for
                            <br />
                            <em>somewhere new.</em>
                          </h2>
                          <p>
                            A whole year to explore. A shared place
                            <br />
                            to bring your next adventure to life.
                          </p>
                          <button onClick={() => setMode('explore')}>
                            Find your next somewhere <ArrowRight size={17} />
                          </button>
                        </div>
                        <div className="hero-stamp">
                          TAKE THE
                          <br />
                          <strong>scenic route</strong>
                          <span>✳</span>
                        </div>
                        <span className="photo-caption">
                          Mountain inspiration · moodboard photograph
                        </span>
                      </section>
                      <ForecastCards state={state} scenario={scenario} onInspect={setLedger} />
                      <div className="year-content">
                        <section>
                          <div className="section-heading">
                            <div>
                              <span className="eyebrow">THE BIG PICTURE</span>
                              <h2>
                                Your year, unfolding <span>{year}</span>
                              </h2>
                            </div>
                            <div className="legend">
                              <span className="person-dot ryan" />
                              Ryan <span className="person-dot lily" />
                              Lily <Lock size={12} />
                              Protected
                            </div>
                          </div>
                          <div className="month-grid">
                            {Array.from({ length: 12 }, (_, m) => {
                              const month = `${year}-${String(m + 1).padStart(2, '0')}`;
                              const monthTrips = trips.filter((t) =>
                                t.participants.some((p) =>
                                  p.days.some((d) => d.date.startsWith(month)),
                                ),
                              );
                              const breaks = state.breaks.filter(
                                (b) => b.start.slice(0, 7) <= month && b.end.slice(0, 7) >= month,
                              );
                              return (
                                <article
                                  className={'month-card ' + (monthTrips.length ? 'has-trips' : '')}
                                  key={m}
                                >
                                  <header>
                                    <h3>
                                      {new Date(Date.UTC(year, m, 1)).toLocaleDateString('en-US', {
                                        month: 'long',
                                        timeZone: 'UTC',
                                      })}
                                    </h3>
                                    <span>{String(m + 1).padStart(2, '0')}</span>
                                  </header>
                                  {monthTrips.map((t) => (
                                    <button
                                      className="calendar-trip"
                                      key={t.id}
                                      onClick={() => edit(t)}
                                    >
                                      <span className="trip-line">
                                        <strong>{t.title}</strong>
                                        {t.locked && <Lock size={11} />}
                                      </span>
                                      {t.participants.map((p) => {
                                        const ds = p.days
                                          .filter((d) => d.date.startsWith(month))
                                          .map((d) => d.date);
                                        return ds.length ? (
                                          <span className="calendar-person" key={p.person}>
                                            <span className={'person-dot ' + p.person} />
                                            {nameOf(p.person)} · {Number(ds[0].slice(-2))}
                                            {ds.length > 1
                                              ? '–' + Number(ds.at(-1)!.slice(-2))
                                              : ''}
                                          </span>
                                        ) : null;
                                      })}
                                    </button>
                                  ))}
                                  {breaks.map((b) => (
                                    <span className="school-break" key={b.id}>
                                      <Leaf size={11} />
                                      {b.title}
                                    </span>
                                  ))}
                                  {!monthTrips.length && !breaks.length && (
                                    <button className="month-empty" onClick={() => edit()}>
                                      A little room to wander <Plus size={12} />
                                    </button>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                          <div className="calendar-footer">
                            <Leaf size={14} />
                            <span>School breaks are opportunities, never restrictions.</span>
                            <span>Checked through Dec 31, {year}</span>
                          </div>
                        </section>
                        <aside className="trip-sidebar">
                          <div className="section-heading">
                            <h2>On the horizon</h2>
                            <span className="pill">{trips.length} trips</span>
                          </div>
                          {trips.slice(0, 3).map((t) => {
                            const d = destination(t.destination);
                            const all = t.participants
                              .flatMap((p) => p.days.map((d) => d.date))
                              .sort();
                            return (
                              <button className="trip-card" key={t.id} onClick={() => edit(t)}>
                                <div
                                  className={'trip-card-image ' + d.image}
                                  style={{
                                    backgroundImage: `url(/images/${d.image === 'coast' ? 'coast' : 'mountains'}.jpg)`,
                                  }}
                                >
                                  <span>{d.name.toUpperCase()}</span>
                                  {t.locked && (
                                    <span className="photo-lock">
                                      <Lock size={12} />
                                      Protected
                                    </span>
                                  )}
                                </div>
                                <div className="trip-card-copy">
                                  <h3>{t.title}</h3>
                                  <p>
                                    {all[0]} → {all.at(-1)}
                                  </p>
                                  <div>
                                    {t.participants.map((p) => (
                                      <span className={'person-chip ' + p.person} key={p.person}>
                                        {nameOf(p.person)}
                                      </span>
                                    ))}
                                    <ArrowUpRight size={15} />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {!trips.length && (
                            <div className="panel subtle">
                              <Plane size={24} />
                              <h3>Nothing booked. Plenty possible.</h3>
                              <p className="small muted">
                                Add an idea. You don’t need bookings or prices to start planning.
                              </p>
                            </div>
                          )}
                          <button className="add-card" onClick={() => edit()}>
                            <Plus size={18} />A new possibility
                          </button>
                          <p className="small muted photo-note">
                            Photos are travel moodboards, not destination-specific imagery.
                          </p>
                        </aside>
                      </div>
                      <section className="panel leave-panel">
                        <div className="section-heading">
                          <div>
                            <h2>Life happens between trips, too.</h2>
                            <p className="muted small">
                              Appointments, obligations, and other non-travel PTO belong in the same
                              forecast.
                            </p>
                          </div>
                          <button className="secondary" onClick={() => setLeaveOpen(true)}>
                            <Plus size={15} />
                            Add non-trip leave
                          </button>
                        </div>
                        {scenario.leave.map((l) => (
                          <div className="leave-row" key={l.id}>
                            <span className={'person-dot ' + l.person} />
                            <strong>{l.title}</strong>
                            <span>
                              {nameOf(l.person)} · {l.date} · {l.hours} h · {l.status}
                            </span>
                            <button
                              className="text-button"
                              onClick={() => {
                                const next = structuredClone(state);
                                const entry = next.scenarios
                                  .find((s) => s.id === scenario.id)!
                                  .leave.find((x) => x.id === l.id)!;
                                entry.status = l.status === 'actual' ? 'planned' : 'actual';
                                showPreview(next, 'Review usage reconciliation');
                              }}
                            >
                              Mark {l.status === 'actual' ? 'planned' : 'actual'}
                            </button>
                            <button
                              className="icon-button"
                              aria-label={'Remove ' + l.title}
                              onClick={() => {
                                const next = structuredClone(state);
                                next.scenarios.find((s) => s.id === scenario.id)!.leave =
                                  next.scenarios
                                    .find((s) => s.id === scenario.id)!
                                    .leave.filter((x) => x.id !== l.id);
                                showPreview(next, 'Review non-trip leave removal');
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </section>
                      {(!known || deficits.length > 0) && (
                        <section className="notice">
                          <Settings2 size={18} />
                          <span>
                            {!known
                              ? 'Employment setup is incomplete. Enter exact balances, payroll dates, holiday calendars, and carryover policies before trusting the forecast.'
                              : 'A projected shortage needs a closer look. Open a trip and preview its impact to find concrete flexible-trip tradeoffs.'}
                          </span>
                          <button
                            className="text-button"
                            onClick={() => setMode(!known ? 'setup' : 'compare')}
                          >
                            {!known ? 'Complete setup' : 'Review plans'}
                            <ArrowRight size={14} />
                          </button>
                        </section>
                      )}
                    </>
                  )}
                  {mode === 'explore' && (
                    <>
                      <div className="explore-layout">
                        <section>
                          <DestinationMap selected={selectedDest} onSelect={setSelectedDest} />
                          <p className="small muted">
                            Map geography is bundled, with no external tile service. Pan, zoom, or
                            select a place in the list. Flights default to MSP.
                          </p>
                        </section>
                        <div className="destination-detail">
                          <span className="eyebrow">
                            {destination(selectedDest).tag.toUpperCase()}
                          </span>
                          <h2>{destination(selectedDest).name}</h2>
                          <p className="destination-country">{destination(selectedDest).country}</p>
                          <p>{destination(selectedDest).description}</p>
                          <div
                            className="explore-photo"
                            style={{
                              backgroundImage: `url(/images/${destination(selectedDest).image === 'coast' ? 'coast' : 'mountains'}.jpg)`,
                            }}
                          />
                          <span className="small muted">
                            Moodboard photograph · inspiration only
                          </span>
                          <p className="small">
                            Choose individual dates in the trip editor. Check sourced flight,
                            lodging, and historical weather context there. No current quotes or
                            forecasts are implied.
                          </p>
                          <button className="primary" onClick={() => edit()}>
                            Plan a {destination(selectedDest).name} possibility{' '}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="section-heading">
                        <h2>Follow a little curiosity</h2>
                        <label className="search-input">
                          <span className="sr-only">Search destinations</span>
                          <input
                            placeholder="Find a destination…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="destination-grid">
                        {destinations
                          .filter((d) =>
                            (d.name + ' ' + d.country).toLowerCase().includes(search.toLowerCase()),
                          )
                          .map((d) => (
                            <button
                              key={d.id}
                              className={
                                'destination-card ' + (selectedDest === d.id ? 'selected' : '')
                              }
                              onClick={() => setSelectedDest(d.id)}
                            >
                              <span className="eyebrow">{d.tag}</span>
                              <h3>
                                {d.name}
                                <ArrowUpRight size={18} />
                              </h3>
                              <span>{d.country}</span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                  {mode === 'compare' && (
                    <div className="panel">
                      <div className="section-heading">
                        <h2>{scenario.name} alongside…</h2>
                        <select
                          aria-label="Comparison scenario"
                          value={compareId || scenarios.find((s) => s.id !== scenario.id)?.id || ''}
                          onChange={(e) => setCompareId(e.target.value)}
                        >
                          <option value="">Choose an alternative</option>
                          {scenarios
                            .filter((s) => s.id !== scenario.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {(() => {
                        const other = scenarios.find(
                          (s) =>
                            s.id === (compareId || scenarios.find((s) => s.id !== scenario.id)?.id),
                        );
                        return other ? (
                          <Comparison state={state} left={scenario} right={other} />
                        ) : (
                          <div className="empty-small">
                            <GitBranch size={35} />
                            <h3>Keep more than one good idea.</h3>
                            <p>
                              Save a named alternative, then compare dates and separate PTO
                              forecasts here.
                            </p>
                            <button
                              className="primary"
                              onClick={() => {
                                setCloneName('A different path');
                                setClone(true);
                              }}
                            >
                              Create an alternative
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Heart size={13} />A little more life in the calendar.
            </span>
            <div>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    setHistory(await api('history'));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <History size={13} />
                Revision history
              </button>
              <button
                className="text-button"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `travel-planner-${year}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={13} />
                Export journal
              </button>
            </div>
          </footer>
        </main>
      </div>
      {editing && scenario && (
        <TripEditor
          key={editing.key}
          initial={editing.trip}
          state={state}
          scenario={scenario}
          defaultDestination={selectedDest}
          onClose={() => setEditing(null)}
          onPreview={showPreview}
          onUnlock={unlock}
        />
      )}
      {preview && (
        <Preview
          key={preview.title}
          original={state}
          next={preview.next}
          scenarioId={preview.scenarioId}
          title={preview.title}
          targetId={preview.targetId}
          onClose={() => setPreview(null)}
          onSave={async (s, id) => {
            try {
              await save(s, id);
            } catch {}
          }}
          saving={saving}
          error={saveError}
          onReload={async () => {
            await load();
            setPreview(null);
            setEditing(null);
          }}
        />
      )}
      {ledger && scenario && (
        <Modal title={`${nameOf(ledger)}’s PTO, day by day`} onClose={() => setLedger(null)} wide>
          <div className="modal-content">
            <Ledger state={state} scenario={scenario} person={ledger} />
          </div>
        </Modal>
      )}
      {clone && scenario && (
        <Modal title="Keep another possibility" onClose={() => setClone(false)}>
          <div className="modal-content">
            <p>
              This creates an independent copy of trips, day locks, and non-trip leave. Employment
              facts remain shared.
            </p>
            <label>
              Alternative name
              <input value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
            </label>
          </div>
          <footer className="modal-actions">
            <button
              className="primary"
              disabled={!cloneName.trim()}
              onClick={() => {
                const next = structuredClone(state);
                const copy = structuredClone(scenario);
                copy.id = id();
                copy.name = cloneName.trim();
                copy.parentId = scenario.id;
                next.scenarios.push(copy);
                setClone(false);
                setScenarioId(copy.id);
                showPreview(next, 'Review named alternative');
              }}
            >
              Preview alternative
            </button>
          </footer>
        </Modal>
      )}
      {leaveOpen && scenario && (
        <LeaveEditor
          state={state}
          scenario={scenario}
          onClose={() => setLeaveOpen(false)}
          onPreview={showPreview}
        />
      )}
      {history && (
        <Modal title="Your journal has a memory" onClose={() => setHistory(null)}>
          <div className="modal-content">
            <p className="small muted">
              Previous server revisions are retained. Restoration is explicit, requires the latest
              revision, and cannot bypass current protected days.
            </p>
            {history.length === 0 ? (
              <p>No prior revisions yet.</p>
            ) : (
              history.map((h) => (
                <div className="history-row" key={h.revision}>
                  <span>
                    v{h.revision} · {nameOf(h.editor as PersonId)}
                    <small>{new Date(h.saved_at).toLocaleString()}</small>
                  </span>
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Restore revision ${h.revision} for the whole household? All scenarios and shared employment inputs will revert. Current locks are enforced.`,
                        )
                      )
                        return;
                      try {
                        setSnap(
                          await api<Snapshot>('restore', {
                            revision: snap.revision,
                            restoreRevision: h.revision,
                          }),
                        );
                        setHistory(null);
                      } catch (e) {
                        setError((e as Error).message);
                        setHistory(null);
                      }
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function LeaveEditor({
  state,
  scenario,
  onClose,
  onPreview,
}: {
  state: State;
  scenario: Scenario;
  onClose: () => void;
  onPreview: (s: State, title: string) => void;
}) {
  const [person, setPerson] = useState<PersonId>('ryan'),
    [date, setDate] = useState(''),
    [hours, setHours] = useState('8'),
    [title, setTitle] = useState(''),
    [error, setError] = useState('');
  return (
    <Modal title="Time off, closer to home" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const next = structuredClone(state);
            const s = next.scenarios.find((s) => s.id === scenario.id)!;
            s.leave.push({ id: id(), person, date, hours, title, status: 'planned' });
            assertScenario(s);
            onPreview(next, 'Review non-trip leave');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <div className="modal-content">
          <label>
            What is it for?
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Person
            <select value={person} onChange={(e) => setPerson(e.target.value as PersonId)}>
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {nameOf(p)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Date
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              PTO hours
              <input
                type="number"
                min="0"
                max="8"
                step="0.0001"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-actions">
          <button className="primary" type="submit">
            Preview leave impact
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function Login({ setup, onLogin }: { setup: boolean; onLogin: (user: string) => void }) {
  const [user, setUser] = useState('ryan'),
    [password, setPassword] = useState(''),
    [other, setOther] = useState(''),
    [code, setCode] = useState(''),
    [isSetup, setIsSetup] = useState(setup),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-story">
        <a className="brand" href="#">
          <Compass size={32} />
          <span>
            travel planner<small>RYAN & LILY</small>
          </span>
        </a>
        <div>
          <span className="eyebrow">A SHARED JOURNAL. A WORLD OF POSSIBILITY.</span>
          <h1>
            Good things
            <br />
            are on the
            <br />
            <em>horizon.</em>
          </h1>
          <p>
            A year of big adventures and little escapes.
            <br />
            Let’s make room for yours.
          </p>
        </div>
        <small>Mountain moodboard photograph · Start Bootstrap / Unsplash</small>
      </div>
      <section className="login-form">
        <span className="eyebrow">JUST THE TWO OF YOU</span>
        <h2>{isSetup ? 'Your story starts here.' : 'Welcome back, wanderer.'}</h2>
        <p>
          {isSetup
            ? 'Create the private household once. Each of you gets a separate login to the same saved planner.'
            : 'Sign in to your shared year of possibilities.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              if (isSetup) {
                await api('setup', { code, ryanPassword: password, lilyPassword: other });
                setIsSetup(false);
                setPassword('');
                setOther('');
                setCode('');
              } else {
                await api('login', { user, password });
                onLogin(user);
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {isSetup ? (
            <>
              <label>
                Private server setup code
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
              <p className="small muted">
                The code is in <code>DATA_DIR/setup-code.txt</code> on your server. It is never
                exposed by the app.
              </p>
              <label>
                Ryan’s password
                <input
                  type="password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Lily’s different password
                <input
                  type="password"
                  minLength={12}
                  required
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Your name
                <select value={user} onChange={(e) => setUser(e.target.value)}>
                  <option value="ryan">Ryan</option>
                  <option value="lily">Lily</option>
                </select>
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'One moment…' : isSetup ? 'Create private household' : 'Open our journal'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="login-privacy">
          <Lock size={14} />
          Private by default. Saved on your shared server.
        </p>
      </section>
    </div>
  );
}

function AccessLogin() {
  return (
    <div className="login-page">
      <div className="login-story">
        <a className="brand" href="/">
          <Compass size={32} />
          <span>
            travel planner<small>RYAN & LILY</small>
          </span>
        </a>
        <div>
          <span className="eyebrow">YOUR PRIVATE SHARED JOURNAL</span>
          <h1>
            Good things
            <br />
            are on the
            <br />
            <em>horizon.</em>
          </h1>
          <p>A year of big adventures and little escapes.</p>
        </div>
      </div>
      <section className="login-form">
        <span className="eyebrow">JUST THE TWO OF YOU</span>
        <h2>Your private journal awaits.</h2>
        <p>
          This hosted planner uses Cloudflare’s private email sign-in. Only Ryan and Lily’s
          configured email addresses can open saved plans.
        </p>
        <p>
          If the sign-in page did not appear, the owner needs to enable Access for all traffic on
          this deployment. No household data is available without a verified sign-in.
        </p>
        <button className="primary" onClick={() => window.location.reload()}>
          Try private sign-in <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
