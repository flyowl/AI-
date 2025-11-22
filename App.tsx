import React, { useState, useMemo } from 'react';
import Spreadsheet from './components/Spreadsheet';
import Sidebar from './components/Sidebar';
import DataViz from './components/DataViz';
import AddColumnModal from './components/AddColumnModal';
import { Column, RowData, AIStatus, AnalysisResult, ColumnType, SelectOption, Filter, SortRule, RowHeight, FilterMatchType } from './types';
import { generateSmartRows, analyzeDataset, generateSheetFromPrompt } from './services/geminiService';
import { Sparkles, Wand2, LayoutGrid } from 'lucide-react';
import { ConfigProvider, message, Modal } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Initial Mock Data
const INITIAL_COLUMNS: Column[] = [
  { id: 'col1', label: '项目名称', type: 'text' },
  { 
    id: 'col2', 
    label: '状态', 
    type: 'select',
    options: [
        { id: 'opt1', label: '进行中', color: 'bg-blue-100 text-blue-700' },
        { id: 'opt2', label: '已完成', color: 'bg-green-100 text-green-700' },
        { id: 'opt3', label: '已阻塞', color: 'bg-red-100 text-red-700' },
        { id: 'opt4', label: '待办', color: 'bg-slate-100 text-slate-700' },
    ]
  },
  { id: 'col3', label: '优先级', type: 'rating' },
  { id: 'col4', label: '截止日期', type: 'date' },
  { id: 'col5', label: '预算 ($)', type: 'number' },
  { id: 'col6', label: '已批准', type: 'checkbox' },
];

const INITIAL_ROWS: RowData[] = [
  { id: '1', col1: '网站重构', col2: '进行中', col3: 5, col4: '2023-11-15', col5: 12000, col6: true },
  { id: '2', col1: '移动应用 MVP', col2: '已阻塞', col3: 4, col4: '2023-12-01', col5: 45000, col6: true },
  { id: '3', col1: 'Q4 营销活动', col2: '待办', col3: 3, col4: '2023-10-20', col5: 8500, col6: false },
  { id: '4', col1: '旧系统迁移', col2: '已完成', col3: 2, col4: '2023-09-15', col5: 5000, col6: true },
  { id: '5', col1: '员工门户开发', col2: '进行中', col3: 4, col4: '2024-01-10', col5: 22000, col6: false },
];

