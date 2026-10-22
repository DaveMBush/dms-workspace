---
title: DMS — Dividend Management System
status: final
created: 2026-08-20
updated: 2026-08-21
---

# DMS — Dividend Management System

## 0. Purpose

DMS is Dave's personal system for tracking his investment in High-Yield Closed-End Funds (CEFs). It answers two questions the market's "total return" number does not: **how much money I have actually put in** (cost basis), and **what income that money is actually paying me** (dividends as they land, and the gains/losses from positions I close). It is a single-operator, self-hosted tool — a record of intent and a ledger of cash flow, not a broker terminal and not a buy/sell recommendation engine.

## 1. Vision

A durable, low-friction ledger where Dave can keep his CEF watchlist (the *universe*) and the positions he actually holds across his brokerage accounts, record every dividend deposit as it lands, close positions to capture gains/losses, and see at a glance how much he has invested and what it pays him monthly and yearly. The product succeeds when the numbers are trustworthy, the entry is fast, and the income-first view (yield, monthly cash flow, cost basis — not total return) is the default lens.

## 2. Target User

### 2.1 Jobs to be done

Dave, a single individual investor, is managing a personal CEF income portfolio and needs to:

- Screen candidate CEFs using cefconnect.com fundamentals and pull promising ones into his universe — the primary way symbols enter the watchlist.
- Keep one authoritative watchlist of CEFs he is considering or holding (the *universe*), each tagged with a risk group, and manually add a symbol that is not in the screener.
- Record the positions he owns per brokerage account — what he bought, at what price, and when — and mark them sold.
- Capture every dividend deposit as it arrives, including bulk import from his Fidelity account exports.
- See, per account and in aggregate, how much he has invested (cost basis), what dividends it pays (monthly and yearly), and the gains/losses from positions he has closed.

### 2.2 Non-Users

DMS is not for: multiple concurrent users or teams; other people's portfolios; buy/sell advice or alerts; real-time trading; tax filing; or any audience beyond Dave's own decision-making.

### 2.3 Key User Journeys (downscaled, single operator)

**UJ-1 — Onboarding a new position.** Dave runs the cefconnect.com screener and syncs the qualifying CEFs into his universe — the primary way symbols enter the watchlist — then, for the one he's acting on, records a buy trade under one of his accounts (quantity, price, date). *Outcome:* the position appears in that account's Open list and the portfolio totals update. *(Fallback: if the symbol he wants to track is not in the screener, he adds it to the universe manually before recording the trade.)*

**UJ-2 — Recording income.** A distribution lands in his account. Dave records a dividend deposit (date, amount, type) for that account and CEF — or imports a batch from a Fidelity CSV export. *Outcome:* the deposit appears under that account and the monthly/yearly income views update.

**UJ-3 — Evaluating candidates.** Dave runs the cefconnect.com screener, which surfaces the CEFs that qualify on the signals he tracks — current market price, yield, and how consistent the yield is — then syncs all of them into his universe in one step. *Outcome:* the qualifying set is in his watchlist with fundamentals, ready to buy against.

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **CEF** | Closed-End Fund — the asset class DMS tracks. |
| **Universe** | Dave's watchlist of CEFs (symbols he is considering or holding), each carrying distribution, distributions/year, last price, ex-date, and a risk group. |
| **Risk group** | Dave's classification of a CEF by income character — e.g. Equities, Income, Tax-Free Income. |
| **Account** | A brokerage account (e.g. a joint brokerage, an IRA) that holds positions and receives deposits. |
| **Trade / Position** | A buy (or buy-then-sell) of a quantity of a CEF in an account, at a per-share price and date. |
| **Open position** | A trade not yet closed (no completed sell). |
| **Sold position** | A completed buy→sell, with the gain/loss amount shown. |
| **Dividend deposit** | A cash income event in an account — a dividend or cash deposit — tied to a date, amount, and optionally a CEF. |
| **Deposit type** | The classification of a deposit: Dividend / Deposit. Capital gains are *not* a deposit type — they are computed from closed positions. |
| **Screener** | CEF candidate data cached from cefconnect.com — distribution, distributions/year, last price, and a risk group. Dave evaluates on current market price, yield (computed from distribution and price), and how consistent the yield is. Kept separate from the universe until the qualifying set is bulk-synced in. |
| **Cost basis** | The amount of money actually invested in a position — DMS's primary lens, as opposed to total return. |
| **Fidelity CSV** | Dave's brokerage (Fidelity) account export, imported to populate deposits and positions in bulk. |
| **CUSIP** | The security identifier used to resolve/validate symbols; DMS keeps a cache of CUSIP→symbol mappings with source + audit. |

## 4. Features

### 4.1 Accounts & Positions

- **FR-1 — Manage brokerage accounts.** Create, list, and reference the brokerage accounts that hold positions. *Consequence:* a user can create an account and see it in the account list; positions and deposits can be attributed to it; removing it soft-deletes it (recoverable, not hard-removed).
- **FR-2 — Record open positions.** Capture a buy of a CEF in an account: quantity, per-share price, and date. *Consequence:* the position appears under that account's Open list; sorting by distribution-yield, symbol, or buy-date is available; the cost-basis total reflects the purchase.
- **FR-3 — Record sold positions.** Close a position by recording the sell (price, date). *Consequence:* the position moves to Sold and the gain/loss amount is shown.
- **FR-4 — Inline editing.** Edit price/date of an open position and add a new position from the table without leaving the view. *Consequence:* changes persist and the account/portfolio totals update without a full page reload.

### 4.2 Income (dividend deposits)

- **FR-5 — Record income deposits.** Capture a dividend or cash deposit in an account: date, amount, and deposit type (Dividend / Deposit), optionally tied to a specific CEF. *Consequence:* the deposit appears under that account's dividend-deposit list and flows into the monthly/yearly income views.
- **FR-6 — Fidelity CSV import.** Import a Fidelity account export to bulk-create deposits (and positions) in an account. *Consequence:* a valid Fidelity CSV produces the expected deposit/position records; a malformed file is rejected with an actionable message rather than partially written. *Mapping (from `fidelity-data-mapper.function.ts`):* `DIVIDEND RECEIVED` → `divDeposits` (type `Dividend`, amount = total amount, CEF set); `ELECTRONIC FUNDS TRANSFER` / `MONEY LINE RECEIVED` → `divDeposits` (type `Deposit`, no CEF); `BUY` → `trades` (buy price, quantity, buy date, sell = 0); `SELL` → `trades` (sell price, quantity, sell date); split rows handled separately; money-market trade actions are skipped (implied cash sweep); unrecognized actions are collected as unknown, not silently dropped; dates are converted MM/DD/YYYY → ISO. Accounts and universe symbols are resolved by name/symbol and created if missing (BUY auto-creates the symbol).
- **FR-7 — Inline editing of deposits.** Edit an existing deposit (amount, date, type) in place. *Consequence:* the change persists and downstream income views recompute.

### 4.3 Universe (watchlist)

- **FR-8 — Manage the CEF universe.** Add, inline-edit, and remove CEFs from the watchlist, each tagged with a risk group. *Consequence:* a new symbol with a risk group appears in the universe; editing distribution, distributions/year, last price, or ex-date persists; removal soft-deletes it.
- **FR-9 — Symbol autocomplete & search.** Search candidate symbols (with a CUSIP-backed resolution) while adding a universe entry. *Consequence:* typing a symbol suggests valid matches; an unknown symbol is flagged rather than silently accepted.
- **FR-10 — Sync from screener.** Sync all qualifying screener CEFs into the universe in one step. *Consequence:* the qualifying set appears in the universe, each carrying its screener fundamentals (distribution, distributions/year, last price, ex-date, risk group); non-qualifying ones are marked expired, and manually-added symbols are preserved.
- **FR-11 — Risk groups.** Maintain the set of risk-group categories and assign a CEF to one. *Consequence:* each universe CEF has exactly one risk group; the risk-group filter/grouping is available across universe views.

### 4.4 Screener

- **FR-12 — Browse cefconnect.com CEF data.** View candidate CEFs with their cached fundamentals (distribution, distributions/year, last price, risk group) sourced from cefconnect.com; the list is filterable by risk group. *Consequence:* the screener renders with these fields, and Dave can judge each on the signals he tracks — current market price, yield (computed from distribution and price), and how consistent the yield is; data is a cache (not a live market feed) and is refreshable.
- **FR-13 — Refresh screener data.** Re-pull cefconnect.com data to update the cache. *Consequence:* a refresh updates the cached fundamentals; the prior cache is replaced, not deleted.

### 4.5 Portfolio Summary

