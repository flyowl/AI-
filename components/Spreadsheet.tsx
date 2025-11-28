import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Column, RowData, SortRule, RowHeight, Sheet } from '../types';
import { 
  Hash, Type, Calendar, CheckSquare, 
  List as ListIcon, Link as LinkIcon, Star,
  ToggleLeft, Plus, ChevronRight, ChevronDown,
  User, Phone, Mail, MapPin, Image as ImageIcon, FileText, Upload, Maximize2, ArrowLeftRight, Tags,
  X, Copy, Trash2, Clipboard, Scissors
} from 'lucide-react';
import { Select, DatePicker, Checkbox, Rate, Image as AntImage, Tooltip, Avatar, InputNumber, Switch, Input, message } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

dayjs.locale('zh-cn');

interface ListChildComponentProps<T = any> {
  index: number;
  style: React.CSSProperties;
  data: T;
  isScrolling?: boolean;
}

interface SpreadsheetProps {
  columns: Column[];
  rows: RowData[];
  selectedRowIds: Set<string>;
  filters: any[]; 
  filterMatchType: any;
  sortRule: SortRule | null;
  groupBy: string | null;
  rowHeight: RowHeight;
  hiddenColumnIds: Set<string>;
  allSheets: Sheet[]; 
  
  onCellChange: (rowId: string, colId: string, value: any) => void;
  onCellsChange?: (updates: {rowId: string, colId: string, value: any}[]) => void; // New prop for batch updates
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
  onOpenRowDetail?: (rowId: string) => void;

  // New Prop for Paste
  onPaste?: (data: string[][], targetRowId: string | null, targetColId: string | null, pasteRange?: { rowIds: string[], colIds: string[] }) => void;

  // State updaters
  onFiltersChange: (filters: any[]) => void;
  onFilterMatchTypeChange: (type: any) => void;
  onSortRuleChange: (rule: SortRule | null) => void;
  onGroupByChange: (colId: string | null) => void;
  onRowHeightChange: (height: RowHeight) => void;
  onHiddenColumnIdsChange: (ids: Set<string>) => void;
}

const getColumnIcon = (type: string) => {
  switch (type) {
    case 'number': return <Hash size={14} className="text-orange-500" />;
    case 'date': return <Calendar size={14} className="text-pink-500" />;
    case 'select': return <ListIcon size={14} className="text-blue-500" />;
    case 'multiSelect': return <Tags size={14} className="text-blue-600" />;
    case 'checkbox': return <CheckSquare size={14} className="text-green-500" />;
    case 'switch': return <ToggleLeft size={14} className="text-emerald-500" />;
    case 'url': return <LinkIcon size={14} className="text-sky-500" />;
    case 'rating': return <Star size={14} className="text-yellow-500" />;
    case 'person': return <User size={14} className="text-purple-500" />;
    case 'email': return <Mail size={14} className="text-red-400" />;
    case 'phone': return <Phone size={14} className="text-teal-500" />;
    case 'location': return <MapPin size={14} className="text-rose-500" />;
    case 'image': return <ImageIcon size={14} className="text-indigo-500" />;
    case 'file': return <FileText size={14} className="text-slate-500" />;
    case 'relation': return <ArrowLeftRight size={14} className="text-cyan-600" />;
    default: return <Type size={14} className="text-slate-400" />;
  }
};

// Flattened Item Types for Virtual List
type VirtualItem = 
  | { type: 'row'; data: RowData; index: number }
  | { type: 'group'; value: string; count: number; isCollapsed: boolean }
  | { type: 'add-row' };

interface ItemData {
    flatData: VirtualItem[];
    columns: Column[];
    visibleColumns: Column[];
    selectedRowIds: Set<string>;
    selectedCellIds: Set<string>;
    groupBy: string | null;
    totalWidth: number;
    onCellChange: (rowId: string, colId: string, value: any) => void;
    onSelectRow: (id: string) => void;
    onAddRow: () => void;
    toggleGroup: (groupKey: string) => void;
    onOpenRowDetail?: (rowId: string) => void;
    getColWidth: (col: Column) => number;
    allSheets: Sheet[];
    onCellMouseDown: (rowId: string, colId: string, rowIndex: number, colIndex: number, e: React.MouseEvent) => void;
    onCellMouseEnter: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void;
    onCellContextMenu: (rowId: string, colId: string, e: React.MouseEvent) => void;
}

