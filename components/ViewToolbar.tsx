
import React, { useState } from 'react';
import { Button, Popover, Select, Input, Divider, Badge, Tooltip, Switch, Dropdown } from 'antd';
import { Filter as FilterIcon, ArrowUpDown, Layers, Eye, ChevronDown, Plus, Trash2, X, Search, Settings2, ArrowUpAz, ArrowDownZa } from 'lucide-react';
import { View, Column, Filter, SortRule, RowHeight, FilterOperator, FilterMatchType } from '../types';
import dayjs from 'dayjs';

interface ViewToolbarProps {
  view: View;
  columns: Column[];
  onUpdateConfig: (updates: Partial<View['config']>) => void;
  onSearch?: (term: string) => void;
}

const ViewToolbar: React.FC<ViewToolbarProps> = ({ view, columns, onUpdateConfig, onSearch }) => {
  const { filters, filterMatchType, sortRule, groupBy, hiddenColumnIds, rowHeight } = view.config;

  // --- Filter Logic ---
  const handleAddFilter = () => {
    const firstCol = columns[0];
    const newFilter: Filter = {
      id: crypto.randomUUID(),
      columnId: firstCol.id,
      operator: 'contains',
      value: ''
    };
    onUpdateConfig({ filters: [...filters, newFilter] });
  };

  const handleRemoveFilter = (id: string) => {
    onUpdateConfig({ filters: filters.filter(f => f.id !== id) });
  };

  const handleUpdateFilter = (id: string, updates: Partial<Filter>) => {
    onUpdateConfig({
      filters: filters.map(f => {
          if (f.id !== id) return f;
          // If column changes, reset operator and value defaults
          if (updates.columnId && updates.columnId !== f.columnId) {
              const newCol = columns.find(c => c.id === updates.columnId);
              return { ...f, ...updates, operator: newCol?.type === 'number' ? 'equals' : 'contains', value: '' };
          }
          return { ...f, ...updates };
      })
    });
  };

  const getOperators = (colId: string): { label: string; value: FilterOperator }[] => {
    const col = columns.find(c => c.id === colId);
    if (!col) return [];
    
    const base = [
        { label: '为空', value: 'isEmpty' as FilterOperator },
        { label: '不为空', value: 'isNotEmpty' as FilterOperator },
    ];

    if (col.type === 'number' || col.type === 'rating') {
        return [
            { label: '=', value: 'equals' },
            { label: '>', value: 'gt' },
            { label: '<', value: 'lt' },
            { label: '>=', value: 'gte' },
            { label: '<=', value: 'lte' },
            ...base
        ];
    }
    if (col.type === 'date') {
        return [
            { label: '是', value: 'isSame' },
            { label: '早于', value: 'isBefore' },
            { label: '晚于', value: 'isAfter' },
            ...base
        ];
    }
    if (col.type === 'checkbox') {
        return [
             { label: '是', value: 'equals' },
             ...base
        ];
    }
    return [
        { label: '包含', value: 'contains' },
        { label: '不包含', value: 'doesNotContain' },
        { label: '等于', value: 'equals' },
        ...base
    ];
  };

  const renderFilterContent = () => (
    <div className="w-[500px] p-2">
        {filters.length === 0 ? (
            <div className="text-slate-400 text-center py-6 text-sm">
                暂无筛选条件
            </div>
        ) : (
            <div className="space-y-3 mb-4">
                 {filters.length > 1 && (
                     <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                         符合以下
                         <Select 
                            size="small" 
                            value={filterMatchType} 
                            onChange={(val) => onUpdateConfig({ filterMatchType: val })}
                            options={[{ label: '所有 (AND)', value: 'and' }, { label: '任一 (OR)', value: 'or' }]}
                            className="w-24"
                         />
                         条件:
                     </div>
                 )}
                 {filters.map((filter, idx) => (
                     <div key={filter.id} className="flex items-center gap-2">
                         {idx > 0 && <span className="text-xs w-8 text-center text-slate-400 uppercase">{filterMatchType}</span>}
                         <Select 
                            value={filter.columnId}
                            onChange={val => handleUpdateFilter(filter.id, { columnId: val })}
                            options={columns.map(c => ({ label: c.label, value: c.id }))}
                            className="w-32"
                         />
                         <Select 
                            value={filter.operator}
                            onChange={val => handleUpdateFilter(filter.id, { operator: val })}
                            options={getOperators(filter.columnId)}
                            className="w-28"
                         />
                         {filter.operator !== 'isEmpty' && filter.operator !== 'isNotEmpty' && (
                             <div className="flex-1">
                                 <FilterValueInput 
                                    filter={filter} 
                                    column={columns.find(c => c.id === filter.columnId)!} 
                                    onChange={val => handleUpdateFilter(filter.id, { value: val })} 
                                 />
                             </div>
                         )}
                         <Button type="text" size="small" icon={<Trash2 size={14}/>} onClick={() => handleRemoveFilter(filter.id)} className="text-slate-400 hover:text-red-500"/>
                     </div>
                 ))}
            </div>
        )}
        <Button type="dashed" block icon={<Plus size={14}/>} onClick={handleAddFilter}>添加筛选</Button>
    </div>
  );

  // --- Sort Logic ---
  const renderSortContent = () => (
      <div className="w-72 p-2">
          {sortRule ? (
              <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-xs text-slate-500 whitespace-nowrap">排序依据</span>
                  <Select 
                    value={sortRule.columnId}
                    onChange={(val) => onUpdateConfig({ sortRule: { ...sortRule, columnId: val } })}
                    options={columns.map(c => ({ label: c.label, value: c.id }))}
                    className="flex-1"
                    size="small"
                    variant="borderless"
                  />
                  <div className="flex bg-white rounded border border-slate-200 p-0.5">
                      <Tooltip title="升序">
                        <div 
                            className={`p-1 rounded cursor-pointer ${sortRule.direction === 'asc' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            onClick={() => onUpdateConfig({ sortRule: { ...sortRule, direction: 'asc' } })}
                        >
                            <ArrowUpAz size={14} />
                        </div>
                      </Tooltip>
                      <Tooltip title="降序">
                        <div 
                            className={`p-1 rounded cursor-pointer ${sortRule.direction === 'desc' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            onClick={() => onUpdateConfig({ sortRule: { ...sortRule, direction: 'desc' } })}
                        >
                            <ArrowDownZa size={14} />
                        </div>
                      </Tooltip>
                  </div>
                  <Button type="text" size="small" icon={<X size={12}/>} onClick={() => onUpdateConfig({ sortRule: null })} />
              </div>
          ) : (
            <div className="text-slate-400 text-center py-4 text-xs">暂无排序规则</div>
          )}
          <div className="text-xs text-slate-500 mb-2 font-medium">添加排序</div>
          <div className="grid grid-cols-2 gap-1">
             {columns.map(col => (
                 <div 
                    key={col.id} 
                    className="px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded text-xs flex items-center gap-2 text-slate-700"
                    onClick={() => onUpdateConfig({ sortRule: { columnId: col.id, direction: 'asc' } })}
                 >
                     {col.label}
                 </div>
             ))}
          </div>
      </div>
  );

  // --- Group Logic ---
  const renderGroupContent = () => (
      <div className="w-64 p-2">
          <div className="text-xs font-medium text-slate-500 mb-2">分组依据</div>
          {groupBy && (
              <div className="flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded mb-2 text-sm">
                  <span>{columns.find(c => c.id === groupBy)?.label}</span>
                  <X size={14} className="cursor-pointer hover:text-indigo-900" onClick={() => onUpdateConfig({ groupBy: null })}/>
              </div>
          )}
          <div className="max-h-60 overflow-y-auto">
              {columns.filter(c => c.type === 'select' || c.type === 'checkbox' || c.type === 'text').map(col => (
                  <div 
                    key={col.id}
                    className={`px-3 py-2 hover:bg-slate-50 cursor-pointer rounded text-sm flex items-center justify-between ${groupBy === col.id ? 'bg-slate-50 font-medium' : ''}`}
                    onClick={() => onUpdateConfig({ groupBy: col.id })}
                  >
                      {col.label}
                      {groupBy === col.id && <Settings2 size={14} className="text-indigo-500"/>}
                  </div>
              ))}
              {columns.filter(c => c.type === 'select' || c.type === 'checkbox' || c.type === 'text').length === 0 && (
                  <div className="text-xs text-slate-400 p-2">无可分组列 (需选项或文本类型)</div>
              )}
          </div>
      </div>
  );

  // --- Hidden Columns Logic ---
  const renderHiddenContent = () => (
      <div className="w-64 p-2">
          <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-xs font-medium text-slate-500">显示/隐藏列</span>
             <Button size="small" type="link" onClick={() => onUpdateConfig({ hiddenColumnIds: [] })}>显示全部</Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
              {columns.map(col => {
                  const isHidden = hiddenColumnIds.includes(col.id);
                  return (
                      <div key={col.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded">
                          <span className="text-sm text-slate-700">{col.label}</span>
                          <Switch 
                             size="small" 
                             checked={!isHidden} 
                             onChange={(checked) => {
                                 if (checked) {
                                     onUpdateConfig({ hiddenColumnIds: hiddenColumnIds.filter(id => id !== col.id) });
                                 } else {
                                     onUpdateConfig({ hiddenColumnIds: [...hiddenColumnIds, col.id] });
                                 }
                             }}
                          />
                      </div>
                  );
              })}
          </div>
      </div>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap pb-1">
        <Popover trigger="click" placement="bottomLeft" content={renderFilterContent()}>
            <Button icon={<FilterIcon size={14}/>} className={filters.length > 0 ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600'}>
                筛选 
                {filters.length > 0 && <span className="ml-1 bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{filters.length}</span>}
            </Button>
        </Popover>

        <Popover trigger="click" placement="bottomLeft" content={renderSortContent()}>
            <Button icon={<ArrowUpDown size={14}/>} className={sortRule ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600'}>
                排序
                {sortRule && <span className="ml-1 text-xs opacity-75">1</span>}
            </Button>
        </Popover>

        <Popover trigger="click" placement="bottomLeft" content={renderGroupContent()}>
             <Button icon={<Layers size={14}/>} className={groupBy ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600'}>
                分组
                {groupBy && <span className="ml-1 text-xs opacity-75">: {columns.find(c => c.id === groupBy)?.label}</span>}
            </Button>
        </Popover>

        <Divider type="vertical" className="h-6" />

        <Popover trigger="click" placement="bottomLeft" content={renderHiddenContent()}>
             <Button icon={<Eye size={14}/>} type="text" className={hiddenColumnIds.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}>
                {hiddenColumnIds.length > 0 ? `已隐藏 ${hiddenColumnIds.length} 列` : '隐藏列'}
             </Button>
        </Popover>

        <Dropdown
            menu={{
                items: [
                    { key: 'small', label: '紧凑', onClick: () => onUpdateConfig({ rowHeight: 'small' }) },
                    { key: 'medium', label: '标准', onClick: () => onUpdateConfig({ rowHeight: 'medium' }) },
                    { key: 'large', label: '宽松', onClick: () => onUpdateConfig({ rowHeight: 'large' }) },
                    { key: 'extra-large', label: '超大', onClick: () => onUpdateConfig({ rowHeight: 'extra-large' }) },
                ],
                selectedKeys: [rowHeight]
            }}
        >
             <Button icon={<Settings2 size={14}/>} type="text" className="text-slate-600">
                 行高
             </Button>
        </Dropdown>

        <div className="flex-1" />
        
        {/* Optional Search Input */}
        <div className="relative w-48">
             <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
             <Input 
                placeholder="搜索..." 
                className="rounded-full pl-8 text-xs py-1 bg-slate-100 border-transparent hover:bg-white focus:bg-white focus:border-indigo-500" 
                onChange={(e) => onSearch && onSearch(e.target.value)}
             />
        </div>
    </div>
  );
};

const FilterValueInput: React.FC<{ filter: Filter, column: Column, onChange: (val: any) => void }> = ({ filter, column, onChange }) => {
    if (column.type === 'select') {
        return (
            <Select
                value={filter.value}
                onChange={onChange}
                className="w-full"
                placeholder="选择值"
                options={column.options?.map(o => ({ label: o.label, value: o.label }))}
            />
        );
    }
    if (column.type === 'checkbox') {
         return (
             <Select
                 value={String(filter.value)}
                 onChange={val => onChange(val === 'true')}
                 className="w-full"
                 options={[{ label: '已选中', value: 'true' }, { label: '未选中', value: 'false' }]}
             />
         )
    }
    if (column.type === 'date') {
         // Simplified date input for filter
         return <Input type="date" value={filter.value} onChange={e => onChange(e.target.value)} className="w-full" />
    }
    return <Input value={filter.value} onChange={e => onChange(e.target.value)} placeholder="输入值..." className="w-full" />;
}

export default ViewToolbar;
