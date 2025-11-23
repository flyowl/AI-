
import React, { useRef, useMemo } from 'react';
import { Column, RowData, Filter, SortRule, RowHeight, FilterMatchType, FilterOperator } from '../types';
import { 
  Hash, Type, Calendar, CheckSquare, 
  List, Link as LinkIcon, Star, MoreHorizontal,
  ArrowUpAz, ArrowDownZa, Settings, Copy, X,
  ArrowUpDown, Plus, ChevronRight, ChevronDown,
  User, Phone, Mail, MapPin, Image as ImageIcon, FileText, Upload
} from 'lucide-react';
import { Dropdown, MenuProps, Button, Input, Select, DatePicker, Checkbox, Rate, Popover, Avatar, InputNumber, Image } from 'antd';
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

const Spreadsheet: React.FC<SpreadsheetProps> = ({
  columns, rows, selectedRowIds, sortRule, rowHeight, hiddenColumnIds, groupBy,
  onCellChange, onSelectRow, onSelectAll, onSortColumn, onDeleteColumn, onEditColumn, onDuplicateColumn, onAddRow, onAddColumn
}) => {
  
  // --- Grouping Logic ---
  const groupedRows = useMemo(() => {
      if (!groupBy) return { 'all': rows };

      const groups: Record<string, RowData[]> = {};
      const groupCol = columns.find(c => c.id === groupBy);

      // Initialize groups if it's a select column to preserve order/color
      if (groupCol?.type === 'select' && groupCol.options) {
          groupCol.options.forEach(opt => {
              groups[opt.label] = [];
          });
      }
      groups['未分组'] = []; // Catch-all

      rows.forEach(row => {
          const val = row[groupBy];
          const key = val ? String(val) : '未分组';
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
      });

      return groups;
  }, [rows, groupBy, columns]);


  // --- Header Renderers ---
  const renderHeader = (col: Column) => {
    const menuItems: MenuProps['items'] = [
        {
            key: 'sort-asc',
            label: '升序排列',
            icon: <ArrowUpAz size={14}/>,
            onClick: () => onSortColumn(col.id, 'asc')
        },
        {
            key: 'sort-desc',
            label: '降序排列',
            icon: <ArrowDownZa size={14}/>,
            onClick: () => onSortColumn(col.id, 'desc')
        },
        { type: 'divider' },
        {
            key: 'edit',
            label: '编辑列',
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
            key: 'delete',
            label: '删除列',
            icon: <X size={14}/>,
            danger: true,
            onClick: () => onDeleteColumn(col.id)
        }
    ];

    return (
        <div className="flex items-center justify-between h-full px-3 py-2 group select-none">
            <div className="flex items-center gap-2 overflow-hidden">
                {getColumnIcon(col.type)}
                <span className="text-xs font-semibold text-slate-600 truncate">{col.label}</span>
            </div>
            <div className="flex items-center">
                 {sortRule?.columnId === col.id && (
                     <div className="mr-1 text-indigo-500 bg-indigo-50 p-0.5 rounded">
                         {sortRule.direction === 'asc' ? <ArrowUpAz size={12}/> : <ArrowDownZa size={12}/>}
                     </div>
                 )}
                 <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                     <Button 
                        type="text" 
                        size="small" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0 w-6 h-6 min-w-0 flex items-center justify-center text-slate-400 hover:text-slate-600"
                     >
                         <ArrowUpDown size={12} />
                     </Button>
                 </Dropdown>
            </div>
        </div>
    );
  };

  // --- Cell Renderers ---
  const renderCell = (row: RowData, col: Column) => {
      const value = row[col.id];
      const onChange = (val: any) => onCellChange(row.id, col.id, val);

      switch (col.type) {
          case 'text':
          case 'url':
          case 'email':
          case 'phone':
          case 'location':
              return (
                  <Input 
                      bordered={false} 
                      value={value} 
                      onChange={e => onChange(e.target.value)} 
                      className="w-full h-full text-xs px-3"
                      placeholder={col.type === 'url' ? 'https://...' : ''}
                  />
              );
          case 'number':
              return (
                  <InputNumber 
                      bordered={false}
                      value={value}
                      onChange={val => onChange(val)}
                      className="w-full h-full text-xs input-number-no-border"
                      controls={false}
                  />
              );
          case 'select':
              const selectedOpt = col.options?.find(o => o.label === value);
              return (
                  <Select
                      bordered={false}
                      value={value}
                      onChange={onChange}
                      className="w-full text-xs"
                      options={col.options?.map(o => ({ value: o.label, label: o.label }))}
                      dropdownStyle={{ minWidth: 120 }}
                      tagRender={(props) => (
                           <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${col.options?.find(o => o.label === props.value)?.color || 'bg-slate-100 text-slate-700'}`}>
                               {props.label}
                           </span>
                      )}
                  />
              );
          case 'date':
              return (
                  <DatePicker 
                      bordered={false}
                      value={value ? dayjs(value) : null}
                      onChange={date => onChange(date ? date.format('YYYY-MM-DD') : '')}
                      className="w-full h-full text-xs"
                      suffixIcon={null}
                  />
              );
          case 'checkbox':
              return (
                  <div className="w-full h-full flex items-center justify-center">
                      <Checkbox checked={!!value} onChange={e => onChange(e.target.checked)} />
                  </div>
              );
          case 'rating':
              return (
                  <div className="w-full h-full flex items-center px-3">
                      <Rate count={5} value={Number(value)} onChange={onChange} style={{ fontSize: 12 }} />
                  </div>
              );
          case 'person':
              return (
                  <div className="w-full h-full flex items-center px-3 gap-2">
                      <Avatar size={20} className="bg-indigo-500 text-[10px]">{value ? String(value)[0].toUpperCase() : <User size={10}/>}</Avatar>
                      <Input 
                          bordered={false} 
                          value={value} 
                          onChange={e => onChange(e.target.value)} 
                          className="flex-1 text-xs p-0"
                      />
                  </div>
              );
          case 'image':
              return (
                <ImageCell value={value} onChange={onChange} />
              );
          default:
              return <span className="px-3 text-xs text-slate-400">{String(value ?? '')}</span>;
      }
  };

  const visibleColumns = columns.filter(c => !hiddenColumnIds.has(c.id));

  const rowHeightClass = {
      'small': 'h-8',
      'medium': 'h-10',
      'large': 'h-16',
      'extra-large': 'h-24'
  }[rowHeight];

  const renderRow = (row: RowData, idx: number) => (
        <tr key={row.id} className={`group hover:bg-slate-50/50 transition-colors ${selectedRowIds.has(row.id) ? 'bg-indigo-50/30' : ''}`}>
            <td className="border-r border-b border-slate-100 p-0 text-center relative bg-white text-slate-400 text-[10px] font-mono">
                <div className="absolute inset-0 flex items-center justify-center group-hover:hidden">
                    {idx + 1}
                </div>
                <div className="absolute inset-0 items-center justify-center hidden group-hover:flex bg-slate-50">
                    <Checkbox checked={selectedRowIds.has(row.id)} onChange={() => onSelectRow(row.id)}/>
                </div>
            </td>
            {visibleColumns.map(col => (
                <td key={col.id} className={`border-r border-b border-slate-100 p-0 relative ${rowHeightClass}`}>
                    {renderCell(row, col)}
                </td>
            ))}
            <td className="border-b border-slate-100 p-0"></td>
        </tr>
  );

  return (
    <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white relative">
      <table className="w-full border-collapse table-fixed min-w-[800px]">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
          <tr>
            <th className="w-10 border-r border-b border-slate-200 p-0 bg-slate-50">
                <div className="flex items-center justify-center h-full">
                    <Checkbox 
                        checked={rows.length > 0 && selectedRowIds.size === rows.length} 
                        indeterminate={selectedRowIds.size > 0 && selectedRowIds.size < rows.length}
                        onChange={onSelectAll}
                    />
                </div>
            </th>
            {visibleColumns.map(col => (
                <th key={col.id} className="border-r border-b border-slate-200 p-0 text-left relative" style={{ width: col.width || 150 }}>
                    {renderHeader(col)}
                </th>
            ))}
            <th className="w-12 border-b border-slate-200 bg-slate-50 p-0">
                <button 
                    onClick={onAddColumn}
                    className="w-full h-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="添加新列"
                >
                    <Plus size={16} />
                </button>
            </th>
          </tr>
        </thead>
        <tbody>
            {/* Grouped Rendering */}
            {groupBy ? (
                Object.entries(groupedRows).map(([groupValue, groupRows]) => {
                    const groupCol = columns.find(c => c.id === groupBy);
                    const option = groupCol?.options?.find(o => o.label === groupValue);
                    const colorClass = option?.color || 'bg-slate-100 text-slate-700';
                    
                    return (
                        <React.Fragment key={groupValue}>
                            <tr className="bg-slate-50/80">
                                <td colSpan={visibleColumns.length + 2} className="px-2 py-1.5 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown size={14} className="text-slate-400" />
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md border border-transparent ${colorClass}`}>
                                            {groupValue}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-1">{groupRows.length} 项</span>
                                    </div>
                                </td>
                            </tr>
                            {groupRows.map((row, idx) => renderRow(row, idx))}
                        </React.Fragment>
                    )
                })
            ) : (
                rows.map((row, idx) => renderRow(row, idx))
            )}

            {/* Add Row Button at Bottom */}
            <tr>
                <td className="border-r border-b border-slate-100 bg-slate-50/30"></td>
                <td colSpan={visibleColumns.length + 1} className="border-b border-slate-100 p-0">
                    <button 
                        onClick={onAddRow}
                        className="w-full py-2 flex items-center gap-2 px-3 text-sm text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors text-left group"
                    >
                        <Plus size={16} className="group-hover:scale-110 transition-transform"/>
                        新建行
                    </button>
                </td>
            </tr>
        </tbody>
      </table>
    </div>
  );
};

// Refined Image Cell with Preview
const ImageCell: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative group w-full h-full flex items-center justify-center bg-slate-50/20 transition-all hover:bg-slate-50/50">
            {value ? (
                <div className="w-full h-full p-1 flex items-center justify-center">
                    <Image 
                        src={value} 
                        className="object-cover rounded-sm border border-slate-200" 
                        style={{ width: '100%', height: '100%', maxHeight: 80, objectFit: 'cover' }}
                        alt="Cell"
                        preview={{
                            mask: <span className="text-xs flex flex-col items-center gap-1"><ImageIcon size={14}/> 预览</span>
                        }}
                    />
                </div>
            ) : (
                <span className="text-slate-300 opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none">
                    <ImageIcon size={16}/>
                </span>
            )}
            
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
            />
            
            {/* Controls */}
            <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 ${value ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-10`}>
                <button 
                    className="p-1 bg-white shadow-md rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    title="上传图片"
                >
                    <Upload size={12} />
                </button>
                {value && (
                     <button 
                        className="p-1 bg-white shadow-md rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        title="清除"
                     >
                        <X size={12} />
                     </button>
                )}
            </div>
        </div>
    );
};

export default Spreadsheet;
