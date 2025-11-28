

export type ColumnType = 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'checkbox' | 'switch' | 'url' | 'rating' | 'image' | 'file' | 'person' | 'phone' | 'email' | 'location' | 'relation';

export interface SelectOption {
  id: string;
  label: string;
  color: string; // tailwind color class e.g. 'bg-red-100 text-red-700'
}

export interface RelationConfig {
    targetSheetId: string;
    targetColumnId?: string; // The "linked" column in the other sheet (for bidirectional)
    bidirectional?: boolean; // Whether to create/maintain a back-link in the target sheet
}

export interface Column {
  id: string;
  label: string;
  type: ColumnType;
  width?: number;
  options?: SelectOption[]; // For 'select' type
  relationConfig?: RelationConfig; // For 'relation' type
  defaultValue?: any; // Configured default value for new rows
}

export interface RowData {
  id: string;
  [key: string]: any; // flexible type for boolean, number, string
}

export interface Sheet {
  id: string;
  name: string;
  type: 'sheet' | 'folder' | 'document'; // Updated to include 'document'
  parentId?: string;        // Supports nesting
  isOpen?: boolean;         // For folder expansion
  content?: string;         // For documents
  
  // Spreadsheet specific
  columns: Column[];
  rows: RowData[];
  views: View[];
  activeViewId: string;
  selectedRowIds: Set<string>;
}

// --- Analysis & AI ---

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

// --- App & Project Types ---

export interface Team {
    id: string;
    name: string;
    memberCount: number;
    role: string;
    description?: string;
}

export interface Project {
    id: string;
    name: string;
    updatedAt: number;
    createdAt: number;
    owner: string;
    description: string;
    projectType: 'spreadsheet' | 'document';
    isStarred?: boolean;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    email: string;
    avatar: string; // Initials or URL
    status: 'Active' | 'Pending';
    joinedAt: string;
}

export interface AppTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    color: string;
    icon: any; // Lucide Icon component
    popularity: number;
}