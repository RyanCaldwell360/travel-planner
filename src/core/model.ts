export type PersonId = 'ryan' | 'lily';
export const PEOPLE: PersonId[] = ['ryan', 'lily'];
export const nameOf = (p: PersonId) => (p === 'ryan' ? 'Ryan' : 'Lily');
export interface Anchor {
  date: string;
  hours: string;
}
export interface Credit {
  date: string;
  hours: string;
}
export interface Holiday {
  date: string;
  label: string;
  hours: string;
}
export interface Policy {
  anchor: Anchor | null;
  accrual: {
    cadence: 'explicit' | 'biweekly' | 'semimonthly';
    nextDate: string;
    hours: string;
    monthDays: [number, number];
    credits: Credit[];
  } | null;
  holidaysConfirmed: boolean;
  holidays: Holiday[];
  balanceCap: string | null;
  carryover: string | null;
  rolloverConfirmed: boolean;
}
export interface Day {
  date: string;
  kind: 'pto' | 'remote' | 'business' | 'off';
  hours: string;
  locked: boolean;
  status: 'planned' | 'actual' | 'cancelled';
}
export interface Participation {
  person: PersonId;
  days: Day[];
}
export interface Trip {
  id: string;
  title: string;
  destination: string;
  locked: boolean;
  participants: Participation[];
  note: string;
}
export interface Leave {
  id: string;
  person: PersonId;
  date: string;
  hours: string;
  title: string;
  status: 'planned' | 'actual' | 'cancelled';
}
export interface Scenario {
  id: string;
  name: string;
  year: number;
  trips: Trip[];
  leave: Leave[];
  parentId?: string;
}
export interface SchoolBreak {
  id: string;
  start: string;
  end: string;
  title: string;
}
export interface State {
  demo: boolean;
  policies: Record<string, Record<PersonId, Policy>>;
  scenarios: Scenario[];
  breaks: SchoolBreak[];
}
export const emptyPolicy = (): Policy => ({
  anchor: null,
  accrual: null,
  holidaysConfirmed: false,
  holidays: [],
  balanceCap: null,
  carryover: null,
  rolloverConfirmed: false,
});
export const emptyState = (): State => ({ demo: false, policies: {}, scenarios: [], breaks: [] });
export const id = () => crypto.randomUUID();
