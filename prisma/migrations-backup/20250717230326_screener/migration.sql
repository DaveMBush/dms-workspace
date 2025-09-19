-- CreateTable
CREATE TABLE "screener" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "holdings" INTEGER NOT NULL,
    "total_percent_top_holdings" INTEGER NOT NULL,
    "has_volitility" BOOLEAN NOT NULL,
    "objectives_understood" BOOLEAN NOT NULL,
    "consistent_distributions" BOOLEAN NOT NULL,
    "graph_higher_before_2008" BOOLEAN NOT NULL,
    "inception_date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);
