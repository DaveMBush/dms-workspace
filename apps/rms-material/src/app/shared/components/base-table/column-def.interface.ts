export interface ColumnDef {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  editable?: boolean;
  type?: 'boolean' | 'currency' | 'custom' | 'date' | 'number' | 'text';
}
