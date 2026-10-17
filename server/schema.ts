import { destinations } from '../src/core/destinations';
import { z } from 'zod';
import { assertScenario, validDate, units } from '../src/core/pto';
import { PEOPLE, type State } from '../src/core/model';
const date = z.string().refine(validDate, 'Invalid calendar date');
const hour = z.string().refine((v) => {
  try {
    return units(v) >= 0 && units(v) <= 1000000000;
  } catch {
    return false;
  }
}, 'Hours must be nonnegative, with up to 4 decimals');
const text = z.string().max(300),
  id = z.string().min(1).max(100),
  person = z.enum(['ryan', 'lily']);
const policy = z.object({
  anchor: z
    .object({
      date,
      hours: z.string().refine((v) => {
        try {
          units(v);
          return true;
        } catch {
          return false;
        }
      }),
    })
    .nullable(),
  accrual: z
    .object({
      cadence: z.enum(['explicit', 'biweekly', 'semimonthly']),
      nextDate: z.string(),
      hours: hour,
      monthDays: z.tuple([z.number().int().min(1).max(31), z.number().int().min(1).max(31)]),
      credits: z.array(z.object({ date, hours: hour })).max(800),
    })
    .nullable(),
  holidaysConfirmed: z.boolean(),
  holidays: z.array(z.object({ date, label: text, hours: hour })).max(400),
  balanceCap: hour.nullable(),
  carryover: hour.nullable(),
  rolloverConfirmed: z.boolean(),
});
export const stateSchema = z.object({
  demo: z.boolean(),
  policies: z.record(z.string().regex(/^20\d{2}$/), z.object({ ryan: policy, lily: policy })),
  breaks: z.array(z.object({ id, start: date, end: date, title: text })).max(100),
  scenarios: z
    .array(
      z.object({
        id,
        name: text.min(1),
        year: z.number().int().min(2020).max(2099),
        parentId: id.optional(),
        trips: z
          .array(
            z.object({
              id,
              title: text.min(1),
              destination: id.refine(
                (v) => destinations.some((d) => d.id === v),
                'Choose a supported destination.',
              ),
              locked: z.boolean(),
              note: z.string().max(2000),
              participants: z
                .array(
                  z.object({
                    person,
                    days: z
                      .array(
                        z.object({
                          date,
                          kind: z.enum(['pto', 'remote', 'business', 'off']),
                          hours: hour,
                          locked: z.boolean(),
                          status: z.enum(['planned', 'actual', 'cancelled']),
                        }),
                      )
                      .min(1)
                      .max(400),
                  }),
                )
                .min(1)
                .max(2),
            }),
          )
          .max(150),
        leave: z
          .array(
            z.object({
              id,
              person,
              date,
              hours: hour,
              title: text.min(1),
              status: z.enum(['planned', 'actual', 'cancelled']),
            }),
          )
          .max(500),
      }),
    )
    .max(40),
});
export function validateState(input: unknown): State {
  const state = stateSchema.parse(input);
  const ids = new Set<string>();
  for (const s of state.scenarios) {
    if (ids.has(s.id)) throw new Error('Duplicate scenario ID');
    ids.add(s.id);
    assertScenario(s);
    const tripIds = new Set<string>();
    for (const t of s.trips) {
      if (tripIds.has(t.id)) throw new Error('Duplicate trip ID');
      tripIds.add(t.id);
      if (new Set(t.participants.map((p) => p.person)).size !== t.participants.length)
        throw new Error('Duplicate traveler');
      for (const p of t.participants) {
        if (!p.days.some((d) => d.date.startsWith(String(s.year))))
          throw new Error('A trip must include a day in its selected year.');
      }
    }
  }
  for (const [year, policies] of Object.entries(state.policies))
    for (const p of PEOPLE) {
      const v = policies[p];
      if (
        v.anchor &&
        (Number(v.anchor.date.slice(0, 4)) < Number(year) - 1 || v.anchor.date >= year + '-12-31')
      )
        throw new Error(
          'Use a closing anchor from this year or the prior year, before December 31.',
        );
      if (v.accrual) {
        if (v.accrual.cadence !== 'explicit' && !validDate(v.accrual.nextDate))
          throw new Error('Enter the next actual payroll credit date.');
        if (new Set(v.accrual.credits.map((c) => c.date)).size !== v.accrual.credits.length)
          throw new Error('Duplicate payroll credit date.');
        if (
          v.accrual.cadence === 'semimonthly' &&
          v.accrual.monthDays[0] === v.accrual.monthDays[1]
        )
          throw new Error('Choose two different monthly payroll days.');
      }
      if (new Set(v.holidays.map((h) => h.date)).size !== v.holidays.length)
        throw new Error('Duplicate holiday date.');
      for (const h of v.holidays)
        if (
          units(h.hours) > 80000 ||
          ([0, 6].includes(new Date(h.date + 'T12:00:00Z').getUTCDay()) && units(h.hours) > 0)
        )
          throw new Error('Holiday PTO must be 0–8 hours on a weekday; enter the observed day.');
    }
  for (const b of state.breaks)
    if (b.start > b.end) throw new Error('School break end must follow its start.');
  return state;
}
