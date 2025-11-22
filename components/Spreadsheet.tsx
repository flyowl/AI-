import React, { useState, useRef, useMemo } from 'react';
import { Column, RowData, Filter, SortRule, RowHeight, FilterMatchType, FilterOperator } from '../types';
import { 
  Trash2, Plus, Hash, Type, Calendar, CheckSquare, 
  List, Link as LinkIcon, Star, MoreHorizontal,
  ArrowUpAz, ArrowDownZa, Settings, Copy, X,
  LayoutList, Grid3X3, Filter as FilterIcon, ArrowUpDown, Rows,
  ChevronDown, Check, User, Phone, Mail, MapPin, Image as ImageIcon, FileText
} from 'lucide-react';
import { Dropdown, MenuProps, Button, Input, Select, DatePicker, Checkbox, Rate, Modal, Popover, Switch, Segmented, Avatar, InputNumber } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

interface SpreadsheetProps {
  columns: Column[];
  rows: RowData[];
  selectedRowIds: Set<string>;
  filters: Filter[];
  filterMatchType: FilterMatchType;
  sortRule: SortRule | null;
  groupBy: string | null;
  rowHeight: RowHeight;
  hiddenColumnIds: Set<string>;
  
  onCellChange: (rowId: string, colId: string, value: any) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: () => void;
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onAddColumn: () => void;
  onSortColumn: (colId: string, direction: 'asc' | 'desc') => void;
  onDeleteColumn: (colId: string) => void;
  onEditColumn: (col: Column) => void;
  onDuplicateColumn: (colId: string) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;

  // State updaters
  onFiltersChange: (filters: Filter[]) => void;
  onFilterMatchTypeChange: (type: FilterMatchType) => void;
  onSortRuleChange: (rule: SortRule | null) => void;
  onGroupByChange: (colId: string | null) => void;
  onRowHeightChange: (height: RowHeight) => void;
  onHiddenColumnIdsChange: (ids: Set<string>) => void;
}

const getColumnIcon = (type: string) => {
  switch (type) {
    case 'number': return <Hash size={14} className="text-orange-500" />;
    case 'date': return <Calendar size={14} className="text-pink-500" />;
    case 'select': return <List size={14} className="text-blue-500" />;
    case 'checkbox': return <CheckSquare size={14} className="text-green-500" />;
    case 'url': return <LinkIcon size={14} className="text-sky-500" />;
    case 'rating': return <Star size={14} className="text-yellow-500" />;
    case 'person': return <User size={14} className="text-purple-500" />;
    case 'email': return <Mail size={14} className="text-red-400" />;
    case 'phone': return <Phone size={14} className="text-teal-500" />;
    case 'location': return <MapPin size={14} className="text-rose-500" />;
    case 'image': return <ImageIcon size={14} className="text-indigo-500" />;
    case 'file': return <FileText size={14} className="text-slate-500" />;
    default: return <Type size={14} className="text-slate-400" />;
  }
};

