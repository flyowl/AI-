
import React from 'react';
import { Sheet } from '../types';
import { 
  Plus, Table2, FileSpreadsheet, LayoutDashboard, 
  Workflow, FileText, Folder, Import, Database, 
  Search, MoreHorizontal, ChevronDown, AppWindow
} from 'lucide-react';
import { Dropdown, Button, Input, MenuProps } from 'antd';

interface NavigationSidebarProps {
  sheets: Sheet[];
  activeSheetId: string;
  onSwitchSheet: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string) => void;
  onDeleteSheet: (id: string) => void;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  sheets,
  activeSheetId,
  onSwitchSheet,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet
}) => {
  
  const renderSheetItem = (sheet: Sheet) => {
      const menuItems: MenuProps['items'] = [
          { key: 'rename', label: '重命名', onClick: () => onRenameSheet(sheet.id) },
          { key: 'delete', label: '删除', danger: true, onClick: () => onDeleteSheet(sheet.id) },
      ];

      return (
          <Dropdown key={sheet.id} menu={{ items: menuItems }} trigger={['contextMenu']}>
            <div 
                onClick={() => onSwitchSheet(sheet.id)}
                className={`
                    group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all mb-0.5
                    ${activeSheetId === sheet.id 
                        ? 'bg-indigo-50 text-indigo-700 font-medium' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
            >
                <Table2 size={16} className={activeSheetId === sheet.id ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="truncate flex-1">{sheet.name}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                     <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                        <div className="p-1 hover:bg-slate-200 rounded">
                            <MoreHorizontal size={14} className="text-slate-500"/>
                        </div>
                     </Dropdown>
                </div>
            </div>
          </Dropdown>
      );
  };

  const newButtonItems: MenuProps['items'] = [
      { key: 'import', label: '导入 Excel', icon: <Import size={14}/> },
      { key: 'table', label: '数据表', icon: <Table2 size={14}/>, onClick: onAddSheet },
      { key: 'form', label: '收集表', icon: <FileSpreadsheet size={14}/> },
      { key: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={14}/> },
      { key: 'workflow', label: '工作流', icon: <Workflow size={14}/> },
      { type: 'divider' },
      { key: 'doc', label: '文档', icon: <FileText size={14}/> },
      { key: 'folder', label: '文件夹', icon: <Folder size={14}/> },
  ];

  return (
    <div className="w-60 h-full bg-slate-50/50 border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Header / Search */}
        <div className="p-3 mb-2">
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <Input 
                    placeholder="搜索" 
                    className="rounded-lg pl-8 text-sm bg-white border-slate-200 shadow-sm hover:border-indigo-300 focus:border-indigo-500" 
                />
            </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-6">
            
            {/* Top Pinned Items */}
            <div>
                <div className="px-3 py-1 text-xs font-medium text-slate-400 mb-1 hidden">Favorites</div>
                {/* Placeholder for pinned or special views */}
            </div>

            {/* New Button Group */}
            <div className="mb-4 px-1">
                <Dropdown menu={{ items: newButtonItems }} trigger={['click']}>
                    <button className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow transition-all group">
                        <span className="font-medium text-slate-700 text-sm">新建</span>
                        <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500"/>
                    </button>
                </Dropdown>
            </div>

            {/* Standard Categories (Mock) */}
            <div className="space-y-1">
                 {/* Static Placeholders based on user prompt image description */}
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Import size={16} className="text-green-600"/> 导入 Excel
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Table2 size={16} className="text-indigo-600"/> 数据表
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <FileSpreadsheet size={16} className="text-orange-500"/> 收集表
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <LayoutDashboard size={16} className="text-blue-500"/> 仪表盘
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Workflow size={16} className="text-purple-500"/> 工作流
                 </div>
            </div>

            {/* My Sheets Section */}
            <div>
                <div className="flex items-center justify-between px-3 py-1.5 mb-1 group cursor-pointer hover:bg-slate-100 rounded-md">
                     <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                         <Database size={12}/>
                         <span>我的工作表</span>
                     </div>
                     <button onClick={onAddSheet} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500">
                         <Plus size={14}/>
                     </button>
                </div>
                <div className="space-y-0.5">
                    {sheets.map(renderSheetItem)}
                </div>
            </div>

            {/* Other Placeholders */}
             <div className="space-y-1 pt-2 border-t border-slate-100">
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <FileText size={16} className="text-blue-400"/> 文档
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <Folder size={16} className="text-indigo-300"/> 文件夹
                 </div>
                 <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <AppWindow size={16} className="text-indigo-600"/> 应用
                 </div>
             </div>

        </div>
    </div>
  );
};

export default NavigationSidebar;
