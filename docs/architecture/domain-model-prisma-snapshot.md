# Domain model (Prisma snapshot)

- `risk_group` (id, name)
- `screener` (id, symbol unique, risk_group_id, booleans, distribution fields)
- `universe` (id, symbol, risk_group_id, distribution fields, expired flag)
- `trades` (tied to `universe` and `accounts`)

See `prisma/schema.prisma` for the full schema.
