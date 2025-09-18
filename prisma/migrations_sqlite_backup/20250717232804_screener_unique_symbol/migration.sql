/*
  Warnings:

  - A unique constraint covering the columns `[symbol]` on the table `screener` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "screener_symbol_key" ON "screener"("symbol");
