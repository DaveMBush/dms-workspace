-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_universe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distribution" REAL NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" REAL NOT NULL,
    "most_recent_sell_date" DATETIME,
    "most_recent_sell_price" REAL,
    "symbol" TEXT NOT NULL,
    "ex_date" DATETIME,
    "risk_group_id" TEXT NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "is_closed_end_fund" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "universe_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_universe" ("createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "most_recent_sell_price", "risk_group_id", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "most_recent_sell_price", "risk_group_id", "symbol", "updatedAt", "version" FROM "universe";
DROP TABLE "universe";
ALTER TABLE "new_universe" RENAME TO "universe";
CREATE UNIQUE INDEX "universe_symbol_key" ON "universe"("symbol");
CREATE INDEX "universe_expired_idx" ON "universe"("expired");
CREATE INDEX "universe_risk_group_id_idx" ON "universe"("risk_group_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "accounts_name_idx" ON "accounts"("name");

-- CreateIndex
CREATE INDEX "accounts_createdAt_idx" ON "accounts"("createdAt");

-- CreateIndex
CREATE INDEX "accounts_deletedAt_idx" ON "accounts"("deletedAt");

-- CreateIndex
CREATE INDEX "divDeposits_accountId_idx" ON "divDeposits"("accountId");

-- CreateIndex
CREATE INDEX "divDeposits_date_idx" ON "divDeposits"("date");

-- CreateIndex
CREATE INDEX "divDeposits_accountId_date_idx" ON "divDeposits"("accountId", "date");

-- CreateIndex
CREATE INDEX "trades_accountId_idx" ON "trades"("accountId");

-- CreateIndex
CREATE INDEX "trades_buy_date_idx" ON "trades"("buy_date");

-- CreateIndex
CREATE INDEX "trades_sell_date_idx" ON "trades"("sell_date");

-- CreateIndex
CREATE INDEX "trades_accountId_buy_date_idx" ON "trades"("accountId", "buy_date");

-- CreateIndex
CREATE INDEX "trades_accountId_sell_date_idx" ON "trades"("accountId", "sell_date");
