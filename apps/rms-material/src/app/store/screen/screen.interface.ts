/* eslint-disable @typescript-eslint/naming-convention -- matching server */
export interface Screen {
  id: string;
  symbol: string;
  risk_group: string;
  has_volitility: boolean;
  objectives_understood: boolean;
  graph_higher_before_2008: boolean;
}
