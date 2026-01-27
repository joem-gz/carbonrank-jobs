# Adzuna proxy service

Local proxy for Adzuna search to keep API keys server-side.

## Setup

1) Copy the environment template:

```
cp .env.example .env
```

2) Add your Adzuna and Companies House credentials:

```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
COMPANIES_HOUSE_API_KEY=your_company_house_key
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

## Endpoints

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

`GET /api/employer/resolve`

Query parameters:

- `name` — employer name (required)
- `hint_location` — optional location hint for ranking

Response:

```
{
  candidates: [
    {
      company_number,
      title,
      status,
      address_snippet,
      sic_codes,
      score,
      reasons,
      org_classification,
      classification_reasons
    }
  ],
  cached
}
```

`GET /api/employer/signals`

Query parameters:

- `company_number` — Companies House number (required)

Response:

```
{
  company_number,
  sic_codes,
  sector_intensity_band,
  sector_intensity_value,
  sector_intensity_sic_code,
  sector_description,
  sources,
  cached
}
```