const App: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS);
  const [rows, setRows] = useState<RowData[]>(INITIAL_ROWS);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [aiStatus, setAiStatus] = useState<AIStatus>(AIStatus.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  
  // Toolbar States
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterMatchType, setFilterMatchType] = useState<FilterMatchType>('and');
  const [sortRule, setSortRule] = useState<SortRule | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState<RowHeight>('medium');
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);

  // Derived Data
  const processedRows = useMemo(() => {
    let result = [...rows];

    // 1. Filter
    if (filters.length > 0) {
        const filterFunc = (row: RowData) => {
             const checkFilter = (filter: Filter) => {
                const col = columns.find(c => c.id === filter.columnId);
                if (!col) return true;

                const rowValue = row[filter.columnId];
                const filterValue = filter.value;

                // Handle Empty Checks first
                if (filter.operator === 'isEmpty') {
                    return rowValue === null || rowValue === undefined || rowValue === '';
                }
                if (filter.operator === 'isNotEmpty') {
                    return rowValue !== null && rowValue !== undefined && rowValue !== '';
                }

                // Type specific checks
                if (col.type === 'date') {
                    const rowDate = dayjs(rowValue);
                    const filterDate = dayjs(filterValue);
                    if (!rowDate.isValid() || !filterDate.isValid()) return false;

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
                    if (isNaN(rNum) || isNaN(fNum)) return false;

                    switch(filter.operator) {
                        case 'equals': return rNum === fNum;
                        case 'gt': return rNum > fNum;
                        case 'lt': return rNum < fNum;
                        case 'gte': return rNum >= fNum;
                        case 'lte': return rNum <= fNum;
                        default: return false;
                    }
                }

                // Default String/Select/etc comparison
                const strRow = String(rowValue ?? '').toLowerCase();
                const strFilter = String(filterValue ?? '').toLowerCase();

                switch(filter.operator) {
                    case 'contains': return strRow.includes(strFilter);
                    case 'doesNotContain': return !strRow.includes(strFilter);
                    case 'equals': return strRow === strFilter;
                    default: return strRow.includes(strFilter);
                }
             };

             if (filterMatchType === 'and') {
                 return filters.every(checkFilter);
             } else {
                 return filters.some(checkFilter);
             }
        };

        result = result.filter(filterFunc);
    }

    // 2. Sort
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
  }, [rows, filters, sortRule, columns, filterMatchType]);

  // Handlers
  const handleCellChange = (rowId: string, colId: string, value: any) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [colId]: value } : row
    ));
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(prev => prev.filter(row => row.id !== rowId));
    if (selectedRowIds.has(rowId)) {
        const newSet = new Set(selectedRowIds);
        newSet.delete(rowId);
        setSelectedRowIds(newSet);
    }
    message.success('行已删除');
  };

  const handleAddRow = () => {
    const newId = crypto.randomUUID();
    const newRow: RowData = { id: newId };
    columns.forEach(c => {
        if(c.type === 'checkbox') newRow[c.id] = false;
        else newRow[c.id] = '';
    });
    setRows(prev => [...prev, newRow]);
  };

  // Selection Handlers
  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedRowIds(newSet);
  };

  const handleSelectAll = () => {
    // Only select visible rows
    if (selectedRowIds.size === processedRows.length && processedRows.length > 0) {
        setSelectedRowIds(new Set());
    } else {
        setSelectedRowIds(new Set(processedRows.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    Modal.confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${selectedRowIds.size} 行数据吗？此操作无法撤销。`,
        okText: '删除选中',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
            setRows(prev => prev.filter(r => !selectedRowIds.has(r.id)));
            setSelectedRowIds(new Set());
            message.success(`已删除 ${selectedRowIds.size} 行数据`);
        }
    });
  };

  const handleSaveColumn = (name: string, type: ColumnType, options?: SelectOption[]) => {
    if (editingColumn) {
        // Update existing
        setColumns(prev => prev.map(col => 
            col.id === editingColumn.id ? { ...col, label: name, type, options } : col
        ));
        setEditingColumn(null);
        message.success('列已更新');
    } else {
        // Add new
        const newCol: Column = {
            id: crypto.randomUUID(),
            label: name,
            type,
            options
        };
        setColumns(prev => [...prev, newCol]);
        message.success('列已创建');
    }
  };

  const handleEditColumn = (col: Column) => {
      setEditingColumn(col);
      setIsColumnModalOpen(true);
  };

  const handleDeleteColumn = (colId: string) => {
      setColumns(prev => prev.filter(c => c.id !== colId));
      // Also clean up filters/sorts/group using this column
      setFilters(prev => prev.filter(f => f.columnId !== colId));
      if (sortRule?.columnId === colId) setSortRule(null);
      if (groupBy === colId) setGroupBy(null);
      setHiddenColumnIds(prev => {
          const next = new Set(prev);
          next.delete(colId);
          return next;
      });
      message.success('列已删除');
  };

  const handleDuplicateColumn = (colId: string) => {
      const col = columns.find(c => c.id === colId);
      if (!col) return;
      
      const newId = crypto.randomUUID();
      const newCol: Column = {
          ...col,
          id: newId,
          label: `${col.label} (副本)`
      };

      const idx = columns.findIndex(c => c.id === colId);
      const newCols = [...columns];
      newCols.splice(idx + 1, 0, newCol);
      setColumns(newCols);

      setRows(prev => prev.map(row => ({
          ...row,
          [newId]: row[colId] 
      })));
      message.success('列已复制');
  };

  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setColumns(prev => {
          const newCols = [...prev];
          const [movedCol] = newCols.splice(fromIndex, 1);
          const targetIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
          newCols.splice(targetIndex, 0, movedCol);
          return newCols;
      });
  };

  // AI Handlers
  const handleSmartFill = async () => {
    setAiStatus(AIStatus.LOADING);
    try {
      const newRows = await generateSmartRows(columns, rows);
      setRows(prev => [...prev, ...newRows]);
      setAiStatus(AIStatus.SUCCESS);
      message.success('已生成 5 行新数据');
    } catch (error) {
      console.error(error);
      setAiStatus(AIStatus.ERROR);
      message.error('生成数据失败');
    }
  };

  const handleAnalyze = async () => {
    setAiStatus(AIStatus.LOADING);
    try {
      const result = await analyzeDataset(columns, processedRows); // Analyze visible data
      setAnalysis(result);
      setAiStatus(AIStatus.SUCCESS);
      message.success('分析完成');
    } catch (error) {
      console.error(error);
      setAiStatus(AIStatus.ERROR);
      message.error('分析失败');
    }
  };

  const handleGenerateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatePrompt.trim()) return;
    
    setIsGeneratingSheet(true);
    setAiStatus(AIStatus.LOADING);
    try {
      const { columns: newCols, rows: newRows } = await generateSheetFromPrompt(generatePrompt);
      setColumns(newCols);
      setRows(newRows);
      setSelectedRowIds(new Set());
      setAnalysis(null); 
      setFilters([]);
      setSortRule(null);
      setGroupBy(null);
      setHiddenColumnIds(new Set());
      setGeneratePrompt('');
      setAiStatus(AIStatus.SUCCESS);
      message.success('表格生成成功');
    } catch (error) {
      console.error(error);
      setAiStatus(AIStatus.ERROR);
      message.error('表格生成失败');
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
        },
      }}
    >
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-1.5 rounded-md shadow-sm">
                <LayoutGrid size={18} />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">AI 智能表格</h1>
              <div className="h-5 w-px bg-slate-200 mx-2"></div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">项目追踪</span>
            </div>
            
            {/* Generator Bar */}
            <form onSubmit={handleGenerateSheet} className="flex-1 max-w-xl mx-8 relative group">
               <input 
                type="text" 
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="让 AI 生成表格 (例如 '包含状态、平台、日期的社交媒体内容日历')"
                className="w-full pl-9 pr-20 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
               />
               <Wand2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <button 
                  type="submit" 
                  disabled={isGeneratingSheet || !generatePrompt}
                  className="absolute right-1 top-1 bottom-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-md text-xs font-medium disabled:opacity-50 transition-colors shadow-sm"
               >
                 {isGeneratingSheet ? '生成中...' : '生成'}
               </button>
            </form>

            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-1.5 rounded-md transition-colors border border-transparent ${showSidebar ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Sparkles size={18} />
            </button>
          </header>

          {/* Content */}
          <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-50/50">
            <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
              <Spreadsheet 
                columns={columns} 
                rows={processedRows} // Pass processed rows
                selectedRowIds={selectedRowIds}
                filters={filters}
                filterMatchType={filterMatchType}
                sortRule={sortRule}
                groupBy={groupBy}
                rowHeight={rowHeight}
                hiddenColumnIds={hiddenColumnIds}
                onCellChange={handleCellChange}
                onDeleteRow={handleDeleteRow}
                onAddRow={handleAddRow}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                onDeleteSelected={handleDeleteSelected}
                onAddColumn={() => {
                    setEditingColumn(null);
                    setIsColumnModalOpen(true);
                }}
                onEditColumn={handleEditColumn}
                onColumnReorder={handleColumnReorder}
                onSortColumn={(colId, direction) => setSortRule({ columnId: colId, direction })}
                onDeleteColumn={handleDeleteColumn}
                onDuplicateColumn={handleDuplicateColumn}
                onFiltersChange={setFilters}
                onFilterMatchTypeChange={setFilterMatchType}
                onSortRuleChange={setSortRule}
                onGroupByChange={setGroupBy}
                onRowHeightChange={setRowHeight}
                onHiddenColumnIdsChange={setHiddenColumnIds}
              />
              
              {/* Chart Section */}
              {analysis && (
                <div className="flex-shrink-0 h-72 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <DataViz 
                    data={processedRows} 
                    columns={columns} 
                    chartType={analysis.suggestedChartType} 
                  />
                </div>
              )}
            </div>

            {/* Sidebar Toggle Animation Wrapper */}
            <div className={`transition-all duration-300 ease-in-out ${showSidebar ? 'w-80 mr-0' : 'w-0 -mr-4 opacity-0 overflow-hidden'}`}>
               <Sidebar 
                 analysis={analysis}
                 status={aiStatus}
                 onAnalyze={handleAnalyze}
                 onGenerateMore={handleSmartFill}
               />
            </div>
          </main>
        </div>

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
    </ConfigProvider>
  );
};

export default App;