const getOperatorsForType = (type: string): { label: string, value: FilterOperator }[] => {
    const base: { label: string, value: FilterOperator }[] = [
        { label: '为空', value: 'isEmpty' },
        { label: '不为空', value: 'isNotEmpty' },
    ];
    if (type === 'number' || type === 'rating') {
        return [
            { label: '等于', value: 'equals' },
            { label: '大于', value: 'gt' },
            { label: '小于', value: 'lt' },
            { label: '大于等于', value: 'gte' },
            { label: '小于等于', value: 'lte' },
            ...base
        ];
    }
    if (type === 'date') {
         return [
            { label: '是', value: 'isSame' },
            { label: '早于', value: 'isBefore' },
            { label: '晚于', value: 'isAfter' },
            ...base
        ];
    }
    // Text, Select, etc
    return [
        { label: '包含', value: 'contains' },
        { label: '不包含', value: 'doesNotContain' },
        { label: '等于', value: 'equals' },
        ...base
    ];
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({
  columns,
  rows,
  selectedRowIds,
  filters,
  filterMatchType,
  sortRule,
  groupBy,
  rowHeight,
  hiddenColumnIds,
  onCellChange,
  onDeleteRow,
  onAddRow,
  onSelectRow,
  onSelectAll,
  onDeleteSelected,
  onAddColumn,
  onSortColumn,
  onDeleteColumn,
  onEditColumn,
  onDuplicateColumn,
  onColumnReorder,
  onFiltersChange,
  onFilterMatchTypeChange,
  onSortRuleChange,
  onGroupByChange,
  onRowHeightChange,
  onHiddenColumnIdsChange
}) => {
  // Drag and Drop State
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);

  // Visible columns
  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumnIds.has(c.id)), [columns, hiddenColumnIds]);

  // Selection State Helpers
  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const indeterminate = selectedRowIds.size > 0 && selectedRowIds.size < rows.length;

  // Grouping Logic
  const groupedData = useMemo(() => {
    if (!groupBy) return null;
    
    const groups: Record<string, RowData[]> = {};
    rows.forEach(row => {
        const key = String(row[groupBy] || '未分组');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    return Object.entries(groups);
  }, [rows, groupBy]);

  // Helper: Row Height Class
  const getRowHeightClass = () => {
      switch(rowHeight) {
          case 'small': return 'py-1';
          case 'large': return 'py-4';
          case 'extra-large': return 'py-6';
          default: return 'py-2.5'; // medium
      }
  };

  // Helper: Column Menu
  const getColumnMenu = (col: Column): MenuProps['items'] => [
    {
        key: 'asc',
        label: '升序排序 (A-Z)',
        icon: <ArrowUpAz size={14}/>,
        onClick: () => onSortColumn(col.id, 'asc')
    },
    {
        key: 'desc',
        label: '降序排序 (Z-A)',
        icon: <ArrowDownZa size={14}/>,
        onClick: () => onSortColumn(col.id, 'desc')
    },
    { type: 'divider' },
    {
        key: 'group',
        label: '以此分组',
        icon: <LayoutList size={14}/>,
        onClick: () => onGroupByChange(col.id)
    },
    { type: 'divider' },
    {
        key: 'edit',
        label: '列设置',
        icon: <Settings size={14}/>,
        onClick: () => onEditColumn(col)
    },
    {
        key: 'duplicate',
        label: '复制列',
        icon: <Copy size={14}/>,
        onClick: () => onDuplicateColumn(col.id)
    },
    { type: 'divider' },
    {
        key: 'hide',
        label: '隐藏列',
        icon: <X size={14}/>,
        onClick: () => {
            const newSet = new Set(hiddenColumnIds);
            newSet.add(col.id);
            onHiddenColumnIdsChange(newSet);
        }
    },
    {
        key: 'delete',
        label: <span className="text-red-600">删除列</span>,
        icon: <Trash2 size={14} className="text-red-600"/>,
        onClick: () => Modal.confirm({
            title: '删除列',
            content: '确定要删除此列吗？此操作无法撤销。',
            okText: '删除',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: () => onDeleteColumn(col.id)
        })
    }
  ];

  // Toolbar Content Components
  const fieldsContent = (
      <div className="w-64">
          <div className="px-3 py-2 border-b border-slate-100 font-medium text-slate-700 text-sm">显示/隐藏字段</div>
          <div className="max-h-64 overflow-y-auto py-2">
              {columns.map(col => (
                  <div key={col.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50">
                      <span className="text-sm flex items-center gap-2 text-slate-600">
                          {getColumnIcon(col.type)}
                          {col.label}
                      </span>
                      <Switch 
                        size="small" 
                        checked={!hiddenColumnIds.has(col.id)}
                        onChange={(checked) => {
                            const newSet = new Set(hiddenColumnIds);
                            if (checked) newSet.delete(col.id);
                            else newSet.add(col.id);
                            onHiddenColumnIdsChange(newSet);
                        }}
                      />
                  </div>
              ))}
          </div>
      </div>
  );

  const renderFilterValueInput = (filter: Filter, index: number) => {
      const col = columns.find(c => c.id === filter.columnId);
      const isUnary = filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty';
      
      if (isUnary) return <div className="flex-1"></div>;

      const handleChange = (val: any) => {
          const newFilters = [...filters];
          newFilters[index].value = val;
          onFiltersChange(newFilters);
      };

      if (col?.type === 'date') {
          return (
              <DatePicker 
                  size="small"
                  className="flex-1"
                  value={filter.value ? dayjs(filter.value) : null}
                  onChange={(_, dateStr) => handleChange(dateStr)}
                  placeholder="选择日期"
              />
          );
      }

      if (col?.type === 'select') {
          return (
              <Select
                  size="small"
                  className="flex-1"
                  placeholder="选择值"
                  value={filter.value}
                  onChange={handleChange}
                  options={col.options?.map(opt => ({ label: opt.label, value: opt.label }))}
              />
          );
      }
      
      if (col?.type === 'number' || col?.type === 'rating') {
          return (
              <InputNumber
                  size="small"
                  className="flex-1 w-full"
                  placeholder="输入数字"
                  value={filter.value}
                  onChange={handleChange}
              />
          )
      }

      return (
          <Input 
              size="small" 
              placeholder="输入值" 
              value={filter.value} 
              onChange={(e) => handleChange(e.target.value)} 
              className="flex-1"
          />
      );
  };

  const filterContent = (
      <div className="w-[420px] p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-700">筛选数据</h4>
            {filters.length > 0 && (
                <Button size="small" type="text" className="text-slate-400 text-xs hover:text-red-500" onClick={() => onFiltersChange([])}>清除全部</Button>
            )}
          </div>
          
          {filters.length > 0 && (
              <div className="mb-4 flex justify-center">
                  <Segmented 
                     options={[
                         { label: '符合所有条件 (AND)', value: 'and' },
                         { label: '符合任一条件 (OR)', value: 'or' }
                     ]}
                     value={filterMatchType}
                     onChange={(val) => onFilterMatchTypeChange(val as FilterMatchType)}
                     size="small"
                  />
              </div>
          )}

          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {filters.map((filter, idx) => {
                  const col = columns.find(c => c.id === filter.columnId);
                  const operators = getOperatorsForType(col?.type || 'text');
                  
                  return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200 group">
                          {/* Column Select */}
                          <Select 
                              size="small"
                              className="w-28"
                              value={filter.columnId}
                              options={columns.map(c => ({ label: c.label, value: c.id }))}
                              onChange={(val) => {
                                  const newFilters = [...filters];
                                  newFilters[idx].columnId = val;
                                  newFilters[idx].value = ''; // reset value
                                  newFilters[idx].operator = 'contains'; // reset op to safe default
                                  // if new col is number, set to equals
                                  const newCol = columns.find(c => c.id === val);
                                  if (newCol?.type === 'number' || newCol?.type === 'rating') newFilters[idx].operator = 'equals';
                                  if (newCol?.type === 'date') newFilters[idx].operator = 'isSame';
                                  onFiltersChange(newFilters);
                              }}
                          />
                          
                          {/* Operator Select */}
                          <Select 
                              size="small"
                              className="w-24"
                              value={filter.operator}
                              options={operators}
                              onChange={(val) => {
                                  const newFilters = [...filters];
                                  newFilters[idx].operator = val;
                                  onFiltersChange(newFilters);
                              }}
                          />

                          {/* Dynamic Value Input */}
                          {renderFilterValueInput(filter, idx)}

                          <Button 
                             type="text" size="small" icon={<Trash2 size={14} />} 
                             className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => onFiltersChange(filters.filter((_, i) => i !== idx))}
                          />
                      </div>
                  )
              })}
              {filters.length === 0 && <div className="text-sm text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg bg-slate-50">暂无筛选条件，请添加</div>}
          </div>
          
          <Button block type="dashed" icon={<Plus size={14} />} onClick={() => {
              const firstCol = columns[0];
              onFiltersChange([...filters, { 
                  id: crypto.randomUUID(), 
                  columnId: firstCol.id, 
                  operator: firstCol.type === 'date' ? 'isSame' : (firstCol.type === 'number' ? 'equals' : 'contains'), 
                  value: '' 
              }]);
          }}>添加条件</Button>
      </div>
  );

  const sortContent = (
      <div className="w-64 p-2">
           <div className="px-2 py-1 font-medium text-slate-700 text-sm mb-2">排序规则</div>
           {sortRule ? (
               <div className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded text-sm text-indigo-700 border border-indigo-100">
                   <span>{columns.find(c => c.id === sortRule.columnId)?.label}</span>
                   <div className="flex items-center gap-2">
                       <span className="text-xs opacity-70">{sortRule.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                       <Button size="small" type="text" icon={<X size={12} />} onClick={() => onSortRuleChange(null)} />
                   </div>
               </div>
           ) : (
               <div className="text-xs text-slate-400 px-2 pb-2">暂无排序</div>
           )}
           <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 block mb-1 px-2">设置排序</span>
                {columns.map(col => (
                    <div 
                        key={col.id} 
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded"
                        onClick={() => onSortRuleChange({ columnId: col.id, direction: 'asc' })}
                    >
                         <span className="text-sm">{col.label}</span>
                         {sortRule?.columnId === col.id && <Check size={14} className="text-indigo-600" />}
                    </div>
                ))}
           </div>
      </div>
  );

  const groupContent = (
    <div className="w-56 py-1">
        <div className="px-3 py-2 font-medium text-slate-700 text-sm border-b border-slate-100 mb-1">分组依据</div>
        <div 
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between ${!groupBy ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
            onClick={() => onGroupByChange(null)}
        >
            <span>不分组</span>
            {!groupBy && <Check size={14} />}
        </div>
        {columns.map(col => (
             <div 
                key={col.id} 
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between ${groupBy === col.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                onClick={() => onGroupByChange(col.id)}
             >
                 <span className="flex items-center gap-2">
                    {getColumnIcon(col.type)}
                    {col.label}
                 </span>
                 {groupBy === col.id && <Check size={14} />}
             </div>
        ))}
    </div>
  );

  const rowHeightContent: MenuProps['items'] = [
      { key: 'small', label: '紧凑', onClick: () => onRowHeightChange('small') },
      { key: 'medium', label: '标准', onClick: () => onRowHeightChange('medium') },
      { key: 'large', label: '宽松', onClick: () => onRowHeightChange('large') },
      { key: 'extra-large', label: '超宽', onClick: () => onRowHeightChange('extra-large') },
  ];

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragSourceIndex.current = index;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragSourceIndex.current === index) { setDragOverIndex(null); return; }
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const fromIndex = dragSourceIndex.current;
    if (fromIndex !== null && fromIndex !== index) {
      onColumnReorder(fromIndex, index);
    }
    dragSourceIndex.current = null;
    setDragOverIndex(null);
  };

  // Helper to render rows
  const renderRows = (rowsToRender: RowData[]) => {
      return rowsToRender.map((row, index) => (
        <tr key={row.id} className={`group transition-colors ${selectedRowIds.has(row.id) ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/50'}`}>
            <td className="p-0 text-center border-r border-slate-200 bg-slate-50/30">
                <div className={`w-full flex items-center justify-center ${getRowHeightClass()}`}>
                    <Checkbox checked={selectedRowIds.has(row.id)} onChange={() => onSelectRow(row.id)} />
                </div>
            </td>
            <td className="bg-slate-50/30 p-0 text-center border-r border-slate-200 text-slate-400 text-xs select-none">
                <div className={`w-full flex items-center justify-center group-hover:hidden ${getRowHeightClass()}`}>
                    {index + 1}
                </div>
                <div className={`w-full flex items-center justify-center hidden group-hover:flex ${getRowHeightClass()}`}>
                    <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300 cursor-grab active:cursor-grabbing"></div>
                </div>
            </td>
            {visibleColumns.map((col) => (
                <td key={`${row.id}-${col.id}`} className={`p-0 border-r border-slate-100 relative h-full align-top ${selectedRowIds.has(row.id) ? 'bg-blue-50/20' : 'bg-white'}`}>
                    <div className={getRowHeightClass()}>
                         <CellRenderer row={row} col={col} onChange={onCellChange} />
                    </div>
                </td>
            ))}
            <td className="border-r border-slate-100 bg-slate-50/10"></td>
            <td className="p-0 text-center border-b-0">
                <div className={`w-full flex items-center justify-center ${getRowHeightClass()}`}>
                    <button onClick={() => onDeleteRow(row.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
      ));
  }

  return (
    <div className="flex-1 flex flex-col border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden relative">
      
      {/* Toolbar */}
      <div className="flex items-center px-3 py-2 border-b border-slate-200 bg-white gap-2">
        <Button type="primary" size="small" icon={<Plus size={14} />} onClick={onAddRow} className="bg-blue-600">
            添加一行
        </Button>
        
        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        <Popover content={fieldsContent} trigger="click" placement="bottomLeft">
            <Button type="text" size="small" className={`text-slate-600 flex items-center gap-1.5 ${hiddenColumnIds.size > 0 ? 'bg-slate-100 text-slate-900' : ''}`}>
                <Grid3X3 size={14} /> 字段管理
            </Button>
        </Popover>
        
        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        <Popover content={filterContent} trigger="click" placement="bottomLeft" arrow={false}>
            <Button type="text" size="small" className={`text-slate-600 flex items-center gap-1.5 ${filters.length > 0 ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <FilterIcon size={14} /> 筛选
                {filters.length > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1 rounded-full">{filters.length}</span>}
            </Button>
        </Popover>

        <Popover content={groupContent} trigger="click" placement="bottomLeft">
             <Button type="text" size="small" className={`text-slate-600 flex items-center gap-1.5 ${groupBy ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <LayoutList size={14} /> 分组
            </Button>
        </Popover>

        <Popover content={sortContent} trigger="click" placement="bottomLeft">
             <Button type="text" size="small" className={`text-slate-600 flex items-center gap-1.5 ${sortRule ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                <ArrowUpDown size={14} /> 排序
            </Button>
        </Popover>

        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        <Dropdown menu={{ items: rowHeightContent }} trigger={['click']}>
            <Button type="text" size="small" className="text-slate-600 flex items-center gap-1.5">
                <Rows size={14} /> 行高
            </Button>
        </Dropdown>
      </div>

      {/* Table Container */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <tr className="border-b border-slate-200">
              <th className="w-10 p-2 text-center border-r border-slate-200 bg-slate-50"><Checkbox checked={allSelected} indeterminate={indeterminate} onChange={onSelectAll} /></th>
              <th className="w-12 p-2 text-center border-r border-slate-200 bg-slate-50 text-xs text-slate-400 font-normal select-none">#</th>
              
              {visibleColumns.map((col, index) => (
                <th 
                  key={col.id} 
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group p-0 border-r border-slate-200 bg-slate-50 min-w-[160px] relative cursor-move transition-colors ${dragOverIndex === index ? 'bg-blue-50' : ''}`}
                >
                  {dragOverIndex === index && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 z-30 pointer-events-none"></div>}
                  <div className={`flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-100 transition-colors ${dragOverIndex === index ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 pointer-events-none">
                        {getColumnIcon(col.type)}
                        <span className="text-slate-700 font-medium text-xs uppercase tracking-wide truncate max-w-[100px]">{col.label}</span>
                    </div>
                    <div onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }} draggable={false}>
                        <Dropdown menu={{ items: getColumnMenu(col) }} trigger={['click']} placement="bottomRight">
                            <Button type="text" size="small" className="flex items-center justify-center text-slate-400 hover:text-slate-600" icon={<MoreHorizontal size={14} />} />
                        </Dropdown>
                    </div>
                  </div>
                </th>
              ))}
              
              <th 
                className={`w-10 p-0 border-r border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer align-middle relative ${dragOverIndex === visibleColumns.length ? 'bg-blue-50' : ''}`}
                onDragOver={(e) => handleDragOver(e, visibleColumns.length)}
                onDrop={(e) => handleDrop(e, visibleColumns.length)}
              >
                  {dragOverIndex === visibleColumns.length && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 z-30 pointer-events-none"></div>}
                  <button onClick={onAddColumn} className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 py-2.5" title="添加列"><Plus size={16} /></button>
              </th>
              <th className="w-12 border-b border-slate-200 bg-slate-50"></th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100">
              {!groupBy ? renderRows(rows) : groupedData?.map(([key, groupRows]) => (
                  <React.Fragment key={key}>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={visibleColumns.length + 4} className="px-4 py-2">
                              <div className="flex items-center gap-2 font-medium text-slate-700 text-xs">
                                  <ChevronDown size={14} />
                                  <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{columns.find(c => c.id === groupBy)?.label}: {key}</span>
                                  <span className="text-slate-400">({groupRows.length})</span>
                              </div>
                          </td>
                      </tr>
                      {renderRows(groupRows)}
                  </React.Fragment>
              ))}
          </tbody>
        </table>
        {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p>暂无数据。</p>
            <button onClick={onAddRow} className="mt-2 text-blue-600 hover:underline">添加一行</button>
            </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 p-3 bg-white border-t border-slate-200 flex items-center justify-between z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {selectedRowIds.size > 0 ? (
            <div className="flex items-center gap-3 w-full animate-in slide-in-from-bottom-2 duration-200">
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium border border-indigo-100 flex items-center gap-2">
                    <CheckSquare size={14} /> 已选择 {selectedRowIds.size} 行
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <Button danger type="primary" icon={<Trash2 size={16} />} onClick={onDeleteSelected}>删除选中</Button>
                <Button type="text" icon={<X size={16} />} onClick={onSelectAll} className="text-slate-500">取消选择</Button>
            </div>
        ) : (
            <div className="flex items-center justify-between w-full animate-in slide-in-from-bottom-2 duration-200">
                <Button type="primary" icon={<Plus size={16} />} onClick={onAddRow} className="shadow-sm">添加新行</Button>
                <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">{rows.length} 条记录</span>
            </div>
        )}
      </div>
    </div>
  );
};

interface CellRendererProps {
    row: RowData;
    col: Column;
    onChange: (rowId: string, colId: string, value: any) => void;
}

const CellRenderer: React.FC<CellRendererProps> = ({ row, col, onChange }) => {
    const value = row[col.id];
    switch (col.type) {
        case 'select':
            return (
                <Select
                    variant="borderless"
                    value={value || null}
                    onChange={(val) => onChange(row.id, col.id, val)}
                    style={{ width: '100%' }}
                    placeholder="请选择..."
                    className="w-full"
                    options={col.options?.map(opt => ({ 
                        value: opt.label, 
                        label: <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`} /><span>{opt.label}</span></div>
                    }))}
                    tagRender={(props) => {
                         const opt = col.options?.find(o => o.label === props.value);
                         return <span className={`mr-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt?.color || 'bg-slate-100 text-slate-700'}`}>{props.label}</span>
                    }}
                />
            );
        case 'checkbox':
            return (
                <div className="w-full h-full flex items-center justify-center py-2">
                    <Checkbox checked={!!value} onChange={(e) => onChange(row.id, col.id, e.target.checked)} />
                </div>
            );
        case 'rating':
            return <div className="w-full h-full flex items-center px-3 py-1.5"><Rate count={5} value={Number(value) || 0} onChange={(val) => onChange(row.id, col.id, val)} style={{ fontSize: 14, color: '#eab308' }} /></div>;
        case 'url':
            return (
                 <div className="relative w-full h-full group">
                    <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="https://" className="w-full text-sm" />
                    {value && <a href={value} target="_blank" rel="noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><LinkIcon size={12} /></a>}
                 </div>
            );
        case 'person':
            return (
                <div className="w-full h-full px-2 py-1 flex items-center gap-2">
                    {value && <Avatar size={20} style={{ backgroundColor: '#8b5cf6' }}>{String(value)[0]}</Avatar>}
                    <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="人员姓名" className="flex-1 text-sm p-0" />
                </div>
            );
        case 'email':
             return (
                <div className="relative w-full h-full group flex items-center">
                     <Mail size={14} className="text-slate-300 ml-2 shrink-0" />
                     <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="user@example.com" className="w-full text-sm" />
                </div>
             );
        case 'phone':
             return (
                <div className="relative w-full h-full group flex items-center">
                     <Phone size={14} className="text-slate-300 ml-2 shrink-0" />
                     <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="123-4567-8900" className="w-full text-sm" />
                </div>
             );
        case 'location':
             return (
                <div className="relative w-full h-full group flex items-center">
                     <MapPin size={14} className="text-slate-300 ml-2 shrink-0" />
                     <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="输入地址" className="w-full text-sm" />
                </div>
             );
        case 'date':
             const dateValue = value ? dayjs(value) : null;
            return <DatePicker variant="borderless" value={dateValue} onChange={(_, dateString) => onChange(row.id, col.id, dateString)} style={{ width: '100%' }} allowClear={false} format="YYYY-MM-DD" placeholder="选择日期" />;
        case 'number':
            return <Input type="number" variant="borderless" className="text-right font-mono text-sm" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="0" />;
        case 'image':
             return (
                <div className="relative w-full h-full flex items-center px-2 gap-2 group">
                     {value ? <img src={value} alt="" className="w-6 h-6 rounded object-cover border border-slate-200 bg-slate-50" /> : <ImageIcon size={16} className="text-slate-300" />}
                     <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="图片链接..." className="w-full text-sm p-0" />
                </div>
             );
        case 'file':
             return (
                <div className="relative w-full h-full flex items-center px-2 gap-2 group">
                     <FileText size={16} className="text-slate-300" />
                     <Input variant="borderless" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} placeholder="文件名称/链接" className="w-full text-sm p-0" />
                </div>
             );
        default:
            return <Input variant="borderless" className="text-sm" value={value || ''} onChange={(e) => onChange(row.id, col.id, e.target.value)} />;
    }
}

export default Spreadsheet;