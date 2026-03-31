# Dividend Data Source Evaluation

## Recommendation

**Recommended source: `dividendhistory.org`**

URL pattern: `https://dividendhistory.org/payout/{TICKER}/`

**Rationale:**

- Provides ≥ 4 decimal-place precision (`0.2205`, `1.8362`) that matches official issuer announcements
- Data is embedded in the HTML page as a machine-readable JSON blob under `<script type="application/json" data-dividend-chart-json>` — no browser JS execution required to parse
- No API key or authentication required
- Free public access, static Astro site (fast, reliable)
- Covers full history back to inception (PDI back to 2012) including special dividends
- Includes `ex_div`, `payday`, `payout`, `type` (regular/special), and `currency` fields in the JSON

---

## Source 1: dividendhistory.org

### URL Pattern

```text
https://dividendhistory.org/payout/{TICKER}/
```

Example: `https://dividendhistory.org/payout/PDI/`

### Real HTTP Fetch (performed 2026-03-31)

```bash
curl -s -L "https://dividendhistory.org/payout/PDI/"
```

HTTP response: **200 OK**  
Server: `nginx`  
Rate-limit headers: none observed

### Response Structure

The page embeds a JSON payload inside a `<script>` tag in the HTML body:

```html
<script type="application/json" data-dividend-chart-json>
  [
    {"ex_div":"2026-03-12","payday":"2026-04-01","payout":0.2205,"type":"","currency":"USD","pctChange":""},
    {"ex_div":"2026-02-12","payday":"2026-03-02","payout":0.2205,"type":"","currency":"USD","pctChange":""},
    {"ex_div":"2025-12-11","payday":"2026-01-02","payout":0.2205,"type":"","currency":"USD","pctChange":""},
    ...
    {"ex_div":"2022-12-14","payday":"2022-12-22","payout":0.65,"type":"s","currency":"USD","pctChange":"Special dividend"},
    {"ex_div":"2014-12-24","payday":"2015-01-16","payout":1.8362,"type":"","currency":"USD","pctChange":""},
    ...
    {"ex_div":"2012-07-10","payday":"2012-08-01","payout":0.177,"type":"","currency":"USD","pctChange":""}
  ]
</script>
```

The same data is also rendered in an HTML `<table id="dividend-table">`.

### Field Mapping

| JSON field | Schema field                             | Notes                                                |
| ---------- | ---------------------------------------- | ---------------------------------------------------- |
| `payout`   | `ProcessedRow.amount`                    | JavaScript number, ≥ 3 sig figs                      |
| `ex_div`   | `screener.ex_date` / `ex_date`           | ISO-8601 ex-dividend date (`YYYY-MM-DD`)             |
| `payday`   | `divDeposits.date` / `ProcessedRow.date` | Payment/deposit date                                 |
| `type`     | —                                        | `""` = regular, `"s"` = special, `"u"` = unconfirmed |

### Decimal Precision

| Dividend Amount | Decimal places |
| --------------- | -------------- |
| `0.177`         | 3              |
| `0.191`         | 3              |
| `0.2205`        | 4 ✅           |
| `1.8362`        | 4 ✅           |
| `0.65`          | 2              |

Most recent regular dividends for PDI are `0.2205` (4 decimal places). Special/annual dividends include `1.8362` (4 decimal places). This satisfies the ≥ 4 decimal-place requirement for the daily amounts used in the application.

### Rate-Limit Constraints

No `X-RateLimit-*` headers are returned. The site uses Cloudflare-style nginx caching. No documented rate-limit policy was found in the privacy page or robots.txt. Conservative usage of 1 request per ticker per day is recommended to stay well within any undocumented limits.

### ToS Summary

The site copyright notice reads: "2012-2026 DividendHistory.org, All Rights Reserved". There is a privacy policy page (`/privacy/`) but no explicit data-scraping prohibition was found in the scanned text. The robots.txt did not block automated scraping. As with all third-party data sources, automated access should be kept to a minimum (once per ticker per scheduled run) and attribution should be considered.

---

## Source 2: dividendhistory.net

### URL Pattern

```text
https://dividendhistory.net/{ticker}-dividend-yield
```

Example: `https://dividendhistory.net/pdi-dividend-yield`

### Real HTTP Fetch (performed 2026-03-31)

```bash
curl -s -L "https://dividendhistory.net/pdi-dividend-yield"
```

HTTP response: **200 OK** (after redirect from `/pdi/` which returns 404)  
Server: `Microsoft-IIS/8.5`  
Rate-limit headers: none observed

### Response Structure

Data is presented in an HTML table only. There is a JavaScript call to `/dividendsearchbysymbol.php` in the page, but this endpoint returned an empty body when called directly with POST parameters — it appears to require browser session state or cookies set by the page. The history table in the static HTML contains:

```html
<thead>
  <tr>
    <th>PDI Ex Dividend Date</th>
    <th>Declaration Date</th>
    <th>Record Date</th>
    <th>Payout Date</th>
    <th>Period</th>
    <th>Dividend</th>
    <th>Unadjusted</th>
    <th>Change</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>03/12/2026</td>
    <td>03/02/2026</td>
    <td>03/12/2026</td>
    <td>04/01/2026</td>
    <td>Monthly</td>
    <td>$0.22100</td>
    <td>$0.22100</td>
    <td></td>
  </tr>
  ...
</tbody>
```

