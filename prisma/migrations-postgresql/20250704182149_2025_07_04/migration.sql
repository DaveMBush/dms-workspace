-- CreateTable
CREATE TABLE "divDepositType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "divDeposits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "divDepositTypeId" TEXT NOT NULL,
    "universeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "divDeposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "divDeposits_divDepositTypeId_fkey" FOREIGN KEY ("divDepositTypeId") REFERENCES "divDepositType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "divDeposits_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
