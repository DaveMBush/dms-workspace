/*
  Warnings:

  - You are about to drop the column `risk_group` on the `universe` table. All the data in the column will be lost.
  - Added the required column `risk_group_id` to the `universe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "risk_group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_universe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distribution" REAL NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" REAL NOT NULL,
    "most_recent_sell_date" DATETIME,
    "symbol" TEXT NOT NULL,
    "ex_date" DATETIME NOT NULL,
    "risk" INTEGER NOT NULL,
    "risk_group_id" TEXT NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "universe_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_universe" ("createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "risk", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "distribution", "distributions_per_year", "ex_date", "expired", "id", "last_price", "most_recent_sell_date", "risk", "symbol", "updatedAt", "version" FROM "universe";
DROP TABLE "universe";
ALTER TABLE "new_universe" RENAME TO "universe";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
