
import React, { useState } from 'react';
import { 
  Search, Bell, HelpCircle, 
  FileText, Grid, Users, 
  AppWindow, Star, Clock, ChevronDown, Plus,
  Briefcase
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, message, Modal, Form, Input, MenuProps } from 'antd';
import { Team } from '../../types';

const INITIAL_TEAMS: Team[] = [
    { id: 't1', name: 'appthen 团队', memberCount: 1, role: 'Admin' },
    { id: 't2', name: 'Design Team', memberCount: 4, role: 'Editor' }
];

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTeamId, setActiveTeamId] = useState('t1');
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  
  // Modal State
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [form] = Form.useForm();

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

  const handleCreateTeam = () => {
      form.validateFields().then(values => {
          const newTeam: Team = {
              id: `t-${Date.now()}`,
              name: values.name,
              description: values.description,
              memberCount: 1,
              role: 'Admin'
          };
          setTeams([...teams, newTeam]);
          setActiveTeamId(newTeam.id);
          message.success('团队创建成功');
          setIsCreateTeamModalOpen(false);
          form.resetFields();
      });
  };

  const navItems = [
    { icon: <Clock size={18} />, label: '最近', path: '/' },
    { icon: <FileText size={18} />, label: '我的文件', path: '/files' },
    { icon: <Users size={18} />, label: '分享给我', path: '/shared' },
    { type: 'divider' },
    { icon: <Star size={18} />, label: '星标', path: '/starred' },
    { type: 'divider' },
    { label: '团队空间', type: 'header' },
    { icon: <Users size={18} />, label: '团队管理', path: '/team' },
    { icon: <Briefcase size={18} />, label: '团队项目', path: '/projects' },
    { icon: <Grid size={18} />, label: '全员空间', path: '/space' },
    { type: 'divider' },
    { icon: <AppWindow size={18} />, label: '应用市场', path: '/market' },
  ];

  const isActive = (path: string) => {
    // Exact match for root
    if (path === '/' && location.pathname === '/') return true;
    
    // Starts with match for sub-pages, but ensure we don't match root '/' against others loosely
    if (path !== '/' && location.pathname.startsWith(path)) {
        return true;
    }
    return false;
  };

  const teamMenuItems = [
      { 
          key: 'switch', 
          label: '切换团队', 
          type: 'group',
          children: teams.map(t => ({
             key: t.id,
             label: (
                 <div className="flex items-center justify-between">
                     <span>{t.name}</span>
                     {t.id === activeTeamId && <span className="text-xs text-indigo-500">当前</span>}
                 </div>
             ),
             onClick: () => setActiveTeamId(t.id)
          }))
      },
      { type: 'divider' },
      { 
          key: 'create', 
          label: '创建团队', 
          icon: <Plus size={14}/>, 
          onClick: () => setIsCreateTeamModalOpen(true) 
      },
      { 
          key: 'settings', 
          label: '设置',
          onClick: () => navigate('/settings')
      },
      { type: 'divider' },
      { 
          key: 'logout', 
          label: '退出登录', 
          danger: true,
          onClick: () => {
              message.success('已退出登录');
              navigate('/login');
          }
      }
  ];

  const notificationItems: MenuProps['items'] = [
    {
      key: 'header',
      label: <div className="text-xs font-semibold text-slate-500 px-2 pt-1 pb-1">通知中心</div>,
      type: 'group',
    },
    {
      key: '1',
      label: (
        <div className="flex gap-3 py-1 max-w-[260px]">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <FileText size={14} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-sm text-slate-800">新评论</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">5分钟前</span>
                </div>
                <div className="text-xs text-slate-500 leading-snug">Sarah 在 <span className="text-slate-700 font-medium">Q3 营销计划</span> 中评论了你</div>
            </div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <div className="flex gap-3 py-1 max-w-[260px]">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <Users size={14} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-sm text-slate-800">团队邀请</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">2小时前</span>
                </div>
                <div className="text-xs text-slate-500 leading-snug">Mike 邀请你加入 <span className="text-slate-700 font-medium">产品研发</span> 团队</div>
            </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'all',
      label: <div className="text-center text-xs text-indigo-600 py-0.5">查看全部通知</div>,
    }
  ];

  return (
    <div className="flex h-screen w-screen bg-white text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 flex items-center gap-2 mb-2">
           <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
             C
           </div>
           <span className="font-bold text-xl tracking-tight text-slate-800">calicat</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1 mt-4">
            {navItems.map((item, idx) => {
                if (item.type === 'divider') return <div key={idx} className="h-px bg-slate-200 my-2 mx-2" />;
                if (item.type === 'header') return <div key={idx} className="px-3 py-2 text-xs font-semibold text-slate-400 mt-2">{item.label}</div>;
                return (
                    <Link 
                        key={idx} 
                        to={item.path || '#'}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                            isActive(item.path!) 
                                ? 'bg-indigo-100 text-indigo-700 font-medium' 
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                )
            })}
        </nav>

        {/* User / Team Switcher */}
        <div className="p-4 border-t border-slate-200">
            <Dropdown menu={{ items: teamMenuItems as any }} trigger={['click']}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">
                        {activeTeam.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{activeTeam.name}</div>
                        <div className="text-xs text-slate-500">{activeTeam.memberCount} 人</div>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                </div>
            </Dropdown>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Top Header */}
          <header className="h-16 px-6 flex items-center justify-between border-b border-transparent">
               <div className="flex items-center flex-1 max-w-xl">
                   <div className="relative w-full">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                          type="text" 
                          placeholder="搜索文件" 
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm transition-all outline-none hover:bg-slate-100"
                       />
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                           <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">⌘ F</span>
                       </div>
                   </div>
               </div>

               <div className="flex items-center gap-4 ml-4">
                   <button className="text-slate-400 hover:text-slate-600 transition-colors">
                       <HelpCircle size={20} />
                   </button>
                   
                   <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight" arrow>
                       <button className="text-slate-400 hover:text-slate-600 transition-colors relative outline-none">
                           <Bell size={20} />
                           <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                       </button>
                   </Dropdown>

                   <Avatar className="bg-indigo-500 cursor-pointer" size="default" onClick={() => navigate('/settings')}>V</Avatar>
               </div>
          </header>

          <main className="flex-1 overflow-auto p-6 scrollbar-thin">
              <Outlet />
          </main>
      </div>

      {/* Create Team Modal */}
      <Modal
        title="创建新团队"
        open={isCreateTeamModalOpen}
        onOk={handleCreateTeam}
        onCancel={() => setIsCreateTeamModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
          <Form form={form} layout="vertical" className="pt-4">
              <Form.Item 
                name="name" 
                label="团队名称" 
                rules={[{ required: true, message: '请输入团队名称' }]}
              >
                  <Input placeholder="例如: ACME Corp Engineering" />
              </Form.Item>
              <Form.Item 
                name="description" 
                label="描述 (可选)"
              >
                  <Input.TextArea placeholder="团队的简单描述..." rows={3} />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default DashboardLayout;
