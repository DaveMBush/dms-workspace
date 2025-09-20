# Domain model (Prisma snapshot)

## Core Tables

- `risk_group` (id, name) - Investment categorization
- `screener` (id, symbol unique, risk_group_id, booleans, distribution fields) - CEF screening data
- `universe` (id, symbol, risk_group_id, distribution fields, expired flag) - Tradable universe
- `accounts` - Portfolio accounts
- `trades` (tied to `universe` and `accounts`) - Transaction history

## Multi-Database Architecture

### Development Environment

- **Provider**: SQLite with `better-sqlite3` driver
- **Schema**: `prisma/schema.prisma`
- **URL**: `file:./database.db`

### Docker/Production Environment

- **Provider**: PostgreSQL
- **Schema**: `prisma/schema.postgresql.prisma`
- **URL**: Environment-specific connection string

### Key Relationships

- `screener.risk_group_id` → `risk_group.id`
- `universe.risk_group_id` → `risk_group.id`
- `trades.universe_id` → `universe.id`
- `trades.account_id` → `accounts.id`

### Planned Schema Changes

- Add unique constraint on `universe.symbol`
- Add indexes for performance optimization
- Rename `screener.has_volitility` → `has_volatility` (typo fix)
