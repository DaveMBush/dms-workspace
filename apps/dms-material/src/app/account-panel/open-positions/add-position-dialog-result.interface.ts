export interface AddPositionDialogResult {
  symbol?: string;
  universeId?: string;
  quantity?: number;
  price?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- backend field name
  purchase_date?: string;
}
