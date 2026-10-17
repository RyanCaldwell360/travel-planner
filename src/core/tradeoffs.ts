import { type State, type Scenario, type PersonId, PEOPLE } from './model';
import { forecast, dailyDebits, units, type Forecast, assertScenario } from './pto';
export interface Cut {
  tripId: string;
  tripTitle: string;
  person: PersonId;
  date: string;
  hours: number;
}
export interface Option {
  scenario: Scenario;
  cuts: Cut[];
  forecasts: Record<PersonId, Forecast>;
}
export function findTradeoffs(
  state: State,
  source: Scenario,
  targetId?: string,
  limit = 1800,
): { options: Option[]; checked: number; truncated: boolean } {
  const initial = PEOPLE.map((p) => forecast(state, source, p));
  if (initial.some((f) => !f.complete) || initial.every((f) => !f.firstDeficit))
    return { options: [], checked: 0, truncated: false };
  const queue: { s: Scenario; cuts: Cut[] }[] = [{ s: structuredClone(source), cuts: [] }];
  const seen = new Set<string>();
  const options: Option[] = [];
  let checked = 0;
  let pruned = false;
  while (queue.length && checked < limit && options.length < 8) {
    const node = queue.shift()!;
    checked++;
    const forecasts = Object.fromEntries(
      PEOPLE.map((p) => [p, forecast(state, node.s, p)]),
    ) as Record<PersonId, Forecast>;
    const failing = PEOPLE.filter((p) => forecasts[p].firstDeficit);
    if (!failing.length) {
      options.push({ scenario: node.s, cuts: node.cuts, forecasts });
      continue;
    }
    for (const person of failing) {
      const first = forecasts[person].firstDeficit!.date,
        policy = state.policies[String(source.year)][person];
      const before = dailyDebits(node.s, policy, person);
      for (const t of node.s.trips.filter((t) => !t.locked && t.id !== targetId)) {
        const part = t.participants.find((p) => p.person === person);
        if (!part) continue;
        const days = [...part.days].sort((a, b) => a.date.localeCompare(b.date));
        // Only shorten boundaries, including intervening free days. Never assume remote work.
        for (const reverse of [false, true]) {
          const ordered = reverse ? [...days].reverse() : days;
          const removed: typeof days = [];
          for (const day of ordered) {
            if (day.locked || day.status === 'actual') break;
            removed.push(day);
            if (day.kind !== 'pto' || day.status === 'cancelled' || units(day.hours) === 0)
              continue;
            if (day.date > first || day.date <= policy.anchor!.date) break;
            const copy = structuredClone(node.s);
            const trip = copy.trips.find((x) => x.id === t.id)!;
            const participation = trip.participants.find((x) => x.person === person)!;
            participation.days = participation.days.filter(
              (d) => !removed.some((r) => r.date === d.date),
            );
            if (!participation.days.length)
              trip.participants = trip.participants.filter((p) => p.person !== person);
            if (!trip.participants.length) copy.trips = copy.trips.filter((x) => x.id !== t.id);
            try {
              assertScenario(copy);
            } catch {
              break;
            }
            const after = dailyDebits(copy, policy, person);
            const freed = removed.reduce(
              (n, d) => n + (before.get(d.date)?.amount ?? 0) - (after.get(d.date)?.amount ?? 0),
              0,
            );
            if (freed > 0) {
              const signature = JSON.stringify(copy.trips.map((t) => [t.id, t.participants]));
              if (!seen.has(signature)) {
                if (seen.size >= limit || queue.length >= 120) {
                  pruned = true;
                  break;
                }
                seen.add(signature);
                queue.push({
                  s: copy,
                  cuts: [
                    ...node.cuts,
                    ...removed.map((d) => ({
                      tripId: t.id,
                      tripTitle: t.title,
                      person,
                      date: d.date,
                      hours: (before.get(d.date)?.amount ?? 0) - (after.get(d.date)?.amount ?? 0),
                    })),
                  ],
                });
              }
              break;
            }
          }
        }
      }
    }
  }
  options.sort(
    (a, b) =>
      new Set(a.cuts.map((c) => c.tripId)).size - new Set(b.cuts.map((c) => c.tripId)).size ||
      a.cuts.length - b.cuts.length,
  );
  return { options: options.slice(0, 4), checked, truncated: queue.length > 0 || pruned };
}