// Editable Text Cell Component to prevent focus loss
const EditableTextCell = ({ value, onChange, placeholder, isSelected }: { value: any, onChange: (val: any) => void, placeholder?: string, isSelected: boolean }) => {
    const [localValue, setLocalValue] = useState(value);
    
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <Input 
            bordered={false} 
            value={localValue} 
            onChange={e => setLocalValue(e.target.value)} 
            onBlur={() => {
                if (localValue !== value) onChange(localValue);
            }}
            onPressEnter={(e) => {
                e.currentTarget.blur();
            }}
            className={`w-full h-full text-xs px-3 rounded-none ${isSelected ? 'bg-transparent' : ''}`}
            placeholder={placeholder}
        />
    );
};

// Refined Image Cell with Preview
const ImageCell: React.FC<{ value: any, onChange: (val: any) => void }> = ({ value, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ImageComponent = AntImage as any;

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
                    <ImageComponent 
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

// Render Cell Logic (Extracted)
const renderCell = (row: RowData, col: Column, isRowSelected: boolean, isCellSelected: boolean, onCellChange: (r: string, c: string, v: any) => void, allSheets: Sheet[]) => {
      const value = row[col.id];
      const onChange = (val: any) => onCellChange(row.id, col.id, val);
      const bgClass = (isRowSelected || isCellSelected) ? 'bg-transparent' : ''; 

      switch (col.type) {
          case 'text':
          case 'url':
          case 'email':
          case 'phone':
          case 'location':
              return (
                  <EditableTextCell 
                      value={value} 
                      onChange={onChange} 
                      isSelected={isRowSelected || isCellSelected}
                      placeholder={col.type === 'url' ? 'https://...' : ''}
                  />
              );
          case 'number':
              return (
                  <InputNumber 
                      bordered={false}
                      value={value}
                      onChange={val => onChange(val)}
                      className={`w-full h-full text-xs input-number-no-border rounded-none ${bgClass}`}
                      controls={false}
                  />
              );
          case 'select':
              return (
                  <Select
                      bordered={false}
                      value={value}
                      onChange={onChange}
                      className={`w-full text-xs ${bgClass} select-cell-single h-full flex items-center`}
                      options={col.options?.map(o => ({ 
                          value: o.label, 
                          label: (
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${o.color || 'bg-slate-100 text-slate-700'}`}>
                                  {o.label}
                              </span>
                          ) 
                      }))}
                      dropdownStyle={{ minWidth: 120 }}
                      dropdownMatchSelectWidth={false}
                  />
              );
          case 'multiSelect':
              return (
                  <div className="w-full h-full px-1 py-0.5 overflow-hidden">
                    <Select
                        mode="multiple"
                        bordered={false}
                        value={Array.isArray(value) ? value : []}
                        onChange={onChange}
                        className={`w-full text-xs ${bgClass}`}
                        options={col.options?.map(o => ({ value: o.label, label: o.label }))}
                        dropdownStyle={{ minWidth: 120 }}
                        dropdownMatchSelectWidth={false}
                        maxTagCount="responsive"
                        showArrow={false}
                        tagRender={(props) => {
                            const opt = col.options?.find(o => o.label === props.value);
                            return (
                                <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-transparent inline-flex items-center my-0.5 ${opt?.color || 'bg-slate-100 text-slate-700'}`}>
                                    {props.label}
                                </span>
                            );
                        }}
                    />
                  </div>
              );
          case 'relation':
              const targetSheetId = col.relationConfig?.targetSheetId;
              const targetSheet = allSheets.find(s => s.id === targetSheetId);
              if (!targetSheet) return <span className="px-3 text-xs text-red-300 flex items-center h-full">关联失效</span>;
              
              const displayCol = targetSheet.columns.find(c => c.type === 'text') || targetSheet.columns[0];
              const relationOptions = targetSheet.rows.map(r => ({ value: r.id, label: r[displayCol.id] || '未命名行' }));

              return (
                  <div className="w-full h-full px-1 py-0.5 overflow-hidden">
                    <Select
                        mode="multiple"
                        bordered={false}
                        value={Array.isArray(value) ? value : []}
                        onChange={onChange}
                        className={`w-full text-xs ${bgClass} relation-select`}
                        placeholder="关联..."
                        options={relationOptions}
                        maxTagCount="responsive"
                        showSearch
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        dropdownStyle={{ minWidth: 160 }}
                        dropdownMatchSelectWidth={false}
                    />
                  </div>
              );
          case 'date':
              return (
                  <DatePicker 
                      bordered={false}
                      value={value ? dayjs(value) : null}
                      onChange={date => onChange(date ? date.format('YYYY-MM-DD') : '')}
                      className={`w-full h-full text-xs rounded-none ${bgClass}`}
                      suffixIcon={null}
                  />
              );
          case 'checkbox':
              return (
                  <div className="w-full h-full flex items-center justify-center">
                      <Checkbox checked={!!value} onChange={e => onChange(e.target.checked)} />
                  </div>
              );
          case 'switch':
              return (
                  <div className="w-full h-full flex items-center justify-center">
                      <Switch size="small" checked={!!value} onChange={checked => onChange(checked)} />
                  </div>
              );
          case 'rating':
              return (
                  <div className="w-full h-full flex items-center px-3">
                      <Rate value={Number(value)} onChange={onChange} style={{ fontSize: 12 }} />
                  </div>
              );
          case 'person':
              return (
                  <div className="w-full h-full flex items-center px-3 gap-2">
                      <Avatar size={20} className="bg-indigo-500 text-[10px]">{value ? String(value)[0].toUpperCase() : <User size={10}/>}</Avatar>
                      <EditableTextCell 
                          value={value} 
                          onChange={onChange} 
                          isSelected={isRowSelected || isCellSelected}
                      />
                  </div>
              );
          case 'image':
              return <ImageCell value={value} onChange={onChange} />;
          default:
              const displayVal = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value ?? '');
              return <span className="px-3 text-xs text-slate-400 flex items-center h-full truncate" title={displayVal}>{displayVal}</span>;
      }
};

// Row Component (Extracted)
const Row = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
    const { 
        flatData, visibleColumns, columns, groupBy, totalWidth, 
        onCellChange, onSelectRow, onAddRow, toggleGroup, onOpenRowDetail, getColWidth, allSheets, selectedRowIds, selectedCellIds, onCellMouseDown, onCellMouseEnter, onCellContextMenu
    } = data;
    const item = flatData[index];
    
    // Group Header
    if (item.type === 'group') {
        const groupCol = columns.find(c => c.id === groupBy);
        const option = groupCol?.options?.find(o => o.label === item.value);
        const colorClass = option?.color || 'bg-slate-100 text-slate-700';
        
        return (
            <div style={{ ...style, width: totalWidth < (style.width as number) ? style.width : totalWidth }} className="flex items-center px-2 bg-slate-50/80 border-b border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => toggleGroup(item.value)}>
                <div className="flex items-center justify-center w-6 h-6 mr-2 text-slate-400">
                      <ChevronRight size={14} className={`transition-transform duration-200 ${item.isCollapsed ? '' : 'rotate-90'}`}/>
                </div>
                <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md border border-transparent ${colorClass}`}>
                          {item.value}
                      </span>
                      <span className="text-xs text-slate-400">{item.count} 项</span>
                </div>
            </div>
        );
    }

    // Add Row Button
    if (item.type === 'add-row') {
          return (
              <div style={{ ...style, width: totalWidth < (style.width as number) ? style.width : totalWidth }} className="border-b border-slate-100 flex items-center bg-white">
                  <div className="w-10 border-r border-slate-100 h-full bg-slate-50/30"></div>
                  <button 
                      onClick={onAddRow}
                      className="flex-1 h-full flex items-center gap-2 px-3 text-sm text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors text-left group"
                  >
                      <Plus size={16} className="group-hover:scale-110 transition-transform"/>
                      新建行
                  </button>
              </div>
          )
    }

    // Data Row
    const row = item.data;
    const isRowSelected = selectedRowIds.has(row.id);
    
    return (
        <div 
            style={{ ...style, width: totalWidth < (style.width as number) ? style.width : totalWidth }} 
            className={`flex items-center border-b border-slate-100 group transition-colors ${isRowSelected ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50/50'}`}
        >
            {/* Checkbox Column */}
            <div className={`w-10 h-full border-r border-slate-100 flex items-center justify-center relative flex-shrink-0 ${isRowSelected ? 'bg-indigo-100/50' : 'bg-white'}`}>
                  <div className="absolute inset-0 flex items-center justify-center group-hover:hidden text-[10px] font-mono text-slate-400">
                      {isRowSelected ? <Checkbox checked={true} onChange={() => onSelectRow(row.id)}/> : (groupBy ? '' : item.index + 1)}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center hidden group-hover:flex bg-slate-50/50 backdrop-blur-[1px] gap-1 z-10">
                      <Checkbox checked={isRowSelected} onChange={() => onSelectRow(row.id)}/>
                      <Tooltip title="展开详情">
                          <div 
                              className="cursor-pointer text-slate-500 hover:text-indigo-600 bg-white rounded shadow-sm p-0.5 border border-slate-200 hover:border-indigo-300"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRowDetail && onOpenRowDetail(row.id);
                              }}
                          >
                              <Maximize2 size={10} />
                          </div>
                      </Tooltip>
                  </div>
            </div>

            {/* Data Columns */}
            {visibleColumns.map((col, colIndex) => {
                const cellKey = `${row.id}:${col.id}`;
                const isCellSelected = selectedCellIds.has(cellKey);
                return (
                    <div 
                        key={col.id} 
                        style={{ width: getColWidth(col) }} 
                        className={`h-full border-r border-slate-100 flex-shrink-0 relative ${
                            isCellSelected 
                            ? 'z-10 ring-1 ring-blue-400 ring-inset bg-blue-50/30' 
                            : ''
                        }`}
                        onMouseDown={(e) => onCellMouseDown(row.id, col.id, index, colIndex, e)}
                        onMouseEnter={() => onCellMouseEnter(row.id, col.id, index, colIndex)}
                        onContextMenu={(e) => onCellContextMenu(row.id, col.id, e)}
                    >
                        {renderCell(row, col, isRowSelected, isCellSelected, onCellChange, allSheets)}
                    </div>
                )
            })}
            
            <div className="flex-1 min-w-0" />
        </div>
    );
};

const Spreadsheet: React.FC<SpreadsheetProps> = ({
  columns, rows, selectedRowIds, sortRule, rowHeight, hiddenColumnIds, groupBy, allSheets,
  onCellChange, onCellsChange, onSelectRow, onSelectAll, onSortColumn, onDeleteColumn, onEditColumn, onDuplicateColumn, onAddRow, onAddColumn,
  onColumnReorder, onOpenRowDetail, onPaste,
  onDeleteSelected
}) => {
  
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const listRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const outerListRef = useRef<HTMLElement>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // --- Multi-cell Selection State ---
  const [selectedCellIds, setSelectedCellIds] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<{rowId: string, colId: string, rowIndex: number, colIndex: number} | null>(null);
  
  // --- Drag Selection State ---
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{rowIndex: number, colIndex: number} | null>(null);

  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumnIds.has(c.id)), [columns, hiddenColumnIds]);
  const getColWidth = useCallback((col: Column) => col.width || 150, []);

  // --- Helpers for Selection ---
  const getSelectedRange = () => {
    if (selectedCellIds.size === 0) return undefined;
    const ids = Array.from(selectedCellIds).map((x: string) => x.split(':'));
    const rIds = new Set(ids.map(x => x[0]));
    const cIds = new Set(ids.map(x => x[1]));
    
    // Sort logic to ensure correct order
    // Note: 'rows' prop contains ordered rows. 'visibleColumns' contains ordered cols.
    const sortedRowIds = rows.filter(r => rIds.has(r.id)).map(r => r.id);
    const sortedColIds = visibleColumns.filter(c => cIds.has(c.id)).map(c => c.id);
    
    return { rowIds: sortedRowIds, colIds: sortedColIds };
  };

  const getSelectedDataString = () => {
      const range = getSelectedRange();
      if (!range || range.rowIds.length === 0) return '';
      
      const matrix = range.rowIds.map(rid => {
          const row = rows.find(r => r.id === rid);
          return range.colIds.map(cid => {
              if (selectedCellIds.has(`${rid}:${cid}`)) {
                   const val = row ? row[cid] : '';
                   if (typeof val === 'object' && val !== null) {
                       if (Array.isArray(val)) return val.join(', ');
                       return JSON.stringify(val);
                   }
                   return String(val ?? '');
              }
              return '';
          }).join('\t');
      }).join('\n');
      
      return matrix;
  };

  const toggleGroup = (groupKey: string) => {
      const newSet = new Set(collapsedGroups);
      if (newSet.has(groupKey)) {
          newSet.delete(groupKey);
      } else {
          newSet.add(groupKey);
      }
      setCollapsedGroups(newSet);
      // FixedSizeList does not need resetAfterIndex as item size is fixed per render
  };

  // --- Flatten Data for Virtualization ---
  const flatData: VirtualItem[] = useMemo(() => {
      if (!groupBy) {
          const items: VirtualItem[] = rows.map((r, i) => ({ type: 'row', data: r, index: i }));
          items.push({ type: 'add-row' });
          return items;
      }
      
      const groups: Record<string, RowData[]> = {};
      const groupCol = columns.find(c => c.id === groupBy);
      
      if (groupCol?.options) {
          groupCol.options.forEach(opt => groups[opt.label] = []);
      }
      groups['未分组'] = [];

      rows.forEach(row => {
          const val = row[groupBy];
          const key = val ? String(val) : '未分组';
          if (!groups[key]) groups[key] = []; 
          groups[key].push(row);
      });

      const items: VirtualItem[] = [];
      Object.entries(groups).forEach(([key, groupRows]) => {
          if (groupRows.length === 0 && key !== '未分组' && !groupCol?.options) return; 

          const isCollapsed = collapsedGroups.has(key);
          items.push({ type: 'group', value: key, count: groupRows.length, isCollapsed });
          
          if (!isCollapsed) {
              groupRows.forEach((row, i) => items.push({ type: 'row', data: row, index: i }));
          }
      });
      items.push({ type: 'add-row' });

      return items;
  }, [rows, groupBy, collapsedGroups, columns]);
  
  const totalWidth = useMemo(() => visibleColumns.reduce((acc, col) => acc + getColWidth(col), 0) + 50, [visibleColumns, getColWidth]);

  const getItemSize = () => {
      // Group header height matches row height for FixedSizeList compatibility
      switch (rowHeight) {
          case 'small': return 32;
          case 'large': return 48;
          case 'extra-large': return 64;
          default: return 40; 
      }
  };

  // --- Cell Interaction Logic ---
  const onCellMouseDown = (rowId: string, colId: string, rowIndex: number, colIndex: number, e: React.MouseEvent) => {
      if (e.button === 2) { 
        if (!selectedCellIds.has(`${rowId}:${colId}`)) {
             setSelectedCellIds(new Set([`${rowId}:${colId}`]));
             setLastSelected({ rowId, colId, rowIndex, colIndex });
        }
        return;
      }
      
      setIsSelecting(true);
      setDragStart({ rowIndex, colIndex });
      
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          setSelectedCellIds(new Set([`${rowId}:${colId}`]));
          setLastSelected({ rowId, colId, rowIndex, colIndex });
      }
  };

  const onCellMouseEnter = (rowId: string, colId: string, rowIndex: number, colIndex: number) => {
      if (isSelecting && dragStart) {
          const newSet = new Set<string>();
          const rStart = Math.min(dragStart.rowIndex, rowIndex);
          const rEnd = Math.max(dragStart.rowIndex, rowIndex);
          const cStart = Math.min(dragStart.colIndex, colIndex);
          const cEnd = Math.max(dragStart.colIndex, colIndex);
          
          for (let r = rStart; r <= rEnd; r++) {
              const item = flatData[r];
              if (item && item.type === 'row') {
                  for (let c = cStart; c <= cEnd; c++) {
                      const col = visibleColumns[c];
                      if (col) {
                          newSet.add(`${item.data.id}:${col.id}`);
                      }
                  }
              }
          }
          setSelectedCellIds(newSet);
      }
  };

  const onMouseUp = () => {
      setIsSelecting(false);
      setDragStart(null);
  };

  useEffect(() => {
      window.addEventListener('mouseup', onMouseUp);
      // Close context menu on click
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => {
          window.removeEventListener('mouseup', onMouseUp);
          window.removeEventListener('click', handleClick);
      }
  }, []);
  
  // --- Context Menu Handlers ---
  const handleContextMenu = (rowId: string, colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopy = async () => {
      const text = getSelectedDataString();
      if (text) {
          try {
            await navigator.clipboard.writeText(text);
            message.success('已复制');
          } catch (e) { console.error(e); }
      }
      setContextMenu(null);
  };

  const handleDeleteValues = () => {
      if (!onCellsChange || selectedCellIds.size === 0) return;
      const updates = Array.from(selectedCellIds).map((id: string) => {
          const [r, c] = id.split(':');
          return { rowId: r, colId: c, value: '' };
      });
      onCellsChange(updates);
      setContextMenu(null);
  };

  // --- Keyboard & Paste Logic ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        if (selectedCellIds.size === 0) return;
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // If dragging multiple cells, allow pasting to overwrite
            // But usually input handles paste. 
            // If multiple cells selected, we intercept.
            if (selectedCellIds.size <= 1) return;
        }

        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain');
        if (!text) return;

        const rows = text.split(/\r\n|\r|\n/).map(r => r.split('\t'));
        
        if (lastSelected && onPaste) {
            onPaste(rows, lastSelected.rowId, lastSelected.colId, getSelectedRange());
        }
    };
    
    const onKeyDown = (e: KeyboardEvent) => {
        // If typing in an input, don't hijack unless multiple cells selected
        const isEditing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
        
        if (selectedCellIds.size > 0) {
             if (selectedCellIds.size > 1 || !isEditing) {
                 if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                     e.preventDefault();
                     handleCopy();
                 }
                 if (e.key === 'Delete' || e.key === 'Backspace') {
                     // Prevent deleting text if actually editing
                     if (isEditing && selectedCellIds.size === 1) return;
                     e.preventDefault();
                     handleDeleteValues();
                 }
             }
        }
    };
    
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', onKeyDown);
    return () => {
        document.removeEventListener('paste', handlePaste);
        window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedCellIds, lastSelected, onPaste, rows, visibleColumns]);

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden relative selection-area" ref={outerListRef as any}>
        {/* Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 z-10 sticky top-0" ref={headerRef}>
            <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-400">
                <Checkbox 
                    checked={rows.length > 0 && selectedRowIds.size === rows.length} 
                    indeterminate={selectedRowIds.size > 0 && selectedRowIds.size < rows.length}
                    onChange={onSelectAll}
                />
            </div>
            {visibleColumns.map((col, idx) => (
                <div 
                    key={col.id} 
                    style={{ width: getColWidth(col) }} 
                    className="flex-shrink-0 h-9 px-2 flex items-center justify-between border-r border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 group transition-colors relative"
                >
                    <div className="flex items-center gap-1.5 truncate flex-1 cursor-pointer" onClick={() => onSortColumn(col.id, sortRule?.columnId === col.id && sortRule?.direction === 'asc' ? 'desc' : 'asc')}>
                        {getColumnIcon(col.type)}
                        <span className="truncate">{col.label}</span>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <Tooltip title="列设置">
                            <div className="p-1 hover:bg-slate-200 rounded cursor-pointer" onClick={(e) => { e.stopPropagation(); onEditColumn(col); }}>
                                <ChevronDown size={12} />
                            </div>
                        </Tooltip>
                    </div>
                </div>
            ))}
            <div 
                className="w-10 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors border-r border-slate-200 text-slate-400"
                onClick={onAddColumn}
                title="添加列"
            >
                <Plus size={16} />
            </div>
            <div className="flex-1 bg-slate-50" />
        </div>

        {/* Virtual List */}
        <div className="flex-1">
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        ref={listRef}
                        height={height}
                        itemCount={flatData.length}
                        itemSize={getItemSize()}
                        width={width}
                        itemData={{
                            flatData,
                            columns,
                            visibleColumns,
                            selectedRowIds,
                            selectedCellIds,
                            groupBy,
                            totalWidth,
                            onCellChange,
                            onSelectRow,
                            onAddRow,
                            toggleGroup,
                            onOpenRowDetail,
                            getColWidth,
                            allSheets,
                            onCellMouseDown,
                            onCellMouseEnter,
                            onCellContextMenu: handleContextMenu
                        }}
                    >
                        {Row}
                    </List>
                )}
            </AutoSizer>
        </div>

        {/* Custom Context Menu */}
        {contextMenu && (
            <div 
                className="fixed bg-white border border-slate-200 shadow-lg rounded-lg py-1 z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking menu
            >
                <button onClick={handleCopy} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                    <Copy size={14} /> 复制
                </button>
                <button onClick={handleDeleteValues} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
                    <Scissors size={14} /> 清除内容
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <div className="px-3 py-1 text-[10px] text-slate-400">
                    选中 {selectedCellIds.size} 个单元格
                </div>
            </div>
        )}
    </div>
  );
};

export default Spreadsheet;