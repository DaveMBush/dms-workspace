/*
  Warnings:

  - You are about to drop the column `risk` on the `universe` table. All the data in the column will be lost.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "universe_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_universe" ("createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "most_recent_sell_price", "risk_group_id", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "most_recent_sell_price", "risk_group_id", "symbol", "updatedAt", "version" FROM "universe";
DROP TABLE "universe";
ALTER TABLE "new_universe" RENAME TO "universe";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
