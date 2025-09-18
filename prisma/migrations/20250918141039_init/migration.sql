-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universe" (
    "id" TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" DOUBLE PRECISION NOT NULL,
    "most_recent_sell_date" TIMESTAMP(3),
    "most_recent_sell_price" DOUBLE PRECISION,
    "symbol" TEXT NOT NULL,
    "ex_date" TIMESTAMP(3),
    "risk_group_id" TEXT NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "universe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "risk_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "buy" DOUBLE PRECISION NOT NULL,
    "sell" DOUBLE PRECISION NOT NULL,
    "buy_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sell_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divDepositType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "divDepositType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divDeposits" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountId" TEXT NOT NULL,
    "divDepositTypeId" TEXT NOT NULL,
    "universeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "divDeposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screener" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    "distributions_per_year" INTEGER NOT NULL,
    "last_price" DOUBLE PRECISION NOT NULL,
    "ex_date" TIMESTAMP(3),
    "risk_group_id" TEXT NOT NULL,
    "has_volitility" BOOLEAN NOT NULL,
    "objectives_understood" BOOLEAN NOT NULL,
    "graph_higher_before_2008" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "screener_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "accounts"("name");

-- CreateIndex
CREATE INDEX "accounts_name_idx" ON "accounts"("name");

-- CreateIndex
CREATE INDEX "accounts_createdAt_idx" ON "accounts"("createdAt");

-- CreateIndex
CREATE INDEX "accounts_deletedAt_idx" ON "accounts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "universe_symbol_key" ON "universe"("symbol");

-- CreateIndex
CREATE INDEX "universe_expired_idx" ON "universe"("expired");

-- CreateIndex
CREATE INDEX "universe_risk_group_id_idx" ON "universe"("risk_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_group_name_key" ON "risk_group"("name");

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

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "divDeposits_accountId_idx" ON "divDeposits"("accountId");

-- CreateIndex
CREATE INDEX "divDeposits_date_idx" ON "divDeposits"("date");

-- CreateIndex
CREATE INDEX "divDeposits_accountId_date_idx" ON "divDeposits"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "screener_symbol_key" ON "screener"("symbol");

-- CreateIndex
CREATE INDEX "screener_has_volitility_objectives_understood_graph_higher__idx" ON "screener"("has_volitility", "objectives_understood", "graph_higher_before_2008");

-- CreateIndex
CREATE INDEX "screener_risk_group_id_idx" ON "screener"("risk_group_id");

-- AddForeignKey
ALTER TABLE "universe" ADD CONSTRAINT "universe_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divDeposits" ADD CONSTRAINT "divDeposits_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divDeposits" ADD CONSTRAINT "divDeposits_divDepositTypeId_fkey" FOREIGN KEY ("divDepositTypeId") REFERENCES "divDepositType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divDeposits" ADD CONSTRAINT "divDeposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screener" ADD CONSTRAINT "screener_risk_group_id_fkey" FOREIGN KEY ("risk_group_id") REFERENCES "risk_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
