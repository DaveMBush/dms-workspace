# Story 53.1: Investigate dividendhistory.net HTML Structure for VFL, ACP, IFN, and FAX

Status: Approved

## Story

As a developer,
I want to verify the actual HTML structure of dividendhistory.net for the symbols VFL, ACP, IFN, and FAX using the Playwright MCP server,
so that any parsing code is based on empirical observation of the live site rather than assumptions carried over from dividendhistory.org.

## Acceptance Criteria

1. **Given** the Playwright MCP server is available,
   **When** the developer navigates to `https://dividendhistory.net/payout/VFL/`, `https://dividendhistory.net/payout/ACP/`, `https://dividendhistory.net/payout/IFN/`, and `https://dividendhistory.net/payout/FAX/`,
   **Then** the actual HTML response for each URL is inspected and the relevant dividend data structure is identified and documented.

2. **Given** the current implementation in `dividend-history.service.ts` uses `extractDividendJson` which looks for a `<script data-dividend-chart-json>` tag,
   **When** the live dividendhistory.net pages for VFL, ACP, IFN, and FAX are inspected,
   **Then** it is confirmed whether the `<script data-dividend-chart-json>` pattern exists on the live site — or the actual pattern used is identified and documented.

3. **Given** the investigation is complete,
   **When** the findings are summarised,
   **Then** a clear statement is produced describing: (a) whether the existing parsing code will work as-is, or (b) what specific changes are needed to correctly extract dividend data from dividendhistory.net.

4. **Given** any HTTP requests to dividendhistory.net are made during investigation,
   **When** the request headers are observed,
   **Then** the browser-like headers applied in Story 50.1 are confirmed to be accepted (i.e., the site returns a valid 200 response and not a block/redirect).

## Definition of Done

- [ ] Playwright MCP server used to load dividendhistory.net pages for VFL, ACP, IFN, and FAX
- [ ] Actual HTML structure of the dividend data on each page is documented in the story completion notes
- [ ] Confirmed whether `<script data-dividend-chart-json>` exists on dividendhistory.net or the correct alternative pattern is identified
- [ ] HTTP response status for all four symbols confirmed as 200 (not blocked)
- [ ] Investigation findings are sufficient for Story 53.2 to proceed with implementation

## Tasks / Subtasks

