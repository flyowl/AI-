
import React, { useEffect, useState, useMemo } from 'react';
import { Project, Sheet, View } from '../types';
import { loadProjects, saveProject, deleteProject, toggleProjectStar, syncProjectSheets } from '../services/db';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, MoreHorizontal, FileSpreadsheet, ChevronDown, Check, Trash2, Star, Table2, FileText } from 'lucide-react';
import { Dropdown, message, Input, Modal, MenuProps, Tooltip } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// Default view config for new spreadsheets
const DEFAULT_GRID_VIEW: View = {
    id: 'view-default',
    name: '表格视图',
    type: 'grid',
    config: {
        filters: [],
        filterMatchType: 'and',
        sortRule: null,
        groupBy: null,
        hiddenColumnIds: [],
        rowHeight: 'medium'
    }
};

const Home: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Sort State
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProjects().then(setProjects);
  }, [location.pathname]);

  const handleCreateProject = async (type: 'spreadsheet' | 'document') => {
      const newProjectId = crypto.randomUUID();
      const newProject: Project = {
          id: newProjectId,
          name: type === 'spreadsheet' ? '未命名多维表格' : '未命名项目文档',
          updatedAt: Date.now(),
          createdAt: Date.now(),
          owner: 'Me',
          description: type === 'spreadsheet' ? '数据管理' : '知识库与文档',
          projectType: type
      };

      // Create Initial Content based on Type
      let initialSheet: Sheet;

      if (type === 'spreadsheet') {
          initialSheet = {
            id: crypto.randomUUID(),
            name: '工作表 1',
            type: 'sheet',
            columns: [{ id: crypto.randomUUID(), label: '列 1', type: 'text' }],
            rows: [],
            views: [{ ...DEFAULT_GRID_VIEW, id: crypto.randomUUID() }],
            activeViewId: '', 
            selectedRowIds: new Set()
          };
          initialSheet.activeViewId = initialSheet.views[0].id;
      } else {
          // Document Mode: Pure Document Node
          initialSheet = {
            id: crypto.randomUUID(),
            name: '首页',
            type: 'document',
            content: '<h1>欢迎使用项目文档</h1><p>点击此处开始编辑...</p>',
            columns: [], rows: [], views: [], activeViewId: '', selectedRowIds: new Set()
          };
      }

      // Save to DB
      await saveProject(newProject);
      await syncProjectSheets(newProjectId, [initialSheet]);

      // Navigate immediately
      navigate(`/project/${newProjectId}`);
      message.success(type === 'spreadsheet' ? '多维表格已创建' : '项目文档已创建');
  };

  const handleDeleteProject = async (id: string) => {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      message.success('文件已删除');
  };
  
  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await toggleProjectStar(id);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, isStarred: !p.isStarred } : p));
  };

  // --- Filtering Logic based on Route ---
  const getPageConfig = () => {
      const path = location.pathname;
      if (path === '/') return { title: '最近', filter: () => true };
      if (path === '/files') return { title: '我的文件', filter: (p: Project) => p.owner === 'Me' };
      if (path === '/shared') return { title: '分享给我', filter: (p: Project) => p.owner !== 'Me' };
      if (path === '/starred') return { title: '星标', filter: (p: Project) => !!p.isStarred };
      if (path === '/projects') return { title: '团队项目', filter: () => true };
      if (path === '/space') return { title: '全员空间', filter: () => true };
      return { title: '最近', filter: () => true };
  };
  
  const { title, filter } = getPageConfig();

  // --- Sort Logic ---
  const sortedProjects = useMemo(() => {
    return [...projects].filter(filter).sort((a, b) => {
        let res = 0;
        if (sortField === 'name') {
            res = a.name.localeCompare(b.name, 'zh-CN');
        } else if (sortField === 'updatedAt') {
            res = a.updatedAt - b.updatedAt;
        } else if (sortField === 'createdAt') {
            res = (a.createdAt || 0) - (b.createdAt || 0);
        }
        return sortOrder === 'asc' ? res : -res;
    });
  }, [projects, sortField, sortOrder, filter]);

  const getSortLabel = () => {
    switch(sortField) {
        case 'name': return '文件名';
        case 'updatedAt': return '编辑时间';
        case 'createdAt': return '创建时间';
    }
  };

  const handleSortMenuClick: MenuProps['onClick'] = (e) => {
    const key = e.key;
    if (['name', 'updatedAt', 'createdAt'].includes(key)) {
        setSortField(key as any);
    } else if (['asc', 'desc'].includes(key)) {
        setSortOrder(key as any);
    }
  };

  // Check icon helper
  const checkIcon = (checked: boolean) => (
     checked ? <Check size={14} className="text-indigo-600"/> : <div className="w-[14px]"/>
  );

  const sortMenuItems: MenuProps['items'] = [
    { label: <span className="text-xs text-slate-400 pl-6">文件名</span>, key: 'group-1', type: 'group', children: [
        { 
            key: 'name', 
            icon: checkIcon(sortField === 'name'),
            label: '文件名'
        },
        { 
            key: 'updatedAt', 
            icon: checkIcon(sortField === 'updatedAt'),
            label: '编辑时间'
        },
        { 
            key: 'createdAt', 
            icon: checkIcon(sortField === 'createdAt'),
            label: '创建时间'
        },
    ]},
    { type: 'divider' },
    { label: <span className="text-xs text-slate-400 pl-6">排序方式</span>, key: 'group-2', type: 'group', children: [
        { 
            key: 'desc', 
            icon: checkIcon(sortOrder === 'desc'),
            label: '从近到远'
        },
        { 
            key: 'asc', 
            icon: checkIcon(sortOrder === 'asc'),
            label: '从远到近'
        },
    ]}
  ];

  const createMenu: MenuProps['items'] = [
      {
          key: 'sheet',
          label: <span className="font-medium">多维表格</span>,
          icon: <Table2 size={16} className="text-green-500" />,
          onClick: () => handleCreateProject('spreadsheet'),
          extra: <span className="text-xs text-slate-400 ml-2">Data</span>
      },
      {
          key: 'doc',
          label: <span className="font-medium">项目文档</span>,
          icon: <FileText size={16} className="text-blue-500" />,
          onClick: () => handleCreateProject('document'),
          extra: <span className="text-xs text-slate-400 ml-2">Wiki</span>
      }
  ];

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <div className="flex items-center gap-2">
                <Dropdown menu={{ items: sortMenuItems, onClick: handleSortMenuClick }} trigger={['click']} placement="bottomRight">
                    <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                        {getSortLabel()}
                        <ChevronDown size={14} />
                    </button>
                </Dropdown>
            </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create New Card - Updated with Dropdown */}
            <Dropdown menu={{ items: createMenu }} trigger={['click']} placement="bottom">
                <div 
                    className="group h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                >
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <Plus size={24} />
                    </div>
                    <span className="font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">新建未命名文件</span>
                    <span className="text-xs text-slate-400 mt-1">点击选择类型</span>
                </div>
            </Dropdown>

            {sortedProjects.map(project => (
                <div 
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-48 relative"
                >
                    <div className="flex-1 bg-slate-50 p-4 relative overflow-hidden flex items-center justify-center">
                        {/* Type Icon Indicator */}
                        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${project.projectType === 'document' ? 'from-blue-400 to-cyan-300' : 'from-green-400 to-emerald-300'}`}></div>
                        
                        {project.projectType === 'document' ? (
                            <FileText size={48} className="text-blue-200 group-hover:text-blue-400 transition-colors" />
                        ) : (
                            <Table2 size={48} className="text-green-200 group-hover:text-green-400 transition-colors" />
                        )}
                        
                        {/* Star Button */}
                        <div 
                            onClick={(e) => handleToggleStar(e, project.id)}
                            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${project.isStarred ? 'text-yellow-400 bg-white shadow-sm' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-white/80 hover:text-yellow-400'}`}
                        >
                            <Star size={16} fill={project.isStarred ? "currentColor" : "none"} />
                        </div>
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-slate-800 truncate pr-2 flex-1 flex items-center gap-2" title={project.name}>
                                {project.projectType === 'document' ? <FileText size={14} className="text-blue-500"/> : <Table2 size={14} className="text-green-500"/>}
                                {project.name}
                            </h3>
                            <Dropdown menu={{ items: [{ key: 'del', label: '删除', icon: <Trash2 size={14}/>, danger: true, onClick: () => handleDeleteProject(project.id) }] }}>
                                <div onClick={e => e.stopPropagation()} className="p-1 hover:bg-slate-100 rounded text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={14} />
                                </div>
                            </Dropdown>
                        </div>
                        <div className="flex items-center text-xs text-slate-400 gap-2">
                             <span>{project.owner === 'Me' ? '我的文件' : project.owner}</span>
                             <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                             <span>{dayjs(project.updatedAt).fromNow()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Bottom promo / CTA area - Only show on Home */}
        {location.pathname === '/' && (
            <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-600 rounded-2xl p-8 text-white flex items-center justify-between shadow-xl">
                 <div>
                     <h2 className="text-2xl font-bold mb-2">欢迎使用 Calicat 智能办公</h2>
                     <p className="text-indigo-100 max-w-xl text-sm leading-relaxed opacity-90">
                         Calicat 融合了即时文档与智能表格。无论您是需要撰写复杂的项目文档，还是管理庞大的数据业务，
                         这里都有适合您的工具。
                     </p>
                     <div className="mt-4 flex gap-3">
                         <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors">查看教程</button>
                         <button className="px-4 py-2 bg-indigo-600 border border-indigo-400 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">加入社区</button>
                     </div>
                 </div>
                 <div className="hidden lg:block">
                     {/* Decorative Icon */}
                     <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                         <FileSpreadsheet size={64} className="text-white opacity-90" />
                     </div>
                 </div>
            </div>
        )}
    </div>
  );
};

export default Home;
