import {
  type State,
  type Scenario,
  type Policy,
  type PersonId,
  type Credit,
  PEOPLE,
  nameOf,
} from './model';
export const SCALE = 10000;
export function units(value: string): number {
  if (!/^-?\d{1,7}(\.\d{1,4})?$/.test(value))
    throw new Error('Hours must be a number with at most four decimal places.');
  const negative = value.startsWith('-');
  const [whole, part = ''] = value.replace('-', '').split('.');
  return (Number(whole) * SCALE + Number(part.padEnd(4, '0'))) * (negative ? -1 : 1);
}
export const hours = (n: number) => (n / SCALE).toFixed(4).replace(/\.?0+$/, '') || '0';
export const displayHours = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n / SCALE);
export function validDate(d: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    Number.isFinite(Date.parse(d + 'T12:00:00Z')) &&
    new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d
  );
}
export const plusDays = (d: string, n: number) => {
  const date = new Date(d + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};
export const weekday = (d: string) => ![0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay());
export function dates(start: string, end: string): string[] {
  if (!validDate(start) || !validDate(end) || start > end)
    throw new Error('Enter a valid start and end date.');
  const list: string[] = [];
  for (let d = start; d <= end; d = plusDays(d, 1)) {
    if (list.length > 1100) throw new Error('Date range is too long.');
    list.push(d);
  }
  return list;
}
export function creditsFor(policy: Policy, end: string): Credit[] {
  const a = policy.accrual;
  if (!a) return [];
  if (a.cadence === 'explicit')
    return [...a.credits].filter((c) => c.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  if (!validDate(a.nextDate) || a.nextDate > end) return [];
  if (a.cadence === 'biweekly')
    return dates(a.nextDate, end)
      .filter((_, i) => i % 14 === 0)
      .map((date) => ({ date, hours: a.hours }));
  const result: Credit[] = [];
  const next = new Date(a.nextDate + 'T12:00:00Z');
  for (let y = next.getUTCFullYear(); y <= Number(end.slice(0, 4)); y++)
    for (let m = 0; m < 12; m++) {
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (const day of new Set(a.monthDays.map((d) => Math.min(d, last)))) {
        const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (date >= a.nextDate && date <= end) result.push({ date, hours: a.hours });
      }
    }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export interface LedgerRow {
  date: string;
  credit: number;
  debit: number;
  balance: number;
  reasons: string[];
  carriedOff: number;
}
export interface Forecast {
  complete: boolean;
  missing: string[];
  rows: LedgerRow[];
  firstDeficit: LedgerRow | null;
  minimum: number | null;
  ending: number | null;
  total: number;
  anchor: Policy['anchor'];
}
export function dailyDebits(s: Scenario, policy: Policy, p: PersonId) {
  const map = new Map<string, { amount: number; reasons: string[] }>();
  const paidOff = new Set(policy.holidays.filter((h) => units(h.hours) === 0).map((h) => h.date));
  function add(date: string, value: string, reason: string) {
    const u = paidOff.has(date) ? 0 : units(value);
    const old = map.get(date);
    map.set(date, {
      amount: Math.max(old?.amount ?? 0, u),
      reasons: [...(old?.reasons ?? []), reason],
    });
  }
  for (const h of policy.holidays) add(h.date, h.hours, `Holiday: ${h.label}`);
  for (const t of s.trips)
    for (const part of t.participants.filter((x) => x.person === p))
      for (const d of part.days)
        if (d.status !== 'cancelled')
          add(
            d.date,
            d.kind === 'pto' ? d.hours : '0',
            `${t.title}: ${d.kind}${d.status === 'planned' ? ' (planned)' : ''}`,
          );
  for (const l of s.leave.filter((l) => l.person === p && l.status !== 'cancelled'))
    add(l.date, l.hours, `${l.title} (${l.status})`);
  return map;
}
function forecastValid(state: State, s: Scenario, p: PersonId): Forecast {
  const policy = state.policies[String(s.year)]?.[p];
  const missing: string[] = [];
  const end = `${s.year}-12-31`;
  if (!policy?.anchor) missing.push('closing balance and as-of date');
  if (!policy?.accrual) missing.push('pay schedule (or explicit no credits)');
  if (!policy?.holidaysConfirmed) missing.push('reviewed employer holiday calendar');
  if (policy?.anchor && policy.anchor.date >= end)
    missing.push('anchor before the end of the planning year');
  if (policy?.anchor && policy.anchor.date < `${s.year - 1}-12-31`)
    missing.push(
      'an explicit opening anchor at prior December 31; earlier-year usage bridging is not yet supported',
    );
  if (
    policy?.anchor &&
    Number(policy.anchor.date.slice(0, 4)) < s.year &&
    !policy.rolloverConfirmed
  )
    missing.push('confirmed intervening-year carryover policy');
  if (!policy?.anchor || !policy?.accrual || policy.anchor.date >= end)
    return {
      complete: false,
      missing,
      rows: [],
      firstDeficit: null,
      minimum: null,
      ending: null,
      total: 0,
      anchor: policy?.anchor ?? null,
    };
  const debits = dailyDebits(s, policy, p),
    credits = creditsFor(policy, end),
    creditMap = new Map<string, number>();
  for (const c of credits) creditMap.set(c.date, (creditMap.get(c.date) ?? 0) + units(c.hours));
  let balance = units(policy.anchor.hours),
    total = 0;
  const rows: LedgerRow[] = [];
  for (const date of dates(plusDays(policy.anchor.date, 1), end)) {
    let carriedOff = 0;
    if (date.endsWith('-01-01') && policy.carryover !== null) {
      const next = Math.min(balance, units(policy.carryover));
      carriedOff = balance - next;
      balance = next;
    }
    const credit = creditMap.get(date) ?? 0;
    balance += credit;
    if (policy.balanceCap !== null) {
      const capped = Math.min(balance, units(policy.balanceCap));
      carriedOff += balance - capped;
      balance = capped;
    }
    const debit = debits.get(date)?.amount ?? 0;
    balance -= debit;
    if (Number(date.slice(0, 4)) === s.year) total += debit;
    rows.push({
      date,
      credit,
      debit,
      balance,
      reasons: debits.get(date)?.reasons ?? [],
      carriedOff,
    });
  }
  // Include the authoritative starting balance; a negative anchor is already a deficit.
  const anchorRow = {
    date: policy.anchor.date,
    credit: 0,
    debit: 0,
    balance: units(policy.anchor.hours),
    reasons: ['Authoritative closing anchor'],
    carriedOff: 0,
  };
  const checked = [anchorRow, ...rows];
  return {
    complete: missing.length === 0,
    missing,
    rows,
    firstDeficit: checked.find((r) => r.balance < 0) ?? null,
    minimum: Math.min(...checked.map((r) => r.balance)),
    ending: balance,
    total,
    anchor: policy.anchor,
  };
}
export function forecast(state: State, s: Scenario, p: PersonId): Forecast {
  try {
    return forecastValid(state, s, p);
  } catch (error) {
    return {
      complete: false,
      missing: ['invalid date or hours in current inputs: ' + (error as Error).message],
      rows: [],
      firstDeficit: null,
      minimum: null,
      ending: null,
      total: 0,
      anchor: state.policies[String(s.year)]?.[p]?.anchor ?? null,
    };
  }
}
export function safeExtra(
  state: State,
  s: Scenario,
  p: PersonId,
  date: string,
): { hours: number | null; reason: string } {
  if (!validDate(date)) return { hours: null, reason: 'Choose a valid date.' };
  const base = forecast(state, s, p);
  if (!base.complete) return { hours: null, reason: 'Complete employment setup first.' };
  if (base.firstDeficit)
    return {
      hours: null,
      reason: `Baseline already has a shortfall on ${base.firstDeficit.date}.`,
    };
  const policy = state.policies[String(s.year)][p];
  if (!weekday(date) || policy.holidays.some((h) => h.date === date && units(h.hours) === 0))
    return { hours: 0, reason: 'Already off: no additional PTO is needed on this date.' };
  if (!base.anchor || date <= base.anchor.date || date > `${s.year}-12-31`)
    return { hours: null, reason: 'Choose a date after the anchor within the checked year.' };
  // Resimulate: with caps/carryover, a scalar minimum alone is not reliable.
  let low = 0,
    high = 80000;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const copy = structuredClone(s);
    copy.leave.push({
      id: 'safe-extra',
      person: p,
      date,
      hours: hours(mid),
      title: 'Safe extra preview',
      status: 'planned',
    });
    if (!forecast(state, copy, p).firstDeficit) low = mid;
    else high = mid - 1;
  }
  const existing = dailyDebits(s, state.policies[String(s.year)][p], p).get(date)?.amount ?? 0;
  return {
    hours: Math.max(0, low - existing),
    reason: 'Additional hours on this date after checking every later balance (up to one workday).',
  };
}
export function assertScenario(s: Scenario) {
  const occupancy = new Set<string>();
  for (const t of s.trips) {
    if (!t.title.trim() || !t.destination)
      throw new Error('Every trip needs a title and destination.');
    if (!t.participants.length) throw new Error('Select at least one traveler.');
    for (const p of t.participants) {
      if (!p.days.length) throw new Error('A traveler needs at least one travel day.');
      const ds = p.days.map((d) => d.date).sort();
      if (dates(ds[0], ds.at(-1)!).length !== ds.length)
        throw new Error('Travel participation must be continuous.');
      for (const d of p.days) {
        const key = p.person + ':' + d.date;
        if (occupancy.has(key))
          throw new Error(
            `${nameOf(p.person)} has overlapping trips on ${d.date}. Resolve the travel conflict.`,
          );
        occupancy.add(key);
        if (!validDate(d.date) || units(d.hours) < 0 || units(d.hours) > 8 * SCALE)
          throw new Error('Day hours must be between 0 and 8.');
        if (d.kind !== 'pto' && units(d.hours) !== 0)
          throw new Error('Only PTO days may carry PTO hours.');
        if (!weekday(d.date) && units(d.hours) > 0)
          throw new Error(
            'Weekend PTO needs a work-schedule exception; the initial version supports Monday–Friday only.',
          );
      }
    }
  }
  const leaveKeys = new Set<string>();
  for (const l of s.leave) {
    const key = l.person + ':' + l.date;
    if (leaveKeys.has(key) || occupancy.has(key))
      throw new Error(
        'Overlapping leave must be resolved explicitly. Edit the existing trip day or leave entry.',
      );
    leaveKeys.add(key);
    if (!validDate(l.date) || !weekday(l.date) || units(l.hours) < 0 || units(l.hours) > 80000)
      throw new Error('Non-trip leave must be 0–8 hours on a weekday.');
  }
}
export function assertLocks(old: State, next: State) {
  for (const before of old.scenarios) {
    const after = next.scenarios.find((s) => s.id === before.id);
    for (const t of before.trips) {
      const n = after?.trips.find((x) => x.id === t.id);
      if (t.locked && JSON.stringify(t) !== JSON.stringify(n))
        throw new Error(`Unlock ${t.title} explicitly before changing it.`);
      for (const p of t.participants)
        for (const d of p.days.filter((d) => d.locked)) {
          const day = n?.participants
            .find((x) => x.person === p.person)
            ?.days.find((x) => x.date === d.date);
          if (!n || n.destination !== t.destination || JSON.stringify(day) !== JSON.stringify(d))
            throw new Error(
              `Unlock ${nameOf(p.person)}'s protected day ${d.date} explicitly first.`,
            );
        }
    }
  }
}
export function summaries(state: State, s: Scenario) {
  return Object.fromEntries(PEOPLE.map((p) => [p, forecast(state, s, p)])) as Record<
    PersonId,
    Forecast
  >;
}