- [ ] **Navigate to each test URL using the Playwright MCP server** (AC: #1, #4)
  - [ ] Open `https://dividendhistory.net/payout/VFL/`
  - [ ] Open `https://dividendhistory.net/payout/ACP/`
  - [ ] Open `https://dividendhistory.net/payout/IFN/`
  - [ ] Open `https://dividendhistory.net/payout/FAX/`
  - [ ] Confirm HTTP 200 response for each (not a block or redirect)

- [ ] **Inspect page source for `<script data-dividend-chart-json>` tag** (AC: #2)
  - [ ] Use `page.content()` or the accessibility snapshot / evaluate tools to extract the raw HTML
  - [ ] Search for the string `data-dividend-chart-json` in the HTML source of each page
  - [ ] Note whether the tag is present, absent, or named differently

- [ ] **Identify the actual dividend data structure** (AC: #1, #2)
  - [ ] If `<script data-dividend-chart-json>` is absent, locate where dividend data is embedded (e.g., alternative script tag attributes, inline JSON, table rows, other element)
  - [ ] Extract a sample of the data structure for one symbol (e.g., VFL) to confirm field names (`ex_div`, `payday`, `payout`, `type`, `currency`, `pctChange`)
  - [ ] Note any structural differences across the four symbols

- [ ] **Capture network request details** (AC: #4)
  - [ ] Use Playwright network request inspection to confirm the request used browser-like headers
  - [ ] Confirm the response status code for each URL is 200

- [ ] **Summarise findings** (AC: #3)
  - [ ] Write a clear finding: does `extractDividendJson` work as-is, or must it be changed?
  - [ ] If changes are needed, describe the precise regex or selector update required
  - [ ] Record findings in the Dev Agent Record section of this file

## Dev Notes

### Service to Investigate

**File:** `apps/server/src/app/routes/common/dividend-history.service.ts`

This file was updated in Epic 50 (Story 50.1) to switch from `dividendhistory.org` to `dividendhistory.net` and to add browser-like request headers. However, the HTML structure of the new domain was assumed to be identical to the old domain — **this assumption was never empirically verified**.

### Current Parsing Logic

The critical function under investigation is `extractDividendJson`:

```typescript
function extractDividendJson(html: string): DividendHistoryRow[] | null {
  const scriptRegex =
    /<script[^>]+data-dividend-chart-json[^>]*>([\s\S]*?)<\/script>/;
  const match = scriptRegex.exec(html);
  if (!match) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return Array.isArray(parsed) ? (parsed as DividendHistoryRow[]) : null;
  } catch {
    return null;
  }
}
```

This regex looks for a `<script>` tag with the attribute `data-dividend-chart-json`. If that attribute does not exist on `dividendhistory.net`, the function returns `null` for every ticker — which explains why VFL, ACP, IFN, and FAX may be returning empty results despite the URL change.

### Expected Data Shape

If the data is found, it should match (or approximate) the `DividendHistoryRow` interface:

```typescript
interface DividendHistoryRow {
  ex_div: string;
  payday: string;
  payout: number;
  type: string;
  currency: string;
  pctChange: number | string;
}
```

Any deviation from these field names must be documented and will drive changes in Story 53.2.

### Browser Headers Applied in Epic 50

The current `fetch` call includes these headers (confirmed in `dividend-history.service.ts`):

```typescript
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
    'image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://dividendhistory.net/',
} as const;
```

The Playwright browser will use its own headers automatically — confirm the site does not block Playwright's Chromium user-agent, or note if special headers are needed.

### Investigation Protocol

Use the Playwright MCP server tools in this sequence for each of the four URLs:

1. **Navigate** using `open_browser_page` or `mcp_microsoft_pla_browser_navigate` to the URL
2. **Check network response** — use `mcp_microsoft_pla_browser_network_requests` to confirm HTTP 200
3. **Capture page source** — use `mcp_microsoft_pla_browser_evaluate` with:
   ```js
   () => document.documentElement.outerHTML
   ```
   or use `mcp_microsoft_pla_browser_run_code` with:
   ```js
   async (page) => {
     const content = await page.content();
     // Search for script tags with data attributes
     const match = content.match(/<script[^>]+data-[^>]*>/g);
     return { scriptTags: match, hasChartJson: content.includes('data-dividend-chart-json') };
   }
   ```
4. **Snapshot for quick overview** — use `mcp_microsoft_pla_browser_snapshot` to see the accessible structure
5. **Extract data sample** — if a pattern is found, extract a 2–3 row sample of the actual JSON

### Test URLs

| Symbol | URL |
|--------|-----|
| VFL    | `https://dividendhistory.net/payout/VFL/` |
| ACP    | `https://dividendhistory.net/payout/ACP/` |
| IFN    | `https://dividendhistory.net/payout/IFN/` |
| FAX    | `https://dividendhistory.net/payout/FAX/` |

### What to Document in Findings

The following must be recorded in the Dev Agent Record section after investigation:

1. **HTTP status** for each of the four URLs (expect 200)
2. **Does `data-dividend-chart-json` exist** on each page? (yes/no)
3. **If no:** what is the actual tag/attribute/pattern that contains the dividend data?
4. **Sample data structure** from at least one symbol — show the raw JSON or HTML excerpt
5. **Field name mapping** — do the field names match `DividendHistoryRow` or must they be remapped?
6. **Conclusion:** does `extractDividendJson` need to be changed, and if so, what is the new regex or selector?

### References

- **Service file:** `apps/server/src/app/routes/common/dividend-history.service.ts`
- **Story 50.1 (source of the URL change):** `_bmad-output/implementation-artifacts/50-1-switch-dividend-fetch-to-dividendhistory-net.md`
- **Epic description:** `.github/epic descriptions/epics-2026-04-06b.md`
- **Downstream story:** Story 53.2 (will implement fixes based on findings from this story)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Story File Created

Story file created at: `_bmad-output/implementation-artifacts/53-1-investigate-dividendhistory-net-html-structure.md`

### Investigation Findings

> **TO BE COMPLETED** — This section must be filled in by the agent implementing this story.
> Use the Playwright MCP server to navigate to each URL, inspect the HTML, and record findings here.

#### VFL (`https://dividendhistory.net/payout/VFL/`)

- HTTP status: _TBD_
- `data-dividend-chart-json` present: _TBD_
- Actual data pattern: _TBD_
- Sample data: _TBD_

#### ACP (`https://dividendhistory.net/payout/ACP/`)

- HTTP status: _TBD_
- `data-dividend-chart-json` present: _TBD_
- Actual data pattern: _TBD_
- Sample data: _TBD_

#### IFN (`https://dividendhistory.net/payout/IFN/`)

- HTTP status: _TBD_
- `data-dividend-chart-json` present: _TBD_
- Actual data pattern: _TBD_
- Sample data: _TBD_

#### FAX (`https://dividendhistory.net/payout/FAX/`)

- HTTP status: _TBD_
- `data-dividend-chart-json` present: _TBD_
- Actual data pattern: _TBD_
- Sample data: _TBD_

#### Summary Conclusion

> _TBD — to be completed after investigation_
>
> State clearly: (a) does `extractDividendJson` work as-is with dividendhistory.net, or (b) what exact change to the regex / parsing logic is required for Story 53.2?

### Completion Notes

_Add notes here when closing this story._
