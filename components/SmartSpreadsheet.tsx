
import React, { useState, useMemo } from 'react';
import { Column, RowData, View, AnalysisResult, ColumnType, SelectOption, Sheet } from '../types';
import Spreadsheet from './Spreadsheet';
import KanbanBoard from './KanbanBoard';
import GalleryGrid from './GalleryGrid';
import DataViz from './DataViz';
import ViewToolbar from './ViewToolbar';
import AddColumnModal from './AddColumnModal';
import RowDetailModal from './RowDetailModal';
import { Modal, message, Button } from 'antd';
import { Trash2, Copy, X } from 'lucide-react';
import dayjs from 'dayjs';

interface SmartSpreadsheetProps {
  sheetId: string; // Current Sheet ID
  sheetName: string; // Current Sheet Name
  columns: Column[];
  rows: RowData[];
  views: View[];
  activeViewId: string;
  selectedRowIds: Set<string>;
  analysisResult?: AnalysisResult | null;
  allSheets: Sheet[]; // Needed for context
  
  // State Callbacks (Controlled Component Pattern)
  onRowsChange: (newRows: RowData[]) => void;
  onColumnsChange: (newCols: Column[]) => void;
  onViewsChange: (newViews: View[]) => void;
  onActiveViewChange: (viewId: string) => void;
  onSelectionChange: (newSet: Set<string>) => void;
  
  // Update other sheets (for bidirectional binding)
  onUpdateOtherSheet: (sheetId: string, updater: (s: Sheet) => Sheet) => void;
}

