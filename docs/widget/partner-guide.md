# CarbonRank Widget Partner Guide

## Overview
The CarbonRank widget renders commute CO2 badges for job listings and detail pages. Partners can integrate in two ways:

1) **Server-side render (SSR)** — compute scores server-side and inject into the page.
2) **Client-side scan** — embed the widget script and let it fetch scores from the CarbonRank API.

## Server-side render (preferred)

1) Call the CarbonRank API from your backend.
2) Inject the response into the page:

```
<span data-carbonrank='{"status":"ok","score":123,"breakdown":{"annualKgCO2e":123}}'></span>
```

3) Load the widget assets:

```
<link rel="stylesheet" href="https://cdn.example.com/widget-1.0.0.css" />
<script src="https://cdn.example.com/widget-1.0.0.js"></script>
<script>window.CarbonRankWidget?.init?.();</script>
```

## Client-side scan (pilots)

1) Load the widget assets:

```
<link rel="stylesheet" href="https://cdn.example.com/widget-1.0.0.css" />
<script src="https://cdn.example.com/widget-1.0.0.js"></script>
```

2) Configure the widget:

```
window.CarbonRankWidget?.init?.({
  apiBaseUrl: "https://api.carbonrank.io/api/widget/score",
  apiKey: "partner-key",
  cardSelector: ".job-card",
  fields: {
    employer: ".job-card__employer",
    location: ".job-card__location",
    link: ".job-card__link"
  }
});
```

## JSON-LD detail pages
If the job detail page contains `JobPosting` JSON-LD, the widget inserts a badge beneath the page `<h1>` automatically and requests scores from the API.

Remote roles are treated as 0 kgCO2e/yr when:
- `jobLocationType` is `TELECOMMUTE`, or
- `applicantLocationRequirements` is present.

## API request payload

```
{
  "title": "Job title",
  "employer": "Company",
  "locationName": "London",
  "lat": 51.5,
  "lon": -0.12,
  "remoteFlag": false,
  "jobUrl": "https://partner.example/jobs/123"
}
```

## CSP and CORS

- Add the widget CDN to `script-src` and `style-src`.
- Add the CarbonRank API to `connect-src`.
- The widget API enforces `Origin` allowlists for partner domains.

## SRI (optional)
Provide Subresource Integrity hashes in partner docs once assets are published:

```
<script src=".../widget-1.0.0.js" integrity="sha384-..." crossorigin="anonymous"></script>
```

## Demo deployment plan (static hosting)

1) Build the widget assets: `npm run build:widget`.
2) Upload `dist/widget-1.0.0.js` and `dist/widget-1.0.0.css` to a static host (S3, Cloudflare R2, Netlify).
3) Enable long-lived cache headers (1 year) and versioned URLs.
4) Share the CDN URL with partners and update the API allowlist.

## Troubleshooting

- **No badge appears**: ensure the widget script is loaded and `window.CarbonRankWidget.init()` runs.
- **CORS errors**: confirm the partner origin is in `WIDGET_PARTNERS_JSON`.
- **No data**: check that location data is present or that lat/lon can be resolved.
