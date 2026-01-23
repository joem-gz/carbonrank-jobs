import { getCachedGeocode, setCachedGeocode } from "../storage/cache";
import { GeocodeResult } from "../scoring/types";

const MAX_INFLIGHT = 4;
const inflightByPostcode = new Map<string, Promise<GeocodeResult | null>>();
const queue: Array<() => void> = [];
let inflightCount = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = async () => {
      inflightCount += 1;
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        inflightCount -= 1;
        const next = queue.shift();
        if (next) {
          next();
        }
      }
    };

    if (inflightCount < MAX_INFLIGHT) {
      run();
    } else {
      queue.push(run);
    }
  });
}

async function fetchPostcode(postcode: string): Promise<GeocodeResult | null> {
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    status: number;
    result?: { latitude: number; longitude: number } | null;
  };

  if (payload.status !== 200 || !payload.result) {
    return null;
  }

  return {
    latitude: payload.result.latitude,
    longitude: payload.result.longitude,
  };
}

export async function geocodePostcode(postcode: string): Promise<GeocodeResult | null> {
  const normalized = postcode.trim().toUpperCase();
  const cached = await getCachedGeocode(normalized);
  if (cached) {
    return {
      latitude: cached.lat,
      longitude: cached.lng,
    };
  }

  const existing = inflightByPostcode.get(normalized);
  if (existing) {
    return existing;
  }

  const promise = schedule(async () => {
    const result = await fetchPostcode(normalized);
    if (result) {
      await setCachedGeocode(normalized, {
        lat: result.latitude,
        lng: result.longitude,
        updatedAt: Date.now(),
      });
    }
    return result;
  });

  inflightByPostcode.set(normalized, promise);

  try {
    return await promise;
  } finally {
    inflightByPostcode.delete(normalized);
  }
}
