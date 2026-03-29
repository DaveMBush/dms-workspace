/*
  Warnings:

  - You are about to drop the column `graph_higher_before_2008` on the `screener` table. All the data in the column will be lost.
  - You are about to drop the column `has_volitility` on the `screener` table. All the data in the column will be lost.
  - You are about to drop the column `objectives_understood` on the `screener` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "cusip_cache_archive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cusip" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resolvedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT
);

-- CreateTable
CREATE TABLE "cusip_cache_audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cusip" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "userId" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cusip_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cusip" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resolvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_cusip_cache" ("createdAt", "cusip", "id", "resolvedAt", "source", "symbol", "updatedAt") SELECT "createdAt", "cusip", "id", "resolvedAt", "source", "symbol", "updatedAt" FROM "cusip_cache";
DROP TABLE "cusip_cache";
ALTER TABLE "new_cusip_cache" RENAME TO "cusip_cache";
CREATE UNIQUE INDEX "cusip_cache_cusip_key" ON "cusip_cache"("cusip");
CREATE INDEX "cusip_cache_cusip_idx" ON "cusip_cache"("cusip");
CREATE INDEX "cusip_cache_resolvedAt_idx" ON "cusip_cache"("resolvedAt");
CREATE INDEX "cusip_cache_lastUsedAt_idx" ON "cusip_cache"("lastUsedAt");
CREATE TABLE "new_screener" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "distribution" REAL NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" REAL NOT NULL,
    "ex_date" DATETIME,
    "risk_group_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "screener_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_screener" ("createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "id", "last_price", "risk_group_id", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "id", "last_price", "risk_group_id", "symbol", "updatedAt", "version" FROM "screener";
DROP TABLE "screener";
ALTER TABLE "new_screener" RENAME TO "screener";
CREATE UNIQUE INDEX "screener_symbol_key" ON "screener"("symbol");
CREATE INDEX "screener_risk_group_id_idx" ON "screener"("risk_group_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "cusip_cache_archive_archivedAt_idx" ON "cusip_cache_archive"("archivedAt");

-- CreateIndex
CREATE INDEX "cusip_cache_audit_createdAt_idx" ON "cusip_cache_audit"("createdAt");

-- CreateIndex
CREATE INDEX "cusip_cache_audit_cusip_idx" ON "cusip_cache_audit"("cusip");
