

import React, { useState, useRef } from 'react';
import { Sheet } from '../types';
import { 
  Plus, Table2, Folder, Import, 
  Search, MoreHorizontal, ChevronDown, ChevronRight,
  FolderOpen, Trash2, Edit2, Download
} from 'lucide-react';
import { Dropdown, Input, MenuProps, message, Button } from 'antd';

interface NavigationSidebarProps {
  sheets: Sheet[];
  activeSheetId: string;
  canManageSheets: boolean; // Replaced currentUserRole with capability flag
  onSwitchSheet: (id: string) => void;
  onAddSheet: () => void;
  onAddFolder: () => void;
  onRenameSheet: (id: string, newName: string) => void;
  onDeleteSheet: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onMoveSheet: (dragId: string, targetId: string, position: 'top' | 'bottom' | 'inside') => void;
  onImportSheets: (sheets: any[]) => void;
}

interface DragState {
    isDragging: boolean;
    dragId: string | null;
    dragOverId: string | null;
    dropPosition: 'top' | 'bottom' | 'inside' | null;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  sheets,
  activeSheetId,
  canManageSheets,
  onSwitchSheet,
  onAddSheet,
  onAddFolder,
  onRenameSheet,
  onDeleteSheet,
  onToggleFolder,
  onMoveSheet,
  onImportSheets
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dragState, setDragState] = useState<DragState>({
      isDragging: false,
      dragId: null,
      dragOverId: null,
      dropPosition: null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              onImportSheets(json);
          } catch (err) {
              message.error('文件格式错误');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
      try {
          // Serialize data, converting Sets to Arrays
          const exportData = sheets.map(s => ({
              ...s,
              selectedRowIds: Array.from(s.selectedRowIds || [])
          }));
          
          const dataStr = JSON.stringify(exportData, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          link.download = `calicat_backup_${dateStr}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          message.success('导出成功');
      } catch (e) {
          console.error(e);
          message.error('导出失败');
      }
  };

  const startRename = (sheet: Sheet) => {
      setEditingId(sheet.id);
      setRenameValue(sheet.name);
  };

  const finishRename = () => {
      if (editingId && renameValue.trim()) {
          onRenameSheet(editingId, renameValue);
      }
      setEditingId(null);
      setRenameValue('');
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (!canManageSheets) return;
      e.dataTransfer.effectAllowed = 'move';
      setDragState(prev => ({ ...prev, isDragging: true, dragId: id }));
  };

  const handleDragOver = (e: React.DragEvent, id: string, type: string) => {
      e.preventDefault();
      if (!canManageSheets) return;
      if (dragState.dragId === id) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      let position: 'top' | 'bottom' | 'inside' = 'bottom';
      
      if (type === 'folder') {
           // Folder logic: top 25%, bottom 25%, middle 50% (inside)
           if (y < height * 0.25) position = 'top';
           else if (y > height * 0.75) position = 'bottom';
           else position = 'inside';
      } else {
           if (y < height * 0.5) position = 'top';
           else position = 'bottom';
      }

      setDragState(prev => ({ ...prev, dragOverId: id, dropPosition: position }));
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!canManageSheets) return;
      if (dragState.dragId && dragState.dropPosition) {
          onMoveSheet(dragState.dragId, targetId, dragState.dropPosition);
      }
      setDragState({ isDragging: false, dragId: null, dragOverId: null, dropPosition: null });
  };

  // --- Recursive Renderer ---
  const renderTree = (parentId?: string, level = 0) => {
      const items = sheets.filter(s => s.parentId === parentId);
      
      if (items.length === 0) return null;

      return items.map(item => {
          if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && item.type !== 'folder') {
              return null;
          }

          const isDragging = dragState.dragId === item.id;
          const isDragOver = dragState.dragOverId === item.id;
          
          let borderClass = '';
          if (isDragOver) {
              if (dragState.dropPosition === 'top') borderClass = 'border-t-2 border-indigo-500';
              if (dragState.dropPosition === 'bottom') borderClass = 'border-b-2 border-indigo-500';
              if (dragState.dropPosition === 'inside') borderClass = 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset';
          }

          const menuItems: MenuProps['items'] = [
              { key: 'rename', label: '重命名', icon: <Edit2 size={14}/>, onClick: () => startRename(item) },
              { key: 'delete', label: '删除', icon: <Trash2 size={14}/>, danger: true, onClick: () => onDeleteSheet(item.id) },
          ];

          return (
              <div key={item.id} style={{ paddingLeft: level === 0 ? 0 : 12 }}>
                  <div
                      draggable={canManageSheets}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id, item.type)}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`
                          group flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all mb-0.5 select-none
                          ${item.id === activeSheetId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}
                          ${isDragging ? 'opacity-50' : ''}
                          ${borderClass}
                      `}
                      onClick={() => {
                          if (item.type === 'folder') onToggleFolder(item.id);
                          else onSwitchSheet(item.id);
                      }}
                  >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                          {item.type === 'folder' && (
                              <span 
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onToggleFolder(item.id); }}
                              >
                                  {item.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                          )}
                          
                          {item.type === 'folder' ? (
                              item.isOpen ? <FolderOpen size={16} className="text-indigo-400"/> : <Folder size={16} className="text-slate-400"/>
                          ) : (
                              <Table2 size={16} className={item.id === activeSheetId ? 'text-indigo-600' : 'text-green-500'} />
                          )}

                          {editingId === item.id ? (
                              <Input 
                                  size="small" 
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onBlur={finishRename}
                                  onPressEnter={finishRename}
                                  autoFocus
                                  onClick={e => e.stopPropagation()}
                                  className="h-6 text-xs"
                              />
                          ) : (
                              <span className="truncate">{item.name}</span>
                          )}
                      </div>

                      {canManageSheets && (
                          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                              <div 
                                className="p-1 rounded hover:bg-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => e.stopPropagation()}
                              >
                                  <MoreHorizontal size={14} />
                              </div>
                          </Dropdown>
                      )}
                  </div>

                  {item.type === 'folder' && item.isOpen && (
                      <div className="border-l border-slate-100 ml-3">
                          {renderTree(item.id, level + 1)}
                      </div>
                  )}
              </div>
          );
      });
  };

  const addMenu: MenuProps['items'] = [
      { key: 'sheet', label: '新建工作表', icon: <Table2 size={14}/>, onClick: onAddSheet },
      { key: 'folder', label: '新建文件夹', icon: <Folder size={14}/>, onClick: onAddFolder },
      { type: 'divider' },
      { key: 'export', label: '导出数据 (JSON)', icon: <Download size={14}/>, onClick: handleExport },
      { key: 'import', label: '导入数据 (JSON)', icon: <Import size={14}/>, onClick: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        <div className="p-3 border-b border-slate-200">
            <div className="relative mb-3">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text"
                    placeholder="搜索..." 
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:border-indigo-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            {canManageSheets && (
                <Dropdown menu={{ items: addMenu }} trigger={['click']}>
                    <Button block type="dashed" size="small" icon={<Plus size={14}/>} className="text-slate-600 border-slate-300">
                        新建 / 管理
                    </Button>
                </Dropdown>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
             <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 工作表
             </div>
             {renderTree()}
        </div>
    </div>
  );
};

export default NavigationSidebar;