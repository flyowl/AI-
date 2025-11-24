import React, { useMemo } from 'react';
import { Column, RowData, SelectOption } from '../types';
import { MoreHorizontal, Plus, User, Calendar, AlertCircle } from 'lucide-react';
import { Avatar, Button, Dropdown } from 'antd';
import dayjs from 'dayjs';

interface KanbanBoardProps {
  columns: Column[];
  rows: RowData[];
  groupByColId: string | null;
  onCardClick: (rowId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, rows, groupByColId, onCardClick }) => {
  // Find the grouping column (must be select type for best results, or we default)
  const groupCol = columns.find(c => c.id === groupByColId) || columns.find(c => c.type === 'select');

  const groups: Record<string, RowData[]> = useMemo(() => {
    if (!groupCol) return { '未分组': rows };

    const mapping: Record<string, RowData[]> = {};
    
    // Initialize groups based on options if available
    if (groupCol.options) {
        groupCol.options.forEach(opt => {
            mapping[opt.label] = [];
        });
    }
    // Always add a default/uncategorized group
    mapping['未分组'] = [];

    rows.forEach(row => {
        const val = row[groupCol.id];
        const key = val ? String(val) : '未分组';
        if (!mapping[key]) mapping[key] = []; // Create if dynamic
        mapping[key].push(row);
    });

    return mapping;
  }, [rows, groupCol]);

  if (!groupCol) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <AlertCircle size={48} className="mb-4 opacity-20"/>
            <p>请选择一个“选项”类型的列作为看板分组依据。</p>
        </div>
    )
  }

  return (
    <div className="flex h-full overflow-x-auto p-4 gap-6 bg-slate-50/50 items-start">
        {Object.entries(groups).map(([groupName, groupRows]) => {
            const option = groupCol.options?.find(o => o.label === groupName);
            const colorClass = option?.color || 'bg-slate-100 text-slate-700';

            return (
                <div key={groupName} className="w-80 flex-shrink-0 flex flex-col max-h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                                {groupName}
                            </span>
                            <span className="text-xs text-slate-400">{groupRows.length}</span>
                        </div>
                        <div className="flex gap-1">
                            <Button size="small" type="text" icon={<Plus size={14} />} />
                            <Button size="small" type="text" icon={<MoreHorizontal size={14} />} />
                        </div>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto min-h-[100px] space-y-3 pb-2">
                        {groupRows.map(row => (
                            <KanbanCard 
                                key={row.id} 
                                row={row} 
                                columns={columns} 
                                groupColId={groupCol.id}
                                onClick={() => onCardClick(row.id)}
                            />
                        ))}
                        <button className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors border border-dashed border-slate-200">
                            <Plus size={14} className="mr-1"/> 添加
                        </button>
                    </div>
                </div>
            )
        })}
    </div>
  );
};

const KanbanCard: React.FC<{ row: RowData, columns: Column[], groupColId: string, onClick: () => void }> = ({ row, columns, groupColId, onClick }) => {
    // Determine primary text (first text column)
    const titleCol = columns.find(c => c.type === 'text' && c.id !== groupColId) || columns[0];
    const visibleCols = columns.filter(c => c.id !== groupColId && c.id !== titleCol.id).slice(0, 3);

    const renderValue = (col: Column) => {
        const val = row[col.id];
        if (!val) return null;
        
        if (col.type === 'person') {
            return <Avatar size={16} className="bg-purple-500 text-[10px]">{String(val)[0]}</Avatar>;
        }
        if (col.type === 'date') {
            return <span className="flex items-center gap-1 text-slate-400 text-[10px]"><Calendar size={10}/> {dayjs(val).format('MM-DD')}</span>
        }
        if (col.type === 'image') {
            return <img src={val} className="w-full h-24 object-cover rounded-md mb-2" alt="Cover" />
        }
        return <span className="text-xs text-slate-500 truncate max-w-[120px]">{String(val)}</span>
    }

    return (
        <div 
            onClick={onClick}
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 group"
        >
             {/* If there's an image column, show it as cover */}
             {columns.find(c => c.type === 'image' && row[c.id]) && (
                 <img src={row[columns.find(c => c.type === 'image')!.id]} className="w-full h-32 object-cover rounded mb-1" alt="" />
             )}

             <div className="font-medium text-slate-700 text-sm leading-tight">
                 {row[titleCol.id] || <span className="text-slate-300 italic">无标题</span>}
             </div>

             {visibleCols.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-1">
                     {visibleCols.map(col => {
                         const val = renderValue(col);
                         if(!val) return null;
                         return <div key={col.id} className="flex items-center">{val}</div>
                     })}
                 </div>
             )}
        </div>
    )
}

export default KanbanBoard;