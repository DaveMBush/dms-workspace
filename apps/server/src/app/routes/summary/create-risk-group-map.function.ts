interface RiskGroupResult {
  riskGroupId: string;
  riskGroupName: string;
  totalCostBasis: number;
  tradeCount: number;
}

export function createRiskGroupMap(
  result: RiskGroupResult[]
): Map<string, number> {
  const riskGroupMap = new Map<string, number>();
  result.forEach(function mapRiskGroup(r: RiskGroupResult): void {
    riskGroupMap.set(r.riskGroupName, r.totalCostBasis);
  });
  return riskGroupMap;
}
