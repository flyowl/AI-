
import React, { useEffect, useState, useMemo } from 'react';
import { Project } from '../types';
import { loadProjects, saveProject, deleteProject, toggleProjectStar } from '../services/db';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, MoreHorizontal, FileSpreadsheet, ChevronDown, Check, Trash2, Star } from 'lucide-react';
import { Dropdown, message, Input, Modal, MenuProps, Tooltip } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const Home: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Sort State
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProjects().then(setProjects);
  }, [location.pathname]);

  const handleCreateProject = async () => {
      if (!newProjectName.trim()) return;
      const newProject: Project = {
          id: crypto.randomUUID(),
          name: newProjectName,
          updatedAt: Date.now(),
          createdAt: Date.now(),
          owner: 'Me',
          description: 'New Project'
      };
      await saveProject(newProject);
      setProjects([newProject, ...projects]);
      setIsModalOpen(false);
      setNewProjectName('');
      navigate(`/project/${newProject.id}`);
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
            {/* Create New Card */}
            <div 
                onClick={() => setIsModalOpen(true)}
                className="group h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
            >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                </div>
                <span className="font-medium text-slate-600">新建未命名文件</span>
            </div>

            {sortedProjects.map(project => (
                <div 
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-48 relative"
                >
                    <div className="flex-1 bg-slate-50 p-4 relative overflow-hidden">
                        {/* Thumbnail simulation */}
                        <div className="absolute inset-4 bg-white rounded-lg shadow-sm border border-slate-100 flex items-start p-2 gap-2 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all origin-top-left">
                             <div className="w-1/3 h-2 bg-slate-100 rounded mb-1"></div>
                             <div className="w-1/3 h-2 bg-slate-100 rounded mb-1"></div>
                             <div className="w-full h-full flex flex-col gap-1 mt-2">
                                <div className="w-full h-1 bg-slate-50 rounded"></div>
                                <div className="w-3/4 h-1 bg-slate-50 rounded"></div>
                                <div className="w-1/2 h-1 bg-slate-50 rounded"></div>
                             </div>
                        </div>
                        
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
                            <h3 className="font-medium text-slate-800 truncate pr-2 flex-1" title={project.name}>{project.name}</h3>
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
            <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white flex items-center justify-between shadow-xl">
                 <div>
                     <h2 className="text-2xl font-bold mb-2">欢迎使用 Calicat 智能表格</h2>
                     <p className="text-indigo-100 max-w-xl text-sm leading-relaxed opacity-90">
                         Calicat 是下一代智能多维表格系统。利用 AI 技术，您可以一键生成数据、分析报表、构建业务系统。
                         体验前所未有的效率提升。
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

        <Modal
            title="新建项目"
            open={isModalOpen}
            onOk={handleCreateProject}
            onCancel={() => setIsModalOpen(false)}
            okText="创建"
            cancelText="取消"
        >
            <div className="py-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">项目名称</label>
                <Input 
                    value={newProjectName} 
                    onChange={e => setNewProjectName(e.target.value)} 
                    placeholder="例如：2025 市场营销计划" 
                    onPressEnter={handleCreateProject}
                    autoFocus
                />
            </div>
        </Modal>
    </div>
  );
};

export default Home;
