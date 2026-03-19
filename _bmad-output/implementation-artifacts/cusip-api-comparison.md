# CUSIP API Comparison — OpenFIGI vs 13f.info

> Generated: 2026-03-19 | Story 2.1 Verification

## Summary

Three CUSIPs that fail to resolve via OpenFIGI were tested against 13f.info.
**All three resolved successfully via 13f.info**, confirming it as a viable alternative source.

## Comparison Table

| CUSIP     | OpenFIGI Result          | 13f.info Ticker | Company Name                                    | Resolved? | Notes                             |
| --------- | ------------------------ | --------------- | ----------------------------------------------- | --------- | --------------------------------- |
| 691543102 | `"No identifier found."` | OXLC            | Oxford Lane Capital Corp.                       | **Yes**   | CEF — OpenFIGI has no mapping     |
| 88636J527 | `"No identifier found."` | ULTY            | Tidal Trust II YieldMax Ultra O                 | **Yes**   | ETF — newer fund, not in OpenFIGI |
| 88634T493 | `"No identifier found."` | MSTY            | MSTY (YieldMax MSTR Option Income Strategy ETF) | **Yes**   | ETF — newer fund, not in OpenFIGI |

## 13f.info Endpoint Details

- **URL Pattern**: `https://13f.info/cusip/{CUSIP}`
- **Method**: GET (standard HTTP, returns HTML page)
- **Authentication**: None required (no API key)
- **Rate Limit**: No official public rate limit documented; applying 1 req/sec as a conservative baseline (mirrors Yahoo Finance delay pattern)

### Ticker Extraction Method

The ticker symbol is embedded in JSON-LD structured data within the HTML page:

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "name": "OXLC",
        "item": "https://13f.info/cusip/691543102",
        "alternateName": "Oxford Lane Capital Corp.",
        "identifier": "691543102",
        "@type": "ListItem",
        "position": 1
      }
    ]
  }
</script>
```

**Extraction**: `JSON.parse(jsonLdText).itemListElement[0].name` → ticker symbol

The `identifier` field echoes back the CUSIP.
`alternateName` is not consistently a human-readable company name across all CUSIPs (e.g., MSTY returns `"MSTY,0P0001R3R8,800499"`), so treat it as optional metadata only.
If a display name is needed, prefer the page `<title>` tag or another validated source.

## OpenFIGI Call Details

- **Endpoint**: `POST https://api.openfigi.com/v3/mapping`
- **Body**: `[{"idType":"ID_CUSIP","idValue":"CUSIP_HERE"}]`
- **Response for all three CUSIPs**: `[{"warning":"No identifier found."}]`

## Rate-Limiting Strategy

Per ADR-003, the integration will use a 1000 ms delay between requests to 13f.info, matching the existing Yahoo Finance rate-limit pattern in `apps/server/src/app/routes/common/distribution-api.function.ts`.

## Raw 13f.info Responses

### 691543102 (OXLC)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "name": "OXLC",
      "item": "https://13f.info/cusip/691543102",
      "alternateName": "Oxford Lane Capital Corp.",
      "identifier": "691543102",
      "@type": "ListItem",
      "position": 1
    }
  ]
}
```

### 88636J527 (ULTY)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "name": "ULTY",
      "item": "https://13f.info/cusip/88636J527",
      "alternateName": "Tidal Trust II YieldMax Ultra O",
      "identifier": "88636J527",
      "@type": "ListItem",
      "position": 1
    }
  ]
}
```

### 88634T493 (MSTY)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "name": "MSTY",
      "item": "https://13f.info/cusip/88634T493",
      "alternateName": "MSTY,0P0001R3R8,800499",
      "identifier": "88634T493",
      "@type": "ListItem",
      "position": 1
    }
  ]
}
```
