-- CreateTable
CREATE TABLE "cusip_cache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cusip" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
-- CreateIndex
CREATE UNIQUE INDEX "cusip_cache_cusip_key" ON "cusip_cache"("cusip");
-- CreateIndex
CREATE INDEX "cusip_cache_cusip_idx" ON "cusip_cache"("cusip");
-- CreateIndex
CREATE INDEX "cusip_cache_resolvedAt_idx" ON "cusip_cache"("resolvedAt");
