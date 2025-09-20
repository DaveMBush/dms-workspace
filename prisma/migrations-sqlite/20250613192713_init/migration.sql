-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "status" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "universe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distribution" REAL NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" REAL NOT NULL,
    "most_recent_sell_date" DATETIME,
    "symbol" TEXT NOT NULL,
    "ex_date" DATETIME NOT NULL,
    "risk" INTEGER NOT NULL,
    "risk_group" INTEGER NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universeId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "buy" REAL NOT NULL,
    "sell" REAL NOT NULL,
    "buy_date" DATETIME NOT NULL,
    "sell_date" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "trades_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "_accountsTostatus" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_accountsTostatus_A_fkey" FOREIGN KEY ("A") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_accountsTostatus_B_fkey" FOREIGN KEY ("B") REFERENCES "status" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_accountsTostatus_AB_unique" ON "_accountsTostatus"("A", "B");

-- CreateIndex
CREATE INDEX "_accountsTostatus_B_index" ON "_accountsTostatus"("B");
