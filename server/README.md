# Adzuna proxy service

Local proxy for Adzuna search to keep API keys server-side.

## Setup

1) Copy the environment template:

```
cp .env.example .env
```

2) Add your Adzuna credentials:

```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

3) Build the proxy:

```
npm run server:build
```

4) Start the proxy:

```
npm run server:start
```

The proxy listens on `http://localhost:8787` by default.

## Endpoint

`GET /api/jobs/search`

Query parameters:

- `q` — keywords
- `where` — location
- `page` — page number (default 1)
- `radius_km` — distance radius
- `remote_only` — `true` or `1` to bias remote roles

Responses are normalised to:

```
{
  results: [
    {
      id,
      title,
      company,
      redirect_url,
      created,
      description_snippet,
      location_name,
      lat,
      lon
    }
  ],
  count,
  page,
  cached
}
```

## Widget API

`POST /api/widget/score`

Headers:

- `X-API-Key` — partner API key
- `Origin` — partner site origin

Request payload:

```
{
  "title": "Job title",
  "employer": "Company",
  "locationName": "London",
  "lat": 51.5,
  "lon": -0.12,
  "remoteFlag": false,
  "jobUrl": "https://partner.test/jobs/123"
}
```

Response payload:

```
{
  "badgeText": "123 kgCO2e/yr",
  "status": "ok",
  "score": 123,
  "breakdown": {
    "distanceKm": 12.3,
    "officeDaysPerWeek": 3,
    "annualKm": 3394,
    "emissionFactorKgPerKm": 0.171,
    "annualKgCO2e": 581
  },
  "reason": ""
}
```

### Configuration

Configure partner keys and origins via `WIDGET_PARTNERS_JSON`:

```
WIDGET_PARTNERS_JSON=[{"key":"partner-key","name":"Partner","origins":["https://partner.test"],"cacheTtlDays":3}]
```

Optional defaults:

```
WIDGET_HOME_LAT=51.5074
WIDGET_HOME_LON=-0.1278
WIDGET_COMMUTE_MODE=car
WIDGET_OFFICE_DAYS=3
WIDGET_CACHE_MAX=500
WIDGET_RATE_LIMIT_WINDOW_MS=60000
WIDGET_RATE_LIMIT_MAX=120
```