const SmartSpreadsheet: React.FC<SmartSpreadsheetProps> = ({
  sheetId,
  sheetName,
  columns,
  rows,
  views,
  activeViewId,
  selectedRowIds,
  analysisResult,
  allSheets,
  onRowsChange,
  onColumnsChange,
  onViewsChange,
  onActiveViewChange,
  onSelectionChange,
  onUpdateOtherSheet
}) => {
  // --- Local UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  
  // Row Detail Modal State
  const [detailRowId, setDetailRowId] = useState<string | null>(null);

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
      // 1. Update current sheet
      const newRows = rows.map(row => row.id === rowId ? { ...row, [colId]: value } : row);
      onRowsChange(newRows);

      // 2. Handle Bidirectional Updates if it's a Relation Column
      const col = columns.find(c => c.id === colId);
      if (col?.type === 'relation' && col.relationConfig) {
          const targetSheetId = col.relationConfig.targetSheetId;
          const targetSheet = allSheets.find(s => s.id === targetSheetId);
          
          if (targetSheet) {
             // Find the corresponding column in the target sheet that points back to THIS sheet
             // We look for a column that has targetSheetId === currentSheetId
             const backLinkCol = targetSheet.columns.find(c => 
                 c.type === 'relation' && c.relationConfig?.targetSheetId === sheetId
             );

             if (backLinkCol) {
                 // value is Array of IDs (e.g., ['target_row_1', 'target_row_2'])
                 const selectedTargetRowIds = Array.isArray(value) ? value : [];
                 
                 onUpdateOtherSheet(targetSheetId, (prevSheet) => {
                     const updatedRows = prevSheet.rows.map(targetRow => {
                         let currentRelations = targetRow[backLinkCol.id];
                         if (!Array.isArray(currentRelations)) currentRelations = [];

                         // Check if this target row is one of the newly selected ones
                         const isSelected = selectedTargetRowIds.includes(targetRow.id);
                         const isAlreadyLinked = currentRelations.includes(rowId);

                         if (isSelected && !isAlreadyLinked) {
                             // Add link
                             return { ...targetRow, [backLinkCol.id]: [...currentRelations, rowId] };
                         } else if (!isSelected && isAlreadyLinked) {
                             // Remove link (it was deselected in the source)
                             return { ...targetRow, [backLinkCol.id]: currentRelations.filter((id: string) => id !== rowId) };
                         }
                         
                         return targetRow;
                     });
                     return { ...prevSheet, rows: updatedRows };
                 });
             }
          }
      }
  };

  const handleRowUpdate = (rowId: string, updates: Record<string, any>) => {
      const newRows = rows.map(row => row.id === rowId ? { ...row, ...updates } : row);
      onRowsChange(newRows);

      // Simple Iteration to check for relation updates
      Object.keys(updates).forEach(key => {
          const col = columns.find(c => c.id === key);
          if (col?.type === 'relation') {
              handleCellChange(rowId, key, updates[key]);
          }
      });

      message.success('行数据已更新');
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

  const handleDeleteSelectedTrigger = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSelected = () => {
    const newRows = rows.filter(r => !selectedRowIds.has(r.id));
    onRowsChange(newRows);
    onSelectionChange(new Set());
    setIsDeleteModalOpen(false);
    message.success('数据已删除');
  };
  
  const handleDuplicateSelected = () => {
      const rowsToDuplicate = rows.filter(r => selectedRowIds.has(r.id));
      const newRows = rowsToDuplicate.map(r => ({ ...r, id: crypto.randomUUID() }));
      
      // Insert them at the end
      onRowsChange([...rows, ...newRows]);
      
      // Select the newly duplicated rows
      const nextSelected = new Set<string>();
      newRows.forEach(r => nextSelected.add(r.id));
      
      onSelectionChange(nextSelected);
      message.success(`已复制 ${rowsToDuplicate.length} 行数据`);
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
  const handleSaveColumn = (name: string, type: ColumnType, options?: SelectOption[], targetSheetId?: string) => {
    if (editingColumn) {
        // Edit Mode
        const newCols = columns.map(col => col.id === editingColumn.id ? { 
            ...col, 
            label: name, 
            type, 
            options,
            relationConfig: targetSheetId ? { targetSheetId } : undefined
        } : col);
        onColumnsChange(newCols);
        setEditingColumn(null);
        message.success('列已更新');
    } else {
        // Create Mode
        const newColId = crypto.randomUUID();
        const newCol: Column = { 
            id: newColId, 
            label: name, 
            type, 
            options,
            relationConfig: targetSheetId ? { targetSheetId } : undefined
        };
        onColumnsChange([...columns, newCol]);

        // --- Bidirectional Column Creation ---
        if (type === 'relation' && targetSheetId) {
            onUpdateOtherSheet(targetSheetId, (targetSheet) => {
                // Check if already exists to avoid dupes (optional, but good practice)
                // We create a "Linked to [This Sheet Name]" column
                const backLinkLabel = `关联 ${sheetName}`;
                const newBackCol: Column = {
                    id: crypto.randomUUID(),
                    label: backLinkLabel,
                    type: 'relation',
                    relationConfig: { targetSheetId: sheetId }
                };
                return {
                    ...targetSheet,
                    columns: [...targetSheet.columns, newBackCol]
                };
            });
            message.success(`已在目标表中自动创建对应关联列`);
        } else {
            message.success('列已创建');
        }
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
       <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 relative">
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
                    allSheets={allSheets}
                    onCellChange={handleCellChange}
                    onDeleteRow={handleDeleteRow}
                    onAddRow={handleAddRow}
                    onSelectRow={handleSelectRow}
                    onSelectAll={handleSelectAll}
                    onDeleteSelected={handleDeleteSelectedTrigger}
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
                    onOpenRowDetail={setDetailRowId}
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
                            onCardClick={(id) => setDetailRowId(id)}
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

            {/* Selection Floating Bar */}
            {selectedRowIds.size > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 rounded-full px-6 py-2.5 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {selectedRowIds.size}
                        </div>
                        <span>项已选择</span>
                    </div>
                    
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    
                    <Button 
                        type="text" 
                        icon={<Copy size={14}/>} 
                        size="small" 
                        onClick={(e) => { e.stopPropagation(); handleDuplicateSelected(); }}
                        className="text-slate-600 hover:text-indigo-600"
                    >
                        复制
                    </Button>
                    
                    <Button 
                        type="text" 
                        danger 
                        icon={<Trash2 size={14}/>} 
                        size="small" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSelectedTrigger(); }}
                    >
                        删除
                    </Button>
                    
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>

                    <Button 
                        type="text" 
                        icon={<X size={14}/>} 
                        size="small"
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center p-0 min-w-0"
                        onClick={(e) => { e.stopPropagation(); onSelectionChange(new Set()); }}
                    />
                </div>
            )}
       </div>

       {/* Modals */}
       <AddColumnModal 
          isOpen={isColumnModalOpen} 
          currentSheetId={sheetId}
          allSheets={allSheets}
          onClose={() => {
              setIsColumnModalOpen(false);
              setEditingColumn(null);
          }} 
          onSave={handleSaveColumn} 
          initialData={editingColumn}
        />
        
        <Modal
            title="确认删除"
            open={isDeleteModalOpen}
            onOk={confirmDeleteSelected}
            onCancel={() => setIsDeleteModalOpen(false)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            centered
            zIndex={1050}
        >
            <div className="py-2">
                <p className="text-slate-600">确定要删除选中的 <span className="font-bold text-slate-900">{selectedRowIds.size}</span> 行数据吗？</p>
                <p className="text-xs text-slate-400 mt-1">此操作无法撤销。</p>
            </div>
        </Modal>

        <RowDetailModal 
            isOpen={!!detailRowId}
            onClose={() => setDetailRowId(null)}
            rowData={detailRowId ? rows.find(r => r.id === detailRowId) || null : null}
            columns={columns}
            onSave={handleRowUpdate}
            allSheets={allSheets}
        />
    </div>
  );
};

export default SmartSpreadsheet;
