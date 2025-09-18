/*
  Warnings:

  - You are about to drop the column `consistent_distributions` on the `screener` table. All the data in the column will be lost.
  - You are about to drop the column `holdings` on the `screener` table. All the data in the column will be lost.
  - You are about to drop the column `inception_date` on the `screener` table. All the data in the column will be lost.
  - You are about to drop the column `total_percent_top_holdings` on the `screener` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_screener" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "has_volitility" BOOLEAN NOT NULL,
    "objectives_understood" BOOLEAN NOT NULL,
    "graph_higher_before_2008" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_screener" ("createdAt", "deletedAt", "graph_higher_before_2008", "has_volitility", "id", "objectives_understood", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "graph_higher_before_2008", "has_volitility", "id", "objectives_understood", "symbol", "updatedAt", "version" FROM "screener";
DROP TABLE "screener";
ALTER TABLE "new_screener" RENAME TO "screener";
CREATE UNIQUE INDEX "screener_symbol_key" ON "screener"("symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
