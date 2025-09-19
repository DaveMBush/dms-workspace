/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `holidays` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");
