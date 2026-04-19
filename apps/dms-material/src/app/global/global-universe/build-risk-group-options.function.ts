import { RiskGroup } from '../../store/risk-group/risk-group.interface';

export function buildRiskGroupOptions(
  riskGroups: RiskGroup[]
): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < riskGroups.length; i++) {
    options.push({ label: riskGroups[i].name, value: riskGroups[i].id });
  }
  return options;
}
