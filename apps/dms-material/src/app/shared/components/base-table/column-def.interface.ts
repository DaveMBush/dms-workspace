export interface ColumnDef {
  field: string;
  header: string;
  width?: string;
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
