
import React from 'react';
import { Column, RowData } from '../types';
import { Image as ImageIcon } from 'lucide-react';

interface GalleryGridProps {
  columns: Column[];
  rows: RowData[];
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ columns, rows }) => {
  const imageCol = columns.find(c => c.type === 'image');
  const titleCol = columns.find(c => c.type === 'text') || columns[0];
  const subtitleCol = columns.find(c => c.id !== titleCol.id && (c.type === 'text' || c.type === 'select'));

  return (
    <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {rows.map(row => (
                <div key={row.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-64">
                    <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        {imageCol && row[imageCol.id] ? (
                            <img 
                                src={row[imageCol.id]} 
                                alt="" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                                <ImageIcon size={32} className="mb-2"/>
                                <span className="text-xs">无图片</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">
                            {row[titleCol.id] || '未命名'}
                        </h3>
                        {subtitleCol && (
                             <p className="text-xs text-slate-500 truncate">
                                 {row[subtitleCol.id]}
                             </p>
                        )}
                        <div className="mt-auto pt-3 flex gap-2">
                             {/* Tags or other metadata could go here */}
                             <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">ID: {row.id.slice(0,4)}</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Add New Placeholder */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center h-64 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <span className="text-4xl font-light mb-2">+</span>
                <span className="text-sm">添加新项</span>
            </div>
        </div>
    </div>
  );
};

export default GalleryGrid;