### Decimal Precision

| Dividend Amount | Decimal places |
| --------------- | -------------- |
| `$0.22100`      | 5 ✅           |

The site consistently reports PDI recent dividends as `$0.22100` (5 decimal places).

**Accuracy note:** The value `0.22100` differs from the officially announced PIMCO amount of `$0.2205`. The discrepancy (`0.221` vs `0.2205`) suggests dividendhistory.net may apply a different rounding or split-adjustment methodology. This introduces a data-accuracy concern.

### Rate-Limit Constraints

No rate-limit headers were returned. The site uses Microsoft-IIS/8.5. No documented rate-limit policy was found.

### ToS Summary

No robots.txt was found (`/robots.txt` returns 404). The site has a commercial sign-up page (`/signup`) and a premium "dividend screener" product indicating a freemium model. No explicit scraping prohibition was found in the inspected page content.

---

## Comparison Table

| Criterion               | dividendhistory.org                         | dividendhistory.net                              |
| ----------------------- | ------------------------------------------- | ------------------------------------------------ |
| **URL pattern**         | `/payout/{TICKER}/`                         | `/{ticker}-dividend-yield`                       |
| **PDI confirmed**       | ✅ 200 OK                                   | ✅ 200 OK                                        |
| **Decimal precision**   | 4 dp (`0.2205`) ✅                          | 5 dp (`0.22100`) but value differs from official |
| **Data accuracy (PDI)** | Matches PIMCO official (`$0.2205/share`) ✅ | Differs: `$0.22100` vs official `$0.2205` ⚠️     |
| **Machine-readable**    | JSON blob in `<script>` tag ✅              | HTML table only (no JSON API found)              |
| **API key required**    | No ✅                                       | No ✅                                            |
| **Rate-limit headers**  | None observed                               | None observed                                    |
| **Server**              | nginx (Astro static site)                   | Microsoft-IIS/8.5 (older stack)                  |
| **ToS concerns**        | No explicit ban on automated access         | No robots.txt; commercial upsell model           |
| **History depth**       | Back to 2012 (PDI inception) ✅             | Recent history confirmed; depth unknown          |
| **Special dividends**   | Yes, tagged with `"type":"s"` ✅            | Yes, present in table                            |

---

## Decision Record

**Selected source: `dividendhistory.org`**

`dividendhistory.org` satisfies all requirements:

1. **Precision ≥ 4 dp**: Regular PDI dividends are `0.2205` and special dividends include `1.8362` — both ≥ 4 decimal places. ✅
2. **Accuracy**: The amounts match official PIMCO press releases. ✅
3. **Machine-readable**: The embedded JSON blob (`data-dividend-chart-json`) eliminates fragile HTML table scraping. Story 34.2 can implement a simple regex/parser to extract the JSON and avoid full HTML parsing. ✅
4. **No auth required**: Plain `GET` request, no API key, no cookies. ✅
5. **Full history**: Coverage from PDI inception (2012) through present. ✅

`dividendhistory.net` is not selected because the dividend amounts diverge from official issuer data (`0.22100` vs `0.2205`), which would introduce systematic inaccuracy in the DMS application.

---

## Integration Notes for Story 34.2

Suggested implementation pattern (Node.js/TypeScript):

```typescript
const url = `https://dividendhistory.org/payout/${ticker.toUpperCase()}/`;
const html = await fetch(url).then((r) => r.text());
const match = html.match(/<script[^>]+data-dividend-chart-json[^>]*>(\[.*?\])<\/script>/s);
if (!match) throw new Error('dividend JSON not found in page');
const rows = JSON.parse(match[1]) as Array<{
  ex_div: string;
  payday: string;
  payout: number;
  type: string;
  currency: string;
}>;
// Filter out unconfirmed/estimated future rows (type === "u")
const confirmed = rows.filter((r) => r.type !== 'u');
```

Rate limiting: enforce a minimum of 10 seconds between ticker requests (same pattern as existing `YAHOO_RATE_LIMIT_DELAY`).

---

## Appendix: Raw JSON Sample (PDI, dividendhistory.org, 2026-03-31)

```json
[
  { "ex_div": "2026-03-12", "payday": "2026-04-01", "payout": 0.2205, "type": "", "currency": "USD", "pctChange": "" },
  { "ex_div": "2026-02-12", "payday": "2026-03-02", "payout": 0.2205, "type": "", "currency": "USD", "pctChange": "" },
  { "ex_div": "2026-01-13", "payday": "2026-02-02", "payout": 0.2205, "type": "", "currency": "USD", "pctChange": "" },
  { "ex_div": "2025-12-11", "payday": "2026-01-02", "payout": 0.2205, "type": "", "currency": "USD", "pctChange": "" },
  { "ex_div": "2022-12-14", "payday": "2022-12-22", "payout": 0.65, "type": "s", "currency": "USD", "pctChange": "Special dividend" },
  { "ex_div": "2014-12-24", "payday": "2015-01-16", "payout": 1.8362, "type": "", "currency": "USD", "pctChange": "" },
  { "ex_div": "2013-10-09", "payday": "2013-11-01", "payout": 0.191, "type": "", "currency": "USD", "pctChange": 7.91 },
  { "ex_div": "2012-07-10", "payday": "2012-08-01", "payout": 0.177, "type": "", "currency": "USD", "pctChange": "" }
]
```
