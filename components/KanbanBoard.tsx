
import React, { useMemo } from 'react';
import { Column, RowData } from '../types';
import { MoreHorizontal, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Avatar, Button } from 'antd';
import dayjs from 'dayjs';

interface KanbanBoardProps {
  columns: Column[];
  rows: RowData[];
  groupByColId: string | null;
  onCardClick: (rowId: string) => void;
  onAddClick: (initialValues?: any) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, rows, groupByColId, onCardClick, onAddClick }) => {
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
    <div className="flex h-full overflow-x-auto p-6 gap-6 bg-slate-50/50 items-start">
        {Object.entries(groups).map(([groupName, groupRows]) => {
            const option = groupCol.options?.find(o => o.label === groupName);
            const colorClass = option?.color || 'bg-slate-100 text-slate-700';

            return (
                <div key={groupName} className="w-80 flex-shrink-0 flex flex-col max-h-full bg-slate-100/50 rounded-xl p-2 border border-slate-200/60">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 px-2 pt-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${colorClass}`}>
                                {groupName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{groupRows.length}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="small" type="text" icon={<MoreHorizontal size={14} />} className="text-slate-400"/>
                        </div>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto min-h-[100px] space-y-3 px-1 pb-1 scrollbar-hide">
                        {groupRows.map(row => (
                            <KanbanCard 
                                key={row.id} 
                                row={row} 
                                columns={columns} 
                                groupColId={groupCol.id}
                                onClick={() => onCardClick(row.id)}
                            />
                        ))}
                        <button 
                            onClick={() => onAddClick({ [groupCol.id]: groupName === '未分组' ? '' : groupName })}
                            className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg text-sm transition-all border border-transparent hover:border-indigo-100"
                        >
                            <Plus size={14} className="mr-1"/> 添加
                        </button>
                    </div>
                </div>
            )
        })}
        {/* Placeholder for spacing at the end */}
        <div className="w-2 flex-shrink-0"></div>
    </div>
  );
};

const KanbanCard: React.FC<{ row: RowData, columns: Column[], groupColId: string, onClick: () => void }> = ({ row, columns, groupColId, onClick }) => {
    // Determine primary text (first text column)
    const titleCol = columns.find(c => c.type === 'text' && c.id !== groupColId) || columns[0];
    const visibleCols = columns.filter(c => c.id !== groupColId && c.id !== titleCol.id).slice(0, 3);
    const imageCol = columns.find(c => c.type === 'image');

    const renderValue = (col: Column) => {
        const val = row[col.id];
        if (val === null || val === undefined || val === '') return null;
        
        if (col.type === 'person') {
            return <Avatar size={18} className="bg-indigo-500 text-[10px]">{String(val)[0]}</Avatar>;
        }
        if (col.type === 'date') {
            return <span className="flex items-center gap-1 text-slate-400 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded"><Calendar size={10}/> {dayjs(val).format('MM-DD')}</span>
        }
        if (col.type === 'checkbox' || col.type === 'switch') {
             return null; // Skip checkboxes and switches in card preview
        }
        return <span className="text-xs text-slate-500 truncate max-w-[120px] bg-slate-50 px-1.5 py-0.5 rounded">{String(val)}</span>
    }

    return (
        <div 
            onClick={onClick}
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col gap-2 group relative select-none"
        >
             {/* If there's an image column, show it as cover */}
             {imageCol && row[imageCol.id] && (
                 <div className="h-32 -mx-3 -mt-3 mb-1 overflow-hidden rounded-t-lg relative">
                     <img src={row[imageCol.id]} className="w-full h-full object-cover" alt="" />
                 </div>
             )}

             <div className="font-medium text-slate-700 text-sm leading-tight pr-4">
                 {row[titleCol.id] || <span className="text-slate-300 italic">无标题</span>}
             </div>

             {visibleCols.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 mt-1">
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
