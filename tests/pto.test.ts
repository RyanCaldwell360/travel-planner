import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyPolicy, type State, type Scenario, type Policy } from '../src/core/model';
import {
  forecast,
  units,
  creditsFor,
  assertLocks,
  assertScenario,
  safeExtra,
} from '../src/core/pto';
import { findTradeoffs } from '../src/core/tradeoffs';
import { demoState } from '../src/core/demo';
const policy = (): Policy => ({
  ...emptyPolicy(),
  anchor: { date: '2026-12-31', hours: '40' },
  accrual: { cadence: 'explicit', nextDate: '', hours: '0', monthDays: [1, 15], credits: [] },
  holidaysConfirmed: true,
  rolloverConfirmed: true,
});
const fixture = () => {
  const s: Scenario = { id: 's', year: 2027, name: 'test', trips: [], leave: [] };
  const state: State = {
    demo: true,
    policies: { 2027: { ryan: policy(), lily: policy() } },
    scenarios: [s],
    breaks: [],
  };
  return { s, state, p: state.policies[2027].ryan };
};
const leave = (s: Scenario, date: string, hours: string, id = date) =>
  s.leave.push({ id, person: 'ryan', date, hours, title: 'test', status: 'planned' });
test('A03 checks every future balance; February can cause a December deficit', () => {
  const { s, state, p } = fixture();
  p.accrual!.credits = Array.from({ length: 11 }, (_, i) => ({
    date: `2027-${String(i + 2).padStart(2, '0')}-01`,
    hours: '8',
  }));
  leave(s, '2027-11-01', '48');
  leave(s, '2027-12-01', '40');
  assert.equal(forecast(state, s, 'ryan').minimum, units('40'));
  leave(s, '2027-02-15', '48');
  const f = forecast(state, s, 'ryan');
  assert.equal(f.rows.find((r) => r.date === '2027-02-15')!.balance, 0);
  assert.equal(f.firstDeficit!.date, '2027-12-01');
  assert.equal(f.firstDeficit!.balance, units('-8'));
});
test('A01/A02/A15 travel presence, remote work and holiday use have unique daily debits', () => {
  const { s, state, p } = fixture();
  s.trips = [
    {
      id: 't',
      title: 'Trip',
      destination: 'cozumel',
      note: '',
      locked: false,
      participants: [
        {
          person: 'ryan',
          days: [
            { date: '2027-02-15', kind: 'remote', hours: '0', locked: false, status: 'planned' },
            { date: '2027-02-19', kind: 'pto', hours: '8', locked: false, status: 'planned' },
          ],
        },
      ],
    },
  ];
  p.holidays = [{ date: '2027-02-19', label: 'Required', hours: '8' }];
  assert.equal(forecast(state, s, 'ryan').total, units('8'));
  s.trips = [];
  assert.equal(forecast(state, s, 'ryan').total, units('8'));
  assert.equal(forecast(state, s, 'lily').total, 0);
});
test('A04 later credits and November cuts cannot repair February; A06 no borrowing', () => {
  const { s, state, p } = fixture();
  p.anchor!.hours = '8';
  p.accrual!.credits = [{ date: '2027-03-01', hours: '40' }];
  leave(s, '2027-02-15', '16');
  s.trips = [
    {
      id: 'donor',
      title: 'Later',
      destination: 'lisbon',
      locked: false,
      note: '',
      participants: [
        {
          person: 'ryan',
          days: [{ date: '2027-11-01', kind: 'pto', hours: '8', locked: false, status: 'planned' }],
        },
      ],
    },
  ];
  state.policies[2027].lily.anchor!.hours = '80';
  assert.equal(findTradeoffs(state, s).options.length, 0);
  assert.equal(forecast(state, s, 'ryan').firstDeficit!.balance, units('-8'));
});
test('A05 combined donors; each complete candidate is resimulated for both people', () => {
  const state = demoState();
  const s = state.scenarios[0];
  for (const date of ['15', '16', '17', '18', '19'])
    s.leave.push({
      id: 'target' + date,
      title: 'February',
      person: 'ryan',
      date: '2027-02-' + date,
      hours: '8',
      status: 'planned',
    });
  const result = findTradeoffs(state, s);
  assert.ok(result.options.length);
  const option = result.options[0];
  assert.equal(new Set(option.cuts.map((c) => c.tripId)).size, 2);
  assert.equal(
    option.cuts.reduce((n, c) => n + c.hours, 0),
    units('16'),
  );
  assert.equal(option.forecasts.ryan.firstDeficit, null);
  assert.equal(option.forecasts.lily.firstDeficit, null);
  assert.equal(s.trips.length, 4);
});
test('A07 server locks cover deletion and zero-PTO protected days', () => {
  const old = demoState();
  const next = structuredClone(old);
  next.scenarios[0].trips.pop();
  assert.throws(() => assertLocks(old, next), /Unlock/);
  const a = demoState();
  a.scenarios[0].trips[0].participants[0].days[0] = {
    date: '2027-09-10',
    kind: 'remote',
    hours: '0',
    locked: true,
    status: 'planned',
  };
  const b = structuredClone(a);
  b.scenarios[0].trips.shift();
  assert.throws(() => assertLocks(a, b), /protected day/);
});
test('A08 precision, start-of-day credits, distinct biweekly/semimonthly dates and leap month ends', () => {
  const { state, s, p } = fixture();
  p.anchor!.hours = '0';
  p.accrual!.credits = ['2027-01-01', '2027-01-02', '2027-01-03'].map((date) => ({
    date,
    hours: '7.6923',
  }));
  assert.equal(forecast(state, s, 'ryan').ending, units('23.0769'));
  p.accrual = {
    cadence: 'biweekly',
    nextDate: '2028-01-07',
    hours: '8',
    monthDays: [15, 31],
    credits: [],
  };
  assert.equal(creditsFor(p, '2028-03-31').filter((c) => c.date.startsWith('2028-03')).length, 3);
  p.accrual.cadence = 'semimonthly';
  assert.ok(creditsFor(p, '2028-03-31').some((c) => c.date === '2028-02-29'));
  assert.equal(creditsFor(p, '2028-03-31').filter((c) => c.date.startsWith('2028-03')).length, 2);
});
test('A09 closing anchor supersedes past leave; actual does not double charge, cancellation restores', () => {
  const { s, state, p } = fixture();
  p.anchor = { date: '2027-03-31', hours: '24' };
  leave(s, '2027-03-30', '8');
  leave(s, '2027-04-01', '8');
  assert.equal(forecast(state, s, 'ryan').ending, units('16'));
  s.leave[1].status = 'actual';
  assert.equal(forecast(state, s, 'ryan').ending, units('16'));
  s.leave[1].status = 'cancelled';
  assert.equal(forecast(state, s, 'ryan').ending, units('24'));
});
test('A10 isolated scenarios share corrections, A13 year scope and unknown setup', () => {
  const { s, state, p } = fixture();
  const copy = structuredClone(s);
  copy.id = 'alt';
  leave(copy, '2027-02-01', '8');
  assert.equal(forecast(state, s, 'ryan').total, 0);
  p.anchor!.hours = '16';
  assert.equal(forecast(state, copy, 'ryan').ending, units('8'));
  p.rolloverConfirmed = false;
  assert.equal(forecast(state, s, 'ryan').complete, false);
});
test('A15 mandatory holiday cannot fund a donor; weekend/overlap rejected', () => {
  const state = demoState();
  const s = state.scenarios[0];
  state.policies[2027].ryan.holidays = [{ date: '2027-09-10', label: 'Required', hours: '8' }];
  leave(s, '2027-02-15', '40');
  assert.equal(findTradeoffs(state, s).options.length, 0);
  const x = demoState();
  x.scenarios[0].trips[0].participants[0].days[0].date = '2027-09-11';
  assert.throws(() => assertScenario(x.scenarios[0]), /Weekend/);
});
test('safe additional leave reports a broken baseline and respects caps through resimulation', () => {
  const { s, state, p } = fixture();
  p.balanceCap = '40';
  p.accrual!.credits = [{ date: '2027-03-01', hours: '40' }];
  leave(s, '2027-04-01', '40');
  assert.equal(safeExtra(state, s, 'ryan', '2027-02-01').hours, units('8'));
  leave(s, '2027-02-01', '48');
  assert.equal(safeExtra(state, s, 'ryan', '2027-02-01').hours, null);
});
test('A01 exact independent continuous schedules and A02 Lily holiday outside travel', () => {
  const { s, state } = fixture();
  const ryan = Array.from({ length: 7 }, (_, i) => ({
    date: `2027-02-${15 + i}`,
    kind: (i < 4 ? 'remote' : i === 4 ? 'pto' : 'off') as 'remote' | 'pto' | 'off',
    hours: i === 4 ? '8' : '0',
    locked: false,
    status: 'planned' as const,
  }));
  s.trips = [
    {
      id: 'cozumel',
      title: 'Synthetic Cozumel',
      destination: 'cozumel',
      locked: false,
      note: 'fixture only',
      participants: [
        { person: 'ryan', days: ryan },
        { person: 'lily', days: ryan.slice(4) },
      ],
    },
  ];
  assertScenario(s);
  assert.equal(forecast(state, s, 'ryan').total, units('8'));
  assert.equal(forecast(state, s, 'lily').total, units('8'));
  state.policies[2027].lily.holidays = [
    { date: '2027-02-19', hours: '8', label: 'Required synthetic holiday' },
  ];
  assert.equal(forecast(state, s, 'lily').total, units('8'));
  s.trips = [];
  assert.equal(forecast(state, s, 'lily').total, units('8'));
  assert.equal(forecast(state, s, 'ryan').total, 0);
});
test('paid holidays are already off, weekend safe-extra is zero, and same-day credit precedes debit', () => {
  const { s, state, p } = fixture();
  p.anchor!.hours = '0';
  p.holidays = [{ date: '2027-02-01', hours: '0', label: 'Paid holiday fixture' }];
  leave(s, '2027-02-01', '8');
  assert.equal(forecast(state, s, 'ryan').total, 0);
  assert.equal(safeExtra(state, s, 'ryan', '2027-02-01').hours, 0);
  assert.equal(safeExtra(state, s, 'ryan', '2027-02-06').hours, 0);
  p.accrual!.credits = [{ date: '2027-02-02', hours: '8' }];
  leave(s, '2027-02-02', '8');
  assert.equal(forecast(state, s, 'ryan').firstDeficit, null);
});
test('year-spanning participation is retained while the ledger ends at the selected December 31', () => {
  const { s, state, p } = fixture();
  p.anchor!.hours = '40';
  s.trips = [
    {
      id: 'newyear',
      title: 'Synthetic year crossing',
      destination: 'aspen',
      note: '',
      locked: false,
      participants: [
        {
          person: 'ryan',
          days: [
            { date: '2027-12-31', kind: 'pto', hours: '8', locked: false, status: 'planned' },
            { date: '2028-01-01', kind: 'off', hours: '0', locked: false, status: 'planned' },
            { date: '2028-01-02', kind: 'off', hours: '0', locked: false, status: 'planned' },
            { date: '2028-01-03', kind: 'pto', hours: '8', locked: false, status: 'planned' },
          ],
        },
      ],
    },
  ];
  assertScenario(s);
  const f = forecast(state, s, 'ryan');
  assert.equal(f.total, units('8'));
  assert.equal(f.rows.at(-1)!.date, '2027-12-31');
  assert.equal(s.trips[0].participants[0].days.length, 4);
  p.anchor!.date = '2026-10-01';
  assert.equal(forecast(state, s, 'ryan').complete, false);
});
test('caps and carryover are separate rules; authoritative corrections and malformed drafts never look feasible', () => {
  const { s, state, p } = fixture();
  p.anchor = { date: '2026-12-31', hours: '60' };
  p.carryover = '24';
  p.balanceCap = '32';
  p.accrual!.credits = [{ date: '2027-01-01', hours: '16' }];
  leave(s, '2027-01-01', '8');
  const f = forecast(state, s, 'ryan');
  assert.equal(f.rows[0].balance, units('24'));
  assert.equal(f.rows[0].carriedOff, units('44'));
  p.anchor.hours = '';
  assert.equal(forecast(state, s, 'ryan').complete, false);
});
test('tradeoffs never shorten a participant across an actual-used day or protected zero-hour boundary', () => {
  const state = demoState();
  const s = state.scenarios[0];
  s.trips[0].participants[0].days[0].status = 'actual';
  for (const date of ['15', '16', '17', '18', '19']) leave(s, '2027-02-' + date, '8');
  assert.equal(findTradeoffs(state, s).options.length, 0);
  s.trips[0].participants[0].days[0].status = 'planned';
  s.trips[0].participants[0].days[0].locked = true;
  assert.equal(findTradeoffs(state, s).options.length, 0);
});
