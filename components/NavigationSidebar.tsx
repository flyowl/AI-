
import React, { useState } from 'react';
import { Sheet } from '../types';
import { 
  Plus, Table2, FileSpreadsheet, LayoutDashboard, 
  Workflow, FileText, Folder, Import, Database, 
  Search, MoreHorizontal, ChevronDown, ChevronRight,
  AppWindow, FolderOpen, Download, Upload
} from 'lucide-react';
import { Dropdown, Input, MenuProps, Button, message } from 'antd';

interface NavigationSidebarProps {
  sheets: Sheet[];
  activeSheetId: string;
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
  onSwitchSheet,
  onAddSheet,
  onAddFolder,
  onRenameSheet,
  onDeleteSheet,
  onToggleFolder,
  onMoveSheet,
  onImportSheets
}) => {
  const [dragState, setDragState] = useState<DragState>({
      isDragging: false,
      dragId: null,
      dragOverId: null,
      dropPosition: null
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (item: Sheet) => {
      setRenamingId(item.id);
      setRenameValue(item.name);
  };

  const submitRename = () => {
      if (renamingId && renameValue.trim()) {
          onRenameSheet(renamingId, renameValue.trim());
      }
      setRenamingId(null);
      setRenameValue('');
  };

  const handleExportJSON = () => {
    try {
        const exportData = sheets.map(s => ({
            ...s,
            selectedRowIds: Array.from(s.selectedRowIds)
        }));
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartsheets-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('导出成功');
    } catch (e) {
        console.error('Export failed', e);
        message.error('导出失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              onImportSheets(json);
          } catch (err) {
              console.error(err);
              message.error('文件解析失败');
          }
      };
      reader.readAsText(file);
      // Reset input to allow re-selecting same file
      e.target.value = '';
  };

  const getContextMenu = (item: Sheet) => {
      const items: MenuProps['items'] = [
          { key: 'rename', label: '重命名', onClick: () => startRename(item) },
          { key: 'delete', label: '删除', danger: true, onClick: () => onDeleteSheet(item.id) },
      ];
      return items;
  };

  const handleDragStart = (e: React.DragEvent, item: Sheet) => {
      e.stopPropagation();
      e.dataTransfer.setData('dragId', item.id);
      e.dataTransfer.effectAllowed = 'move';
      
      // Delay state update to avoid immediate style change affecting drag ghost
      setTimeout(() => {
          setDragState({ ...dragState, isDragging: true, dragId: item.id });
      }, 0);
  };

  const handleDragOver = (e: React.DragEvent, item: Sheet) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!dragState.isDragging || dragState.dragId === item.id) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const hoverY = e.clientY - rect.top;
      const height = rect.height;

      let position: 'top' | 'bottom' | 'inside' = 'bottom';

      if (item.type === 'folder') {
          // Folder logic
          if (hoverY < height * 0.25) position = 'top';
          else if (hoverY > height * 0.75) position = 'bottom';
          else position = 'inside';
      } else {
          // File logic
          if (hoverY < height * 0.5) position = 'top';
          else position = 'bottom';
      }

      setDragState(prev => ({
          ...prev,
          dragOverId: item.id,
          dropPosition: position
      }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      // Logic to clear dragOver if leaving the container could be here, 
      // but usually we rely on dragEnd or new dragOver.
  };

  const handleDrop = (e: React.DragEvent, targetItem: Sheet) => {
      e.preventDefault();
      e.stopPropagation();
      
      const dragId = e.dataTransfer.getData('dragId');
      
      if (dragId && dragId !== targetItem.id && dragState.dropPosition) {
          onMoveSheet(dragId, targetItem.id, dragState.dropPosition);
      }
      
      handleDragEnd();
  };

  const handleDragEnd = () => {
      setDragState({
          isDragging: false,
          dragId: null,
          dragOverId: null,
          dropPosition: null
      });
  };

  const renderTreeItem = (item: Sheet, level: number = 0) => {
      const isFolder = item.type === 'folder';
      const isActive = activeSheetId === item.id;
      const paddingLeft = 12 + level * 16;
      const isRenaming = renamingId === item.id;
      
      const isDragOver = dragState.dragOverId === item.id;
      const isDraggingThis = dragState.dragId === item.id;
      
      // Determine Styles based on Drop Position
      let dropStyleClass = '';
      if (isDragOver && !isDraggingThis) {
          if (dragState.dropPosition === 'inside') {
             dropStyleClass = 'bg-indigo-50 ring-2 ring-inset ring-indigo-300';
          } else if (dragState.dropPosition === 'top') {
             dropStyleClass = 'border-t-2 border-indigo-500';
          } else if (dragState.dropPosition === 'bottom') {
             dropStyleClass = 'border-b-2 border-indigo-500';
          }
      }

      const children = sheets.filter(s => s.parentId === item.id);

      return (
          <div 
            key={item.id}
            className={`${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
          >
              <Dropdown menu={{ items: getContextMenu(item) }} trigger={['contextMenu']} disabled={isRenaming}>
                <div 
                    draggable={!isRenaming}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, item)}
                    onDrop={(e) => handleDrop(e, item)}
                    onClick={() => {
                        if (!isRenaming) {
                            if (isFolder) onToggleFolder(item.id);
                            else onSwitchSheet(item.id);
                        }
                    }}
                    className={`
                        group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-all mb-0.5 select-none relative
                        ${isActive && !isRenaming ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                        ${dropStyleClass}
                    `}
                    style={{ paddingLeft: `${level === 0 ? 12 : paddingLeft}px` }}
                >
                    {isFolder && (
                        <div className="text-slate-400 w-4 h-4 flex items-center justify-center shrink-0">
                            {item.isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </div>
                    )}
                    
                    {!isFolder && <div className="w-4 shrink-0" />} 

                    <div className="shrink-0 flex items-center">
                        {isFolder 
                            ? (item.isOpen ? <FolderOpen size={16} className="text-indigo-400"/> : <Folder size={16} className="text-indigo-300"/>)
                            : <Table2 size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                        }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        {isRenaming ? (
                            <Input 
                                size="small"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={submitRename}
                                onPressEnter={submitRename}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 text-xs px-1 py-0 rounded"
                            />
                        ) : (
                            <div className="truncate">{item.name}</div>
                        )}
                    </div>
                    
                    {!isRenaming && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                             <Dropdown menu={{ items: getContextMenu(item) }} trigger={['click']}>
                                <div className="p-1 hover:bg-slate-200 rounded text-slate-500">
                                    <MoreHorizontal size={14}/>
                                </div>
                             </Dropdown>
                        </div>
                    )}
                </div>
              </Dropdown>
              
              {isFolder && item.isOpen && (
                  <div>
                      {children.map(child => renderTreeItem(child, level + 1))}
                      {children.length === 0 && (
                          <div 
                            className="text-xs text-slate-400 py-1 select-none" 
                            style={{ paddingLeft: `${paddingLeft + 28}px` }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!dragState.isDragging || dragState.dragId === item.id) return;
                                setDragState(prev => ({
                                    ...prev,
                                    dragOverId: item.id,
                                    dropPosition: 'inside'
                                }));
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const dragId = e.dataTransfer.getData('dragId');
                                if (dragId && dragId !== item.id) {
                                    onMoveSheet(dragId, item.id, 'inside');
                                }
                                handleDragEnd();
                            }}
                          >
                            空文件夹
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  const rootItems = sheets.filter(s => !s.parentId);

  const newButtonItems: MenuProps['items'] = [
      { key: 'table', label: '新建工作表', icon: <Table2 size={14}/>, onClick: onAddSheet },
      { key: 'folder', label: '新建文件夹', icon: <Folder size={14}/>, onClick: onAddFolder },
      { type: 'divider' },
      { key: 'import', label: '导入 Excel', icon: <Import size={14}/> },
  ];

  return (
    <div className="w-60 h-full bg-slate-50/50 border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Header / Search */}
        <div className="p-3 mb-2 flex flex-col gap-2">
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <Input 
                    placeholder="搜索" 
                    className="rounded-lg pl-8 text-sm bg-white border-slate-200 shadow-sm hover:border-indigo-300 focus:border-indigo-500" 
                />
            </div>
             {/* New Button */}
             <Dropdown menu={{ items: newButtonItems }} trigger={['click']}>
                <button className="w-full flex items-center justify-between px-3 py-1.5 bg-indigo-600 text-white border border-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-all group">
                    <span className="font-medium text-sm flex items-center gap-1"><Plus size={16}/> 新建</span>
                    <ChevronDown size={14} className="text-indigo-200"/>
                </button>
            </Dropdown>
        </div>

        {/* Tree List */}
        <div 
            className="flex-1 overflow-y-auto px-0 space-y-0.5 scrollbar-thin"
            onDragLeave={handleDragEnd}
        >
             <div className="px-3 py-2 text-xs font-semibold text-slate-500 flex items-center gap-1">
                 我的工作表
             </div>
             {rootItems.map(item => renderTreeItem(item))}
        </div>

        {/* Bottom Section (Docs/Apps) */}
         <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-2 space-y-1">
             <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                <FileText size={16} className="text-blue-400"/> 文档
             </div>
             <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                <Folder size={16} className="text-indigo-300"/> 文件夹
             </div>
             <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                <AppWindow size={16} className="text-indigo-600"/> 应用
             </div>
             
             {/* Import Button */}
             <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".json" 
                 onChange={handleFileChange}
             />
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
             >
                <Upload size={16} className="text-orange-500"/> 导入数据
             </div>

             {/* Export Button */}
             <div 
                onClick={handleExportJSON}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
             >
                <Download size={16} className="text-emerald-500"/> 导出数据
             </div>
         </div>
    </div>
  );
};

export default NavigationSidebar;
