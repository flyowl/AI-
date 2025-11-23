
import React, { useState, useMemo } from 'react';
import { Column, RowData, View, AnalysisResult, ColumnType, SelectOption } from '../types';
import Spreadsheet from './Spreadsheet';
import KanbanBoard from './KanbanBoard';
import GalleryGrid from './GalleryGrid';
import DataViz from './DataViz';
import ViewToolbar from './ViewToolbar';
import AddColumnModal from './AddColumnModal';
import { Modal, message } from 'antd';
import dayjs from 'dayjs';

interface SmartSpreadsheetProps {
  columns: Column[];
  rows: RowData[];
  views: View[];
  activeViewId: string;
  selectedRowIds: Set<string>;
  analysisResult?: AnalysisResult | null;
  
  // State Callbacks (Controlled Component Pattern)
  onRowsChange: (newRows: RowData[]) => void;
  onColumnsChange: (newCols: Column[]) => void;
  onViewsChange: (newViews: View[]) => void;
  onActiveViewChange: (viewId: string) => void;
  onSelectionChange: (newSet: Set<string>) => void;
}

const SmartSpreadsheet: React.FC<SmartSpreadsheetProps> = ({
  columns,
  rows,
  views,
  activeViewId,
  selectedRowIds,
  analysisResult,
  onRowsChange,
  onColumnsChange,
  onViewsChange,
  onActiveViewChange,
  onSelectionChange
}) => {
  // --- Local UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);

  // --- Derived State ---
  const activeView = useMemo(() => 
    views.find(v => v.id === activeViewId) || views[0], 
  [views, activeViewId]);

  // --- Data Processing (Filter/Sort/Search) ---
  const processedRows = useMemo(() => {
    let result = [...rows];
    const { filters, filterMatchType, sortRule } = activeView.config;

    // 0. Global Search (Local State)
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        result = result.filter(row => {
            return columns.some(col => {
                const val = String(row[col.id] ?? '').toLowerCase();
                return val.includes(term);
            });
        });
    }

    // 1. Filter (View Config)
    if (filters.length > 0) {
        const filterFunc = (row: RowData) => {
             const checkFilter = (filter: any) => {
                const col = columns.find(c => c.id === filter.columnId);
                if (!col) return true;

                const rowValue = row[filter.columnId];
                const filterValue = filter.value;

                if (filter.operator === 'isEmpty') return rowValue === null || rowValue === undefined || rowValue === '';
                if (filter.operator === 'isNotEmpty') return rowValue !== null && rowValue !== undefined && rowValue !== '';

                if (col.type === 'date') {
                    const rowDate = dayjs(rowValue);
                    const filterDate = dayjs(filterValue);
                    if (!rowDate.isValid()) return false; 
                    if (!filterDate.isValid()) return true;

                    switch(filter.operator) {
                        case 'isSame': return rowDate.isSame(filterDate, 'day');
                        case 'isBefore': return rowDate.isBefore(filterDate, 'day');
                        case 'isAfter': return rowDate.isAfter(filterDate, 'day');
                        default: return false;
                    }
                }

                if (col.type === 'number' || col.type === 'rating') {
                    const rNum = Number(rowValue);
                    const fNum = Number(filterValue);
                    if (rowValue === '' || rowValue === null || isNaN(rNum)) return false;
                    if (isNaN(fNum)) return true;

                    switch(filter.operator) {
                        case 'equals': return rNum === fNum;
                        case 'gt': return rNum > fNum;
                        case 'lt': return rNum < fNum;
                        case 'gte': return rNum >= fNum;
                        case 'lte': return rNum <= fNum;
                        default: return false;
                    }
                }

                const strRow = String(rowValue ?? '').toLowerCase();
                const strFilter = String(filterValue ?? '').toLowerCase();
                switch(filter.operator) {
                    case 'contains': return strRow.includes(strFilter);
                    case 'doesNotContain': return !strRow.includes(strFilter);
                    case 'equals': return strRow === strFilter;
                    default: return strRow.includes(strFilter);
                }
             };

             if (filterMatchType === 'and') return filters.every(checkFilter);
             else return filters.some(checkFilter);
        };
        result = result.filter(filterFunc);
    }

    // 2. Sort (View Config)
    if (sortRule) {
        result.sort((a, b) => {
            const valA = a[sortRule.columnId];
            const valB = b[sortRule.columnId];
            if (valA === valB) return 0;
            if (valA === null || valA === undefined || valA === '') return 1; 
            if (valB === null || valB === undefined || valB === '') return -1;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortRule.direction === 'asc' ? valA - valB : valB - valA;
            }
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return sortRule.direction === 'asc' ? -1 : 1;
            return sortRule.direction === 'asc' ? 1 : -1;
        });
    }

    return result;
  }, [rows, activeView, searchTerm, columns]);

  // --- Handler Adaptors (Component Logic -> Prop Updates) ---

  const handleUpdateViewConfig = (updates: Partial<View['config']>) => {
    const newViews = views.map(v => v.id === activeViewId ? { ...v, config: { ...v.config, ...updates } } : v);
    onViewsChange(newViews);
  };

  // Data Operations
  const handleCellChange = (rowId: string, colId: string, value: any) => {
      const newRows = rows.map(row => row.id === rowId ? { ...row, [colId]: value } : row);
      onRowsChange(newRows);
  };

  const handleAddRow = () => {
      const newId = crypto.randomUUID();
      const newRow: RowData = { id: newId };
      columns.forEach(c => {
          if(c.type === 'checkbox') newRow[c.id] = false;
          else newRow[c.id] = '';
      });
      onRowsChange([...rows, newRow]);
      message.success('新行已添加');
  };

  const handleDeleteRow = (rowId: string) => {
      const newRows = rows.filter(r => r.id !== rowId);
      onRowsChange(newRows);
      
      const newSelected = new Set(selectedRowIds);
      newSelected.delete(rowId);
      onSelectionChange(newSelected);
      message.success('行已删除');
  };

  const handleDeleteSelected = () => {
    Modal.confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${selectedRowIds.size} 行数据吗？`,
        okText: '删除',
        okType: 'danger',
        onOk: () => {
            const newRows = rows.filter(r => !selectedRowIds.has(r.id));
            onRowsChange(newRows);
            onSelectionChange(new Set());
            message.success('数据已删除');
        }
    });
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    onSelectionChange(newSet);
  };

  const handleSelectAll = () => {
    const allIds = processedRows.map(r => r.id);
    const newSet = selectedRowIds.size === allIds.length && allIds.length > 0
        ? new Set<string>()
        : new Set(allIds);
    onSelectionChange(newSet);
  };

  // Column Operations
  const handleSaveColumn = (name: string, type: ColumnType, options?: SelectOption[]) => {
    if (editingColumn) {
        const newCols = columns.map(col => col.id === editingColumn.id ? { ...col, label: name, type, options } : col);
        onColumnsChange(newCols);
        setEditingColumn(null);
        message.success('列已更新');
    } else {
        const newCol: Column = { id: crypto.randomUUID(), label: name, type, options };
        onColumnsChange([...columns, newCol]);
        message.success('列已创建');
    }
  };

  const handleDeleteColumn = (colId: string) => {
      onColumnsChange(columns.filter(c => c.id !== colId));
      // Also cleanup views to remove references to this column
      const newViews = views.map(v => ({
          ...v,
          config: {
              ...v.config,
              filters: v.config.filters.filter(f => f.columnId !== colId),
              sortRule: v.config.sortRule?.columnId === colId ? null : v.config.sortRule,
              groupBy: v.config.groupBy === colId ? null : v.config.groupBy,
              hiddenColumnIds: v.config.hiddenColumnIds.filter(id => id !== colId)
          }
      }));
      onViewsChange(newViews);
      message.success('列已删除');
  };

  const handleDuplicateColumn = (colId: string) => {
      const col = columns.find(c => c.id === colId);
      if (!col) return;
      const newId = crypto.randomUUID();
      const newCol: Column = { ...col, id: newId, label: `${col.label} (副本)` };
      const idx = columns.findIndex(c => c.id === colId);
      const newCols = [...columns];
      newCols.splice(idx + 1, 0, newCol);
      
      const newRows = rows.map(row => ({ ...row, [newId]: row[colId] }));
      
      onColumnsChange(newCols);
      onRowsChange(newRows);
      message.success('列已复制');
  };

  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const newCols = [...columns];
      const [movedCol] = newCols.splice(fromIndex, 1);
      const targetIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      newCols.splice(targetIndex, 0, movedCol);
      onColumnsChange(newCols);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative bg-slate-50/50">
       {/* Toolbar Area */}
       <div className="px-4 pt-3 pb-1 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10">
           <ViewToolbar 
               view={activeView}
               columns={columns}
               onUpdateConfig={handleUpdateViewConfig}
               onSearch={setSearchTerm}
           />
       </div>

       {/* Main View Area */}
       <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
            {activeView.type === 'grid' && (
                <Spreadsheet 
                    columns={columns} 
                    rows={processedRows} 
                    selectedRowIds={selectedRowIds}
                    filters={activeView.config.filters}
                    filterMatchType={activeView.config.filterMatchType}
                    sortRule={activeView.config.sortRule}
                    groupBy={activeView.config.groupBy}
                    rowHeight={activeView.config.rowHeight}
                    hiddenColumnIds={new Set(activeView.config.hiddenColumnIds)}
                    onCellChange={handleCellChange}
                    onDeleteRow={handleDeleteRow}
                    onAddRow={handleAddRow}
                    onSelectRow={handleSelectRow}
                    onSelectAll={handleSelectAll}
                    onDeleteSelected={handleDeleteSelected}
                    onAddColumn={() => { setEditingColumn(null); setIsColumnModalOpen(true); }}
                    onEditColumn={(col) => { setEditingColumn(col); setIsColumnModalOpen(true); }}
                    onColumnReorder={handleColumnReorder}
                    onSortColumn={(colId, direction) => handleUpdateViewConfig({ sortRule: { columnId: colId, direction } })}
                    onDeleteColumn={handleDeleteColumn}
                    onDuplicateColumn={handleDuplicateColumn}
                    onFiltersChange={(filters) => handleUpdateViewConfig({ filters })}
                    onFilterMatchTypeChange={(type) => handleUpdateViewConfig({ filterMatchType: type })}
                    onSortRuleChange={(rule) => handleUpdateViewConfig({ sortRule: rule })}
                    onGroupByChange={(id) => handleUpdateViewConfig({ groupBy: id })}
                    onRowHeightChange={(height) => handleUpdateViewConfig({ rowHeight: height })}
                    onHiddenColumnIdsChange={(ids) => handleUpdateViewConfig({ hiddenColumnIds: Array.from(ids) })}
                />
            )}

            {activeView.type === 'kanban' && (
                <div className="flex-1 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50 px-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kanban</span>
                            <select 
                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                            value={activeView.config.groupBy || ''}
                            onChange={(e) => handleUpdateViewConfig({ groupBy: e.target.value })}
                            >
                                <option value="" disabled>分组依据...</option>
                                {columns.filter(c => c.type === 'select').map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 overflow-hidden">
                        <KanbanBoard 
                            columns={columns}
                            rows={processedRows}
                            groupByColId={activeView.config.groupBy || columns.find(c => c.type === 'select')?.id || null}
                            onCardClick={() => {}}
                        />
                        </div>
                </div>
            )}

            {activeView.type === 'gallery' && (
                <div className="flex-1 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <GalleryGrid columns={columns} rows={processedRows} />
                </div>
            )}
            
            {analysisResult && (
                <div className="flex-shrink-0 h-64 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DataViz 
                    data={processedRows} 
                    columns={columns} 
                    chartType={analysisResult.suggestedChartType} 
                />
                </div>
            )}
       </div>

       {/* Modals */}
       <AddColumnModal 
          isOpen={isColumnModalOpen} 
          onClose={() => {
              setIsColumnModalOpen(false);
              setEditingColumn(null);
          }} 
          onSave={handleSaveColumn} 
          initialData={editingColumn}
        />
    </div>
  );
};

export default SmartSpreadsheet;
