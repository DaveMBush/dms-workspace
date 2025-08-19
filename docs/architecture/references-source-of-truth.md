# References (source of truth)

- Prisma schema: `prisma/schema.prisma`
- Screener refresh: `routes/screener/index.ts`
- Screener rows: `routes/screener/rows/index.ts`
- Universe CRUD: `routes/universe/index.ts`
- Settings (manual universe): `routes/settings/index.ts`
- Settings/update (refresh): `routes/settings/update/index.ts`
- Frontend consumers:
  - `apps/rms/src/app/store/universe/universe-effect.service.ts`
  - `apps/rms/src/app/global/global-universe/universe-data.service.ts`
  - `apps/rms/src/app/universe-settings/*`
