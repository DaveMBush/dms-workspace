/*
  Warnings:

  - Added the required column `distribution` to the `screener` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distributions_per_year` to the `screener` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_price` to the `screener` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_screener" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "distribution" REAL NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" REAL NOT NULL,
    "ex_date" DATETIME,
    "risk_group_id" TEXT NOT NULL,
    "has_volitility" BOOLEAN NOT NULL,
    "objectives_understood" BOOLEAN NOT NULL,
    "graph_higher_before_2008" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "screener_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_screener" ("createdAt", "deletedAt", "graph_higher_before_2008", "has_volitility", "id", "objectives_understood", "risk_group_id", "symbol", "updatedAt", "version") SELECT "createdAt", "deletedAt", "graph_higher_before_2008", "has_volitility", "id", "objectives_understood", "risk_group_id", "symbol", "updatedAt", "version" FROM "screener";
DROP TABLE "screener";
ALTER TABLE "new_screener" RENAME TO "screener";
CREATE UNIQUE INDEX "screener_symbol_key" ON "screener"("symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
