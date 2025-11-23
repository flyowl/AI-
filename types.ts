
export type ColumnType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | 'rating' | 'image' | 'file' | 'person' | 'phone' | 'email' | 'location';

export interface SelectOption {
  id: string;
  label: string;
  color: string; // tailwind color class e.g. 'bg-red-100 text-red-700'
}

export interface Column {
  id: string;
  label: string;
  type: ColumnType;
  width?: number;
  options?: SelectOption[]; // For 'select' type
}

export interface RowData {
  id: string;
  [key: string]: any; // flexible type for boolean, number, string
}

export interface SheetData {
  name: string;
  columns: Column[];
  rows: RowData[];
}

// New Sheet Interface for Multi-sheet support
export interface Sheet {
  id: string;
  name: string;
  columns: Column[];
  rows: RowData[];
  views: View[];
  activeViewId: string;
  selectedRowIds: Set<string>;
}

export interface AnalysisResult {
  summary: string;
  keyTrends: string[];
  suggestedChartType: 'bar' | 'line' | 'pie' | 'area';
}

export enum AIStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// Toolbar Types
export type RowHeight = 'small' | 'medium' | 'large' | 'extra-large';

export type FilterOperator = 
    | 'contains' | 'equals' | 'doesNotContain' // Text/General
    | 'gt' | 'lt' | 'gte' | 'lte' // Number
    | 'isBefore' | 'isAfter' | 'isSame' // Date
    | 'isEmpty' | 'isNotEmpty'; // General

export type FilterMatchType = 'and' | 'or';

export interface Filter {
    id: string;
    columnId: string;
    operator: FilterOperator;
    value: any;
}

export interface SortRule {
    columnId: string;
    direction: 'asc' | 'desc';
}

// --- New Types for Views & Chat ---

export type ViewType = 'grid' | 'kanban' | 'gallery';

export interface View {
    id: string;
    name: string;
    type: ViewType;
    config: {
        filters: Filter[];
        filterMatchType: FilterMatchType;
        sortRule: SortRule | null;
        groupBy: string | null;
        hiddenColumnIds: string[];
        rowHeight: RowHeight;
    }
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai' | 'system';
    content: string;
    timestamp: number;
    isError?: boolean;
}
