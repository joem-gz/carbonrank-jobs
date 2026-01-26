export type AdzunaApiJob = {
  id?: string | number;
  title?: string;
  company?: { display_name?: string; name?: string } | string;
  redirect_url?: string;
  url?: string;
  created?: string;
  description?: string;
  description_snippet?: string;
  location?: {
    display_name?: string;
    area?: string[];
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  latitude?: number;
  longitude?: number;
};

export type AdzunaApiResponse = {
  results?: AdzunaApiJob[];
  count?: number;
};

export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  redirect_url: string;
  created: string;
  description_snippet: string;
  location_name: string;
  lat: number | null;
  lon: number | null;
};
