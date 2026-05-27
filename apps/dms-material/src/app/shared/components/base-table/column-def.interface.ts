export interface ColumnDef {
  field: string;
  header: string;
  tooltip?: string;
  width?: number;
  sortable?: boolean;
  editable?: boolean;
  type?:
    | 'actions'
    | 'boolean'
    | 'currency'
    | 'custom'
    | 'date'
    | 'number'
    | 'text';
}
