
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Column, RowData } from '../types';
import { CalendarRange, AlertCircle, ChevronRight, User } from 'lucide-react';
import { Tooltip, Avatar } from 'antd';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekOfYear);

interface GanttChartProps {
  columns: Column[];
  rows: RowData[];
  onCardClick: (rowId: string) => void;
}

const CELL_WIDTH = 40; // Width of one day in pixels
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 40;
const SIDEBAR_WIDTH = 240;

const GanttChart: React.FC<GanttChartProps> = ({ columns, rows, onCardClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 1. Identify Key Columns
  const dateCols = useMemo(() => columns.filter(c => c.type === 'date'), [columns]);
  const titleCol = useMemo(() => columns.find(c => c.type === 'text') || columns[0], [columns]);
  const personCol = useMemo(() => columns.find(c => c.type === 'person'), [columns]);
  
  // 2. Determine Timeline Range
  const { minDate, maxDate, processedRows } = useMemo(() => {
    if (dateCols.length === 0) return { minDate: null, maxDate: null, processedRows: [] };

    // Heuristic: First date col is Start, Second (if exists) is End
    const startCol = dateCols[0];
    const endCol = dateCols.length > 1 ? dateCols[1] : null;

    let min = dayjs().startOf('month');
    let max = dayjs().endOf('month');
    let foundDates = false;

    const mappedRows = rows.map(row => {
        const startVal = row[startCol.id];
        let endVal = endCol ? row[endCol.id] : null;
        
        if (!startVal) return null; // Skip rows without start date

        const startDate = dayjs(startVal);
        // Default to 3 days duration if no end date
        const endDate = endVal ? dayjs(endVal) : startDate.add(3, 'day'); 

        if (startDate.isValid()) {
            if (!foundDates) {
                min = startDate;
                max = endDate;
                foundDates = true;
            } else {
                if (startDate.isBefore(min)) min = startDate;
                if (endDate.isAfter(max)) max = endDate;
            }
        }

        return {
            id: row.id,
            title: row[titleCol.id] || '无标题',
            person: personCol ? row[personCol.id] : null,
            startDate,
            endDate,
            original: row
        };
    }).filter(Boolean) as any[];

    // Add padding to timeline
    return {
        minDate: min.subtract(3, 'day'),
        maxDate: max.add(7, 'day'),
        processedRows: mappedRows
    };
  }, [rows, dateCols, titleCol, personCol]);

  // 3. Generate Timeline Header
  const timelineDays = useMemo(() => {
      if (!minDate || !maxDate) return [];
      const days = [];
      let current = minDate;
      while (current.isBefore(maxDate) || current.isSame(maxDate, 'day')) {
          days.push(current);
          current = current.add(1, 'day');
      }
      return days;
  }, [minDate, maxDate]);

  // Scroll to first task on load
  useEffect(() => {
      if (containerRef.current && processedRows.length > 0) {
          // Center roughly or scroll to start (simple offset)
          containerRef.current.scrollLeft = 0;
      }
  }, [processedRows.length]);

  if (dateCols.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
              <CalendarRange size={48} className="mb-4 opacity-20"/>
              <p className="text-sm font-medium text-slate-600">无法生成甘特图</p>
              <p className="text-xs mt-1">请确保表格中至少包含一个“日期”类型的列。</p>
          </div>
      );
  }

  return (
    <div className="flex h-full border border-slate-200 rounded-lg bg-white overflow-hidden">
        {/* Left Sidebar: Task List */}
        <div 
            className="flex-shrink-0 bg-white border-r border-slate-200 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]" 
            style={{ width: SIDEBAR_WIDTH }}
        >
            <div className="h-[50px] border-b border-slate-200 flex items-center px-4 font-semibold text-xs text-slate-500 bg-slate-50">
                任务列表
            </div>
            <div className="overflow-hidden">
                {processedRows.map((row, idx) => (
                    <div 
                        key={row.id} 
                        className="flex items-center px-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer group"
                        style={{ height: ROW_HEIGHT }}
                        onClick={() => onCardClick(row.id)}
                    >
                        <span className="text-sm text-slate-700 truncate flex-1">{row.title}</span>
                        {row.person && (
                            <Tooltip title={row.person}>
                                <Avatar size={20} className="bg-indigo-100 text-indigo-600 text-[10px] ml-2 shrink-0 border border-white">
                                    {String(row.person)[0].toUpperCase()}
                                </Avatar>
                            </Tooltip>
                        )}
                        <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-2"/>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Content: Timeline */}
        <div 
            ref={containerRef}
            className="flex-1 overflow-auto relative bg-white"
        >
             {/* Timeline Header */}
             <div 
                className="sticky top-0 left-0 z-20 bg-slate-50 border-b border-slate-200 flex h-[50px]"
                style={{ width: timelineDays.length * CELL_WIDTH }}
             >
                 {timelineDays.map((day, idx) => {
                     const isFirstOfMonth = day.date() === 1 || idx === 0;
                     const isToday = day.isSame(dayjs(), 'day');
                     return (
                         <div 
                            key={idx} 
                            className={`flex-shrink-0 border-r border-slate-100 flex flex-col justify-end items-center pb-1 text-[10px] relative ${isToday ? 'bg-indigo-50/50' : ''}`}
                            style={{ width: CELL_WIDTH }}
                         >
                             {isFirstOfMonth && (
                                 <span className="absolute top-1 left-1 text-slate-500 font-bold whitespace-nowrap z-10">
                                     {day.format('YYYY年M月')}
                                 </span>
                             )}
                             <span className={`font-medium ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                                 {day.date()}
                             </span>
                             <span className="text-[9px] text-slate-300 transform scale-90">
                                 {['日','一','二','三','四','五','六'][day.day()]}
                             </span>
                         </div>
                     );
                 })}
             </div>
             
             {/* Grid Body */}
             <div 
                className="relative"
                style={{ width: timelineDays.length * CELL_WIDTH, height: processedRows.length * ROW_HEIGHT }}
             >
                 {/* Vertical Grid Lines */}
                 <div className="absolute inset-0 flex pointer-events-none">
                     {timelineDays.map((day, idx) => {
                         const isWeekend = day.day() === 0 || day.day() === 6;
                         return (
                            <div 
                                key={idx} 
                                className={`border-r border-slate-100 flex-shrink-0 h-full ${isWeekend ? 'bg-slate-50/40' : ''}`} 
                                style={{ width: CELL_WIDTH }} 
                            />
                         );
                     })}
                 </div>

                 {/* Task Bars */}
                 {processedRows.map((row, idx) => {
                     if (!minDate) return null;
                     
                     // Calculate position
                     const diffDays = row.startDate.diff(minDate, 'day');
                     const durationDays = row.endDate.diff(row.startDate, 'day') + 1; // +1 to include end day
                     
                     const left = diffDays * CELL_WIDTH;
                     const width = Math.max(durationDays * CELL_WIDTH, CELL_WIDTH); // Min width 1 cell

                     return (
                         <div 
                            key={row.id}
                            className="absolute hover:z-10"
                            style={{ 
                                top: idx * ROW_HEIGHT + 8, // 8px top padding within row
                                height: ROW_HEIGHT - 16, 
                                left,
                                width: width - 4 // small gap
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCardClick(row.id);
                            }}
                         >
                             <Tooltip 
                                title={
                                    <div className="text-xs">
                                        <div className="font-bold mb-1">{row.title}</div>
                                        <div>{row.startDate.format('MM-DD')} 至 {row.endDate.format('MM-DD')}</div>
                                    </div>
                                }
                            >
                                <div className="w-full h-full rounded-md bg-indigo-500 border border-indigo-600 shadow-sm cursor-pointer hover:bg-indigo-600 transition-colors flex items-center px-2 overflow-hidden relative group">
                                    <span className="text-[10px] text-white font-medium truncate drop-shadow-md sticky left-2">
                                        {row.title}
                                    </span>
                                </div>
                             </Tooltip>
                         </div>
                     );
                 })}
             </div>
        </div>
    </div>
  );
};

export default GanttChart;