- **FR-14 — Per-account summary.** Show, for one account, totals and yield, plus gains/losses. *Consequence:* the account summary card reflects that account's positions and deposits and stays in sync with edits.
- **FR-15 — Global summary & income charts.** Show portfolio-wide distribution and a monthly income breakdown (deposits, dividends, and capital gains per month). *Consequence:* the global summary and charts aggregate across accounts; income tracks deposit changes and the capital-gains figure tracks position (sell) changes.

### 4.6 Data Integrity & Administration (cross-cutting)

- **FR-16 — CUSIP cache management.** Maintain a CUSIP→symbol cache with source attribution, an archive, and an audit trail; allow manual inspection/refresh. *Consequence:* a CUSIP resolves to a symbol with a recorded source; changes are auditable; the admin view lists entries and allows manual refresh.
- **FR-17 — Error-log review.** View server error logs and remove them. *Consequence:* the admin view lists logs, allows viewing detail, and allows deletion.
- **FR-18 — Soft-delete & optimistic concurrency.** Deleting an entity marks it inactive rather than removing it; concurrent edits are rejected safely. *Consequence:* a soft-deleted record is hidden from normal queries but recoverable; a stale edit (version mismatch) is rejected with a conflict rather than silently overwriting.
- **FR-19 — Authentication & session.** Dave signs in; his session is validated and can expire with a warning. *Consequence:* only an authenticated Dave reaches the app; an expiring session prompts to extend or log out rather than dropping mid-entry.

## 5. Non-Goals

Explicitly out of scope (present in the tool's culture but not features of this product):

- **Multi-tenancy / shared use.** No concurrent users, roles, or collaboration — one operator (Dave).
- **Buy/sell recommendations, alerts, or timing signals.** DMS records; it does not advise.
- **Real-time market data or live trading.** No order placement, no streaming prices; the screener is a cache.
- **Tax computation / filing.** Distributions are *recorded* as income, not computed into a tax figure.
- **Other asset classes.** CEFs only (the universe may flag open-end in edge cases, but the product is CEF-centric).
- **Multi-currency or non-USD accounting.**

## 6. MVP Scope

For a personal single-operator tool, "MVP" = the working capability that must survive a rebuild and cover Dave's daily loop.

**In scope (MVP):** FR-1–FR-7 (accounts, positions, deposits, Fidelity import, inline editing), FR-8–FR-11 (universe + risk groups + screener sync), FR-12–FR-15 (screener + per-account & global summary), FR-16–FR-19 (CUSIP cache, error logs, soft-delete/concurrency, auth). This is the full current feature set — the rebuild must be feature-parity.

**Deferred / not now:** nothing from the current capability is deferred. Any *new* ambition beyond the current app (alerts, tax, multi-currency, multi-user) is a future consideration, not part of this PRD.

## 7. Success Metrics

Measured by Dave's actual use (self-hosted, no analytics funnel).

**Primary:**
- **Ledger trust:** no "numbers don't match my Fidelity statement" incidents after import + manual entry (target: 0 unexplained discrepancies over a quarter).
- **Entry friction:** recording a deposit or position takes ≤ ~5 taps/keystrokes and no page reload (inline editing works in place).
- **Income accuracy:** monthly/yearly dividend income reconciles with Fidelity exports; capital gains/losses (computed from closed positions, not recorded as deposits) match Dave's records.

**Counter-metrics (guardrails):**
- **Data integrity:** zero data loss from a malformed CSV (file rejected, not partial) and zero lost writes from concurrent edits (optimistic-concurrency conflicts surface, not overwrite).
- **Screener staleness:** cached cefconnect data is clearly dated and refreshable (no stale values presented as current).

## 8. Open Questions

Resolved:

- **OQ-1 — Fidelity CSV exact mapping — RESOLVED.** Derived from `fidelity-data-mapper.function.ts` and folded into FR-6: `DIVIDEND RECEIVED` → `divDeposits` (Dividend), `ELECTRONIC FUNDS TRANSFER`/`MONEY LINE RECEIVED` → `divDeposits` (Deposit), `BUY`/`SELL` → `trades`, splits handled, money-market trades skipped, unknowns collected, dates MM/DD/YYYY→ISO. No longer open.
- **OQ-2 — `data-models.md` vs. `schema.prisma` drift — RESOLVED.** `prisma/schema.prisma` is the source of truth (confirmed by Dave); `data-models.md` is treated as stale where they disagree.
- **OQ-3 — Screener `symbol` uniqueness — RESOLVED.** One row per symbol (confirmed by Dave). If a new import matches the symbol of a soft-deleted row, the existing row is undeleted rather than creating a duplicate.

No open questions remain.
