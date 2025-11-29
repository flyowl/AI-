

import React from 'react';
import { Column, RowData } from '../types';
import { Image as ImageIcon, Plus } from 'lucide-react';

interface GalleryGridProps {
  columns: Column[];
  rows: RowData[];
  onCardClick: (rowId: string) => void;
  onAddClick: () => void;
  canEditData: boolean;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ columns, rows, onCardClick, onAddClick, canEditData }) => {
  const imageCol = columns.find(c => c.type === 'image');
  const titleCol = columns.find(c => c.type === 'text') || columns[0];
  const subtitleCol = columns.find(c => c.id !== titleCol.id && (c.type === 'text' || c.type === 'select'));

  return (
    <div className="p-6 overflow-y-auto h-full bg-slate-50/50">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
            {rows.map(row => (
                <div 
                    key={row.id} 
                    onClick={() => onCardClick(row.id)}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col h-72 hover:-translate-y-1"
                >
                    <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0">
                        {imageCol && row[imageCol.id] ? (
                            <img 
                                src={row[imageCol.id]} 
                                alt="" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                                <ImageIcon size={32} className="mb-2 opacity-50"/>
                                <span className="text-xs">无图片</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col min-h-0">
                        <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">
                            {row[titleCol.id] || <span className="text-slate-400 italic">未命名</span>}
                        </h3>
                        {subtitleCol && (
                             <p className="text-xs text-slate-500 truncate mb-2">
                                 {row[subtitleCol.id]}
                             </p>
                        )}
                        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                             <span className="text-[10px] text-slate-400 font-mono">ID: {row.id.slice(0,4)}</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Add New Placeholder */}
            {canEditData && (
                <div 
                    onClick={onAddClick}
                    className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center h-72 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                    </div>
                    <span className="text-sm font-medium">添加新项</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default GalleryGrid;