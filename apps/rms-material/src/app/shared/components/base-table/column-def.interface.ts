export interface ColumnDef {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  editable?: boolean;
  type?: 'currency' | 'custom' | 'date' | 'number' | 'text';
}
