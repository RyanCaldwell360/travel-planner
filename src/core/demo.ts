import { type State, type Trip, type Policy, type PersonId } from './model';
import { dates, weekday } from './pto';
export function demoState(year = 2027): State {
  const y = String(year);
  const day = (d: string) => y + d;
  const policy = (anchor: string): Policy => ({
    anchor: { date: `${year - 1}-12-31`, hours: anchor },
    accrual: {
      cadence: 'explicit',
      nextDate: '',
      hours: '8',
      monthDays: [1, 15],
      credits: Array.from({ length: 11 }, (_, i) => ({
        date: `${year}-${String(i + 2).padStart(2, '0')}-01`,
        hours: '8',
      })),
    },
    holidaysConfirmed: true,
    holidays: [],
    balanceCap: null,
    carryover: null,
    rolloverConfirmed: true,
  });
  const trip = (
    id: string,
    title: string,
    destination: string,
    start: string,
    end: string,
    person: PersonId,
    locked = false,
  ): Trip => ({
    id,
    title,
    destination,
    locked,
    note: 'Synthetic demo dates. Not a booking or employer policy.',
    participants: [
      {
        person,
        days: dates(day(start), day(end)).map((date) => ({
          date,
          kind: weekday(date) ? 'pto' : 'off',
          hours: weekday(date) ? '8' : '0',
          locked: false,
          status: 'planned',
        })),
      },
    ],
  });
  return {
    demo: true,
    policies: { [y]: { ryan: policy('40'), lily: policy('64') } },
    breaks: [
      {
        id: 'demo-break',
        start: day('-03-22'),
        end: day('-03-26'),
        title: 'Example school break · demo',
      },
    ],
    scenarios: [
      {
        id: 'baseline',
        name: 'Our year',
        year,
        trips: [
          trip('september', 'A little September escape', 'lisbon', '-09-10', '-09-10', 'ryan'),
          trip('october', 'One more long weekend', 'aspen', '-10-08', '-10-08', 'ryan'),
          trip('fall', 'Autumn by the sea', 'cozumel', '-11-15', '-11-22', 'ryan', true),
          trip('winter', 'A winter reset', 'athens', '-12-01', '-12-07', 'ryan', true),
        ],
        leave: [],
      },
    ],
  };
}
