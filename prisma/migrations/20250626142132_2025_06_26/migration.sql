/*
  Warnings:

  - Added the required column `quantity` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "buy" REAL NOT NULL,
    "sell" REAL NOT NULL,
    "buy_date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sell_date" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "trades_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_trades" ("accountId", "buy", "buy_date", "createdAt", "deletedAt", "id", "sell", "sell_date", "universeId", "updatedAt") SELECT "accountId", "buy", "buy_date", "createdAt", "deletedAt", "id", "sell", "sell_date", "universeId", "updatedAt" FROM "trades";
DROP TABLE "trades";
ALTER TABLE "new_trades" RENAME TO "trades";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
