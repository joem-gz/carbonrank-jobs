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
