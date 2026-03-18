# Data Models

## Prisma Schema (SQLite / PostgreSQL)

Two schema files exist:

- `prisma/schema.prisma` — SQLite (local dev + e2e)
- `prisma/schema.postgresql.prisma` — PostgreSQL (Docker + production)

Schemas are kept in sync. The only differences are provider declaration and a few type mappings.

---

## Entity Relationship Diagram

```
top (1)
 ├─── accounts (N)
 │     ├─── trades (N) ─────────── universe (many-to-one via universeId)
 │     └─── divDeposits (N) ────── divDepositType (many-to-one)
 ├─── universe (N) ─────────────── risk_group (many-to-one via risk_group_id)
 ├─── risk_group (N)
 └─── divDepositTypes (N)

cusip_cache ─ standalone
cusip_cache_archive ─ standalone
cusip_cache_audit ─ standalone
screener ─ standalone
holidays ─ standalone
```

---

## Database Models

### `accounts`

Represents an investment brokerage account (e.g., Fidelity IRA, Taxable).

```prisma
model accounts {
  id         String    @id @default(cuid())
  name       String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?             // Soft delete
  version    Int       @default(0) // Optimistic lock

  trades     trades[]
  divDeposits divDeposits[]
}
```

**Frontend interface**: `Account`

```typescript
interface Account {
  id: string;
  name: string;
  openTrades: string[] | SmartArray<Account, Trade>;
  soldTrades: string[] | SmartArray<Account, Trade>;
  divDeposits: string[] | SmartArray<Account, DivDeposit>;
  months: { month: number; year: number }[];
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

---

### `universe`

Represents one CEF (Closed-End Fund) symbol in the personal watchlist.

```prisma
model universe {
  id                      String    @id @default(cuid())
  symbol                  String    @unique
  distribution            Float     // Distribution per payment ($)
  distributions_per_year  Int       // e.g. 12 (monthly), 4 (quarterly)
  last_price              Float
  most_recent_sell_date   DateTime?
  most_recent_sell_price  Float?
  ex_date                 DateTime? // Next ex-dividend date
  risk_group_id           String
  expired                 Boolean   @default(false) // Inactive flag (not soft-delete)
  is_closed_end_fund      Boolean   @default(true)
  name                    String?
  avg_purchase_yield_percent Float?
  position                Float?    // Total shares held across all accounts
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?
  version                 Int       @default(0)

  risk_group  risk_group @relation(fields: [risk_group_id], references: [id])
  trades      trades[]

  @@index([symbol])
  @@index([risk_group_id])
  @@index([expired])
}
```

**Frontend interface**: `Universe`

```typescript
interface Universe {
  id: string;
  symbol: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  most_recent_sell_date?: string;
  most_recent_sell_price?: number;
  ex_date?: string;
  risk_group_id: string;
  expired: boolean;
  is_closed_end_fund: boolean;
  name?: string;
  avg_purchase_yield_percent?: number;
  position?: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

---

### `risk_group`

Categorizes universe entries by investment risk profile.

```prisma
model risk_group {
  id        String    @id @default(cuid())
  name      String    @unique   // "Equities", "Income", "Tax Free Income"
  color     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  version   Int       @default(0)

  universe  universe[]
}
```

---

### `trades`

A trade represents buying or selling shares of a universe symbol in an account.

```prisma
model trades {
  id          String    @id @default(cuid())
  universeId  String
  accountId   String
  buy         Float     // Buy price per share
  sell        Float?    // Sell price (null = still open)
  buy_date    DateTime
  sell_date   DateTime?
  quantity    Float
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  version     Int       @default(0)

  universe  universe  @relation(fields: [universeId], references: [id])
  account   accounts  @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([universeId])
  @@index([sell_date])
}
```

**Frontend interface**: `Trade`

```typescript
interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell?: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

A trade is "open" when `sell === null && sell_date === null`.

---

### `holidays`

US market holidays (used for ex-date calculations).

```prisma
model holidays {
  id        String   @id @default(cuid())
  date      DateTime @unique
  name      String?
}
```

---

### `divDepositType`

Enumeration of dividend deposit types.

```prisma
model divDepositType {
  id          String       @id @default(cuid())
  name        String       @unique    // e.g. "Dividend", "Capital Gain", "Return of Capital"
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  version     Int          @default(0)

  divDeposits divDeposits[]
}
```

---

### `divDeposits`

Records of individual dividend/income deposits received in an account.

```prisma
model divDeposits {
  id              String    @id @default(cuid())
  accountId       String
  universeId      String?
  amount          Float
  date            DateTime
  typeId          String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  version         Int       @default(0)

  account   accounts      @relation(fields: [accountId], references: [id])
  type      divDepositType @relation(fields: [typeId], references: [id])

  @@index([accountId])
  @@index([date])
}
```

---

### `screener`

Cached CEF screener data from cefconnect.com.

```prisma
model screener {
  id                      String    @id @default(cuid())
  symbol                  String    @unique
  distribution            Float?
  distribution_rate       Float?
  distributions_per_year  Int?
  has_volitility          Boolean   @default(false)
  objectives_understood   Boolean   @default(false)
  graph_higher_before_2008 Boolean  @default(false)
  premium_discount        Float?
  ytd_return              Float?
  category                String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@index([symbol])
}
```

---

### `cusip_cache`

Maps CUSIP codes to ticker symbols, resolved via OpenFIGI or Yahoo Finance.

```prisma
model cusip_cache {
  cusip       String   @id              // 9-character CUSIP
  symbol      String
  source      String                    // "OPENFIGI" | "YAHOO_FINANCE"
  resolvedAt  DateTime @default(now())
  lastUsedAt  DateTime @default(now())

  @@index([symbol])
  @@index([lastUsedAt])
}
```

### `cusip_cache_archive`

Historical CUSIP resolutions (moved from active cache on cleanup).

```prisma
model cusip_cache_archive {
  id          String   @id @default(cuid())
  cusip       String
  symbol      String
  source      String
  resolvedAt  DateTime
  archivedAt  DateTime @default(now())

  @@index([cusip])
}
```

### `cusip_cache_audit`

Audit trail for CUSIP cache operations.

```prisma
model cusip_cache_audit {
  id         String   @id @default(cuid())
  cusip      String
  operation  String   // "RESOLVE", "UPDATE", "ARCHIVE", "DELETE"
  oldSymbol  String?
  newSymbol  String?
  source     String?
  performedAt DateTime @default(now())
  performedBy String?

  @@index([cusip])
  @@index([performedAt])
}
```

---

## Data Patterns

### Soft Delete

Entities with a `deletedAt` field are never permanently deleted. Instead:

```typescript
// Soft delete:
await prisma.accounts.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Query (always exclude soft-deleted):
await prisma.accounts.findMany({
  where: { deletedAt: null },
});
```

Affected models: `accounts`, `universe`, `trades`, `divDeposits`
Not soft-deleted: `screener`, `holidays`, `cusip_cache` (replaced, not deleted)

### Optimistic Locking

All mutable entities have a `version: Int` field:

```typescript
// Update with version check:
await prisma.universe.update({
  where: { id, version: incoming.version }, // must match
  data: { ...incoming, version: { increment: 1 } },
});
// If no row matches (version mismatch) → 0 rows affected → throw 409 Conflict
```

### UUID Primary Keys

All PKs use Prisma's `@default(cuid())` — lowercase-safe collision-resistant IDs. No sequential integers.

### Indexes

All foreign keys are indexed. Additional indexes on:

- `universe.symbol` (unique + lookup)
- `universe.expired` (filter query)
- `trades.sell_date` (open/closed split)
- `trades.accountId`, `trades.universeId`
- `divDeposits.date` (time-range queries)

---

## Top Bootstrap Entity (Virtual)

The `top` entity is not a Prisma model — it's a virtual entity assembled server-side by `POST /api/top`. It aggregates IDs of all top-level collections into one response to minimize round-trips during app initialization.

```typescript
interface Top {
  id: string; // Always "top-1" (singleton)
  accounts: string[];
  universes: string[];
  riskGroups: string[];
  divDepositTypes: string[];
  holidays: Date[];
  screens: Screen[]; // Screener rows (small collection — included inline)
}
```
