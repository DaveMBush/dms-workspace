-- Story E3: Schema integrity and performance
-- Add unique constraints and indexes for improved data integrity and query performance

-- CreateIndex: Add unique constraint on universe.symbol
CREATE UNIQUE INDEX "universe_symbol_key" ON "universe"("symbol");

-- CreateIndex: Add unique constraint on risk_group.name  
CREATE UNIQUE INDEX "risk_group_name_key" ON "risk_group"("name");

-- CreateIndex: Add performance indexes on universe table
CREATE INDEX "universe_expired_idx" ON "universe"("expired");
CREATE INDEX "universe_risk_group_id_idx" ON "universe"("risk_group_id");

-- CreateIndex: Add composite index on screener for filtering operations
CREATE INDEX "screener_has_volitility_objectives_understood_graph_higher_before_2008_idx" ON "screener"("has_volitility", "objectives_understood", "graph_higher_before_2008");

-- CreateIndex: Add index on screener.risk_group_id for join performance
CREATE INDEX "screener_risk_group_id_idx" ON "screener"("risk_group_id");