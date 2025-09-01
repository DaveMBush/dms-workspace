# Monitoring and logs

- Check for errors related to:

  - Yahoo requests (network, rate limits).
  - Prisma upserts and transactions.
  - Unusual counts of `expired=true` in `universe`.

- Suggested alerts
  - High failure rate for sync action.
  - Large delta in expired symbols compared to previous successful run.
