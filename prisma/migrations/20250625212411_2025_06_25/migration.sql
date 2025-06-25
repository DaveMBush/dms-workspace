/*
  Warnings:

  - You are about to drop the `_accountsTostatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `statusId` on the `trades` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "_accountsTostatus_B_index";

-- DropIndex
DROP INDEX "_accountsTostatus_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_accountsTostatus";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "status";
PRAGMA foreign_keys=on;

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
