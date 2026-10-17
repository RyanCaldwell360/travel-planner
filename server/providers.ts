import { createHash } from 'node:crypto';
import { z } from 'zod';
import { destination } from '../src/core/destinations';
import { type Trip } from '../src/core/model';
export interface EvidenceItem {
  status: 'available' | 'unavailable';
  label: string;
  source: string;
  sourceUrl: string;
  detail: string;
  amount?: number;
  currency?: string;
  taxes?: string;
  scope?: string;
  error?: string;
}
export interface Evidence {
  fingerprint: string;
  retrievedAt: string;
  expiresAt: string;
  flights: EvidenceItem[];
  lodging: EvidenceItem;
  weather: EvidenceItem;
  cached?: boolean;
}
export const fingerprint = (trip: Trip) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        destination: trip.destination,
        participants: trip.participants
          .map((p) => ({ person: p.person, dates: p.days.map((d) => d.date).sort() }))
          .sort((a, b) => a.person.localeCompare(b.person)),
        rooms: 1,
        currency: 'USD',
        origin: 'MSP',
      }),
    )
    .digest('hex');
const unavailable = (
  label: string,
  source: string,
  sourceUrl: string,
  detail: string,
): EvidenceItem => ({ status: 'unavailable', label, source, sourceUrl, detail });
async function jsonFetch(url: string, options: RequestInit = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Provider returned HTTP ${r.status}`);
  return r.json();
}
let token: { value: string; expires: number } | null = null;
const base = () =>
  process.env.AMADEUS_ENV === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
async function auth() {
  if (token && token.expires > Date.now() + 60000) return token.value;
  const data = await jsonFetch(base() + '/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
  });
  const parsed = z.object({ access_token: z.string(), expires_in: z.number() }).parse(data);
  token = { value: parsed.access_token, expires: Date.now() + parsed.expires_in * 1000 };
  return token.value;
}
const getAmadeus = async (path: string, params: Record<string, string>) =>
  jsonFetch(`${base()}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${await auth()}` },
  });
export interface TravelAdapter {
  flights(trip: Trip): Promise<EvidenceItem[]>;
  lodging(trip: Trip): Promise<EvidenceItem>;
}
export const amadeusAdapter: TravelAdapter = {
  async flights(trip) {
    const dest = destination(trip.destination);
    return Promise.all(
      trip.participants.map(async (p) => {
        const days = p.days.map((d) => d.date).sort();
        const scope = `${p.person === 'ryan' ? 'Ryan' : 'Lily'} · 1 adult · MSP ↔ ${dest.airport} · ${days[0]}–${days.at(-1)} · economy round trip`;
        const fallback = unavailable(
          'Flight estimate',
          'Amadeus',
          'https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search',
          scope,
        );
        if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET)
          return {
            ...fallback,
            error: 'Provider credentials are not configured. No fare has been retrieved.',
          };
        try {
          const data = await getAmadeus('/v2/shopping/flight-offers', {
            originLocationCode: 'MSP',
            destinationLocationCode: dest.airport,
            departureDate: days[0],
            returnDate: days.at(-1)!,
            adults: '1',
            currencyCode: 'USD',
            max: '3',
          });
          const parsed = z
            .object({
              data: z.array(
                z.object({ price: z.object({ grandTotal: z.string(), currency: z.string() }) }),
              ),
            })
            .parse(data);
          const offer = parsed.data.sort(
            (a, b) => Number(a.price.grandTotal) - Number(b.price.grandTotal),
          )[0];
          if (!offer) throw new Error('No matching offers');
          const amount = Number(offer.price.grandTotal);
          if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');
          return {
            status: 'available',
            label: `${process.env.AMADEUS_ENV === 'production' ? 'Flight offer' : 'Sandbox flight offer · not live inventory'}`,
            source: 'Amadeus',
            sourceUrl: fallback.sourceUrl,
            detail: scope,
            scope,
            amount,
            currency: offer.price.currency,
            taxes: 'Provider grand total; ancillary fees and baggage may be extra.',
          } as EvidenceItem;
        } catch (e) {
          return {
            ...fallback,
            error: `Unavailable: ${(e as Error).message}. Search the source or try again later.`,
          };
        }
      }),
    );
  },
  async lodging(trip) {
    const ds = trip.participants.flatMap((p) => p.days.map((d) => d.date)).sort();
    const nights = Math.round((Date.parse(ds.at(-1)!) - Date.parse(ds[0])) / 86400000);
    const occupancy = trip.participants.length;
    const scope = `One shared room · ${occupancy} adult maximum occupancy · ${ds[0]}–${ds.at(-1)} · ${nights} nights. Split arrivals use maximum occupancy for the entire stay (approximation). Never multiplied per traveler.`;
    const fallback = unavailable(
      'Lodging estimate',
      'Amadeus',
      'https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-search',
      scope,
    );
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET)
      return {
        ...fallback,
        error: 'Provider credentials are not configured. No room price has been retrieved.',
      };
    if (nights < 1)
      return { ...fallback, error: 'An overnight stay is required for a lodging query.' };
    try {
      const locations = z.object({ data: z.array(z.object({ hotelId: z.string() })) }).parse(
        await getAmadeus('/v1/reference-data/locations/hotels/by-city', {
          cityCode: destination(trip.destination).airport,
          radius: '30',
          radiusUnit: 'KM',
        }),
      );
      if (!locations.data.length) throw new Error('No matching hotels');
      const data = await getAmadeus('/v3/shopping/hotel-offers', {
        hotelIds: locations.data
          .slice(0, 3)
          .map((h) => h.hotelId)
          .join(','),
        adults: String(occupancy),
        roomQuantity: '1',
        checkInDate: ds[0],
        checkOutDate: ds.at(-1)!,
        currency: 'USD',
      });
      const parsed = z
        .object({
          data: z.array(
            z.object({
              hotel: z.object({ name: z.string() }),
              offers: z.array(
                z.object({ price: z.object({ total: z.string(), currency: z.string() }) }),
              ),
            }),
          ),
        })
        .parse(data);
      const offers = parsed.data
        .flatMap((h) => h.offers.map((o) => ({ name: h.hotel.name, ...o.price })))
        .sort((a, b) => Number(a.total) - Number(b.total));
      const o = offers[0];
      if (!o || !Number.isFinite(Number(o.total)) || Number(o.total) <= 0)
        throw new Error('No valid room offer');
      return {
        status: 'available',
        label:
          process.env.AMADEUS_ENV === 'production'
            ? 'Lodging offer'
            : 'Sandbox lodging offer · not live inventory',
        source: 'Amadeus',
        sourceUrl: fallback.sourceUrl,
        detail: `${o.name}. ${scope}`,
        scope,
        amount: Number(o.total),
        currency: o.currency,
        taxes: 'Tax inclusion unknown; verify the hotel offer before booking.',
      };
    } catch (e) {
      return {
        ...fallback,
        error: `Unavailable: ${(e as Error).message}. Inventory/date coverage may be limited.`,
      };
    }
  },
};
export interface WeatherAdapter {
  context(trip: Trip): Promise<EvidenceItem>;
}
export const openMeteoAdapter: WeatherAdapter = {
  async context(trip) {
    const d = destination(trip.destination),
      month = trip.participants[0].days[0].date.slice(5, 7),
      year = new Date().getUTCFullYear() - 1;
    const start = `${year}-${month}-01`,
      end = `${year}-${month}-${new Date(Date.UTC(year, Number(month), 0)).getUTCDate()}`;
    const url =
      'https://archive-api.open-meteo.com/v1/archive?' +
      new URLSearchParams({
        latitude: String(d.lat),
        longitude: String(d.lon),
        start_date: start,
        end_date: end,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'auto',
      });
    const fallback = unavailable(
      'Historical weather context',
      'Open-Meteo / ERA5',
      'https://open-meteo.com/en/docs/historical-weather-api',
      `${d.name} · ${start}–${end} · prior-year sample, not a climate normal or trip forecast.`,
    );
    try {
      const data = z
        .object({
          daily: z.object({
            temperature_2m_max: z.array(z.number().nullable()),
            temperature_2m_min: z.array(z.number().nullable()),
            precipitation_sum: z.array(z.number().nullable()),
          }),
        })
        .parse(await jsonFetch(url));
      const avg = (a: (number | null)[]) => {
        const x = a.filter((n): n is number => n !== null);
        if (x.length < 20) throw new Error('Insufficient historical observations');
        return x.reduce((a, b) => a + b, 0) / x.length;
      };
      const hi = avg(data.daily.temperature_2m_max),
        lo = avg(data.daily.temperature_2m_min),
        rain = avg(data.daily.precipitation_sum);
      return {
        ...fallback,
        status: 'available',
        detail: `${fallback.detail} Mean daily high ${hi.toFixed(1)}°C, low ${lo.toFixed(1)}°C; mean daily precipitation ${rain.toFixed(1)} mm. Reanalysis grid, not station observations. CC BY 4.0 attribution: Open-Meteo / Copernicus.`,
      };
    } catch (e) {
      return {
        ...fallback,
        error: `Historical data unavailable: ${(e as Error).message}. No forecast is inferred.`,
      };
    }
  },
};
export interface EvidenceCache {
  readEvidence(key: string): Promise<Evidence | undefined>;
  saveEvidence(key: string, result: Evidence): Promise<void>;
}
export async function getDiscovery(
  store: EvidenceCache,
  trip: Trip,
  travel: TravelAdapter = amadeusAdapter,
  weather: WeatherAdapter = openMeteoAdapter,
): Promise<Evidence> {
  const key = fingerprint(trip);
  const cached = await store.readEvidence(key);
  if (cached && Date.parse(cached.expiresAt) > Date.now()) return { ...cached, cached: true };
  const [flights, lodging, context] = await Promise.all([
    travel.flights(trip),
    travel.lodging(trip),
    weather.context(trip),
  ]);
  const retrievedAt = new Date().toISOString();
  const result: Evidence = {
    fingerprint: key,
    retrievedAt,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    flights,
    lodging,
    weather: context,
  };
  await store.saveEvidence(key, result);
  return result;
}
