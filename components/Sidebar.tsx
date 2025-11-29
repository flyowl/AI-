

import React, { useState, useRef, useEffect } from 'react';
import { AIStatus, ChatMessage, View, ViewType, Sheet, UserRole, AppPermissions, RoleDef, RoleCapabilities } from '../types';
import { Sparkles, Send, Bot, User, Layout, Plus, Trash2, LayoutGrid, Kanban, Image as ImageIcon, Database, Wand2, BarChart3, Settings2, Info, CalendarRange, ListChecks, Settings, ShieldAlert, Edit, UserCog } from 'lucide-react';
import { Tabs, Input, Button, Modal, Select, Radio, Checkbox, Form, message, Tooltip } from 'antd';
import PermissionModal from './PermissionModal';

export type AIMode = 'create_project' | 'modify_table' | 'fill_data' | 'analyze_data' | 'analyze_row_data';

interface SidebarProps {
  // Chat Props
  messages: ChatMessage[];
  status: AIStatus;
  onSendMessage: (text: string, mode: AIMode, targetSheetId?: string) => void;
  
  // Context Props
  sheets: Sheet[];
  activeSheetId: string;

  // View Props
  views: View[];
  activeViewId: string;
  onSwitchView: (viewId: string) => void;
  onCreateView: (name: string, type: ViewType) => void;
  onDeleteView: (viewId: string) => void;

  // Role & Permissions
  currentUserRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  roles: RoleDef[];
  onRolesChange: (roles: RoleDef[]) => void;
  permissions: AppPermissions;
  onUpdatePermissions: (perms: AppPermissions) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    messages, status, onSendMessage,
    sheets, activeSheetId,
    views, activeViewId, onSwitchView, onCreateView, onDeleteView,
    currentUserRole, onRoleChange,
    roles, onRolesChange,
    permissions, onUpdatePermissions
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewType, setNewViewType] = useState<ViewType>('grid');
  
  // Role Management State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleForm] = Form.useForm();
  
  // AI Control State
  const [aiMode, setAiMode] = useState<AIMode>('create_project');
  const [targetSheetId, setTargetSheetId] = useState<string>(activeSheetId);

  // Sync target sheet
  useEffect(() => {
    if (sheets.find(s => s.id === activeSheetId && s.type === 'sheet')) {
        setTargetSheetId(activeSheetId);
    }
  }, [activeSheetId, sheets]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = () => {
    if (!input.trim() && aiMode !== 'analyze_data' && aiMode !== 'analyze_row_data') return; 
    onSendMessage(input, aiMode, targetSheetId);
    setInput('');
  };

  const handleSaveRole = () => {
    roleForm.validateFields().then((values) => {
        const newRole: RoleDef = {
            id: crypto.randomUUID(),
            name: values.name,
            description: values.description || '自定义角色',
            isSystem: false,
            capabilities: {
                canManageSheets: values.canManageSheets,
                canEditSchema: values.canEditSchema,
                canEditData: values.canEditData
            }
        };

        // Initialize permissions for new role
        const newPerms = { ...permissions };
        newPerms[newRole.id] = { sheetVisibility: {}, columnVisibility: {}, columnReadonly: {} };
        
        onUpdatePermissions(newPerms);
        onRolesChange([...roles, newRole]);
        message.success('角色已创建');
        setIsRoleModalOpen(false);
        roleForm.resetFields();
    });
  };

  const handleDeleteRole = (id: string) => {
      Modal.confirm({
          title: '删除角色',
          content: '确定要删除此角色吗？',
          onOk: () => {
              const newRoles = roles.filter(r => r.id !== id);
              onRolesChange(newRoles);
              // Fallback if deleting current role
              if (currentUserRole === id) onRoleChange('Viewer');
              message.success('角色已删除');
          }
      })
  };

  const renderViewIcon = (type: ViewType) => {
      switch(type) {
          case 'grid': return <LayoutGrid size={16} />;
          case 'kanban': return <Kanban size={16} />;
          case 'gallery': return <ImageIcon size={16} />;
          case 'gantt': return <CalendarRange size={16} />;
      }
  }

  const validSheets = sheets.filter(s => s.type === 'sheet');

  const getModeInfo = () => {
      switch(aiMode) {
          case 'create_project': return { placeholder: '描述你想创建的系统，如：简单的 CRM...', hint: '生成多张关联表格' };
          case 'modify_table': return { placeholder: '如：添加一列“优先级”，类型为单选...', hint: '修改当前表结构' };
          case 'fill_data': return { placeholder: '如：生成 20 条关于科技公司的模拟数据...', hint: '智能填充数据 (参考表结构)' };
          case 'analyze_data': return { placeholder: '如：分析销售额趋势，推荐图表...', hint: '生成图表与洞察' };
          case 'analyze_row_data': return { placeholder: '如：分析这些数据的共同点...', hint: '仅分析当前选中的行数据 (Max 100)' };
      }
  };
  
  const modeInfo = getModeInfo();

  const items = [
    {
      key: 'chat',
      label: <span className="flex items-center gap-2"><Sparkles size={14}/> AI 助手</span>,
      children: (
        <div className="flex flex-col h-full bg-slate-50/50">
             {/* Chat Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center mt-8 px-4">
                        <div className="w-12 h-12 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm">
                            <Bot size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">我是你的智能表格助手</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">请在下方选择功能模式，我可以帮你搭建系统、修改结构、填充数据或分析报表。</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-left">
                            <div onClick={() => { setAiMode('create_project'); setInput('创建一个进销存管理系统'); }} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all">
                                <div className="text-indigo-600 mb-1"><Database size={16}/></div>
                                <div className="text-xs font-medium text-slate-700">创建项目</div>
                                <div className="text-[10px] text-slate-400">生成多表系统</div>
                            </div>
                             <div onClick={() => { setAiMode('fill_data'); setInput('帮我生成 20 条测试数据'); }} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all">
                                <div className="text-pink-500 mb-1"><Wand2 size={16}/></div>
                                <div className="text-xs font-medium text-slate-700">填充数据</div>
                                <div className="text-[10px] text-slate-400">智能生成内容</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-white border-slate-200 text-slate-600' : 'bg-indigo-600 border-indigo-600 text-white'}`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                        }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}
                
                {status === AIStatus.LOADING && (
                     <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Bot size={14} />
                        </div>
                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1.5 items-center">
                                <span className="text-xs text-slate-500 mr-2">正在思考...</span>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
             </div>

             {/* Functional Input Area */}
             <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                
                {/* 1. Mode Selector */}
                <div className="mb-3">
                    <Select
                        value={aiMode}
                        onChange={setAiMode}
                        className="w-full"
                        options={[
                            { value: 'create_project', label: <span className="flex items-center gap-2"><Database size={14} className="text-purple-500"/> 创建项目 (多表)</span> },
                            { value: 'modify_table', label: <span className="flex items-center gap-2"><Settings2 size={14} className="text-blue-500"/> 单表处理 (修改结构)</span> },
                            { value: 'fill_data', label: <span className="flex items-center gap-2"><Wand2 size={14} className="text-pink-500"/> 填充数据 (当前表)</span> },
                            { value: 'analyze_data', label: <span className="flex items-center gap-2"><BarChart3 size={14} className="text-orange-500"/> 分析数据 (当前表)</span> },
                            { value: 'analyze_row_data', label: <span className="flex items-center gap-2"><ListChecks size={14} className="text-emerald-500"/> 行数据分析 (选中行)</span> },
                        ]}
                    />
                </div>

                {/* 2. Target Selector (Only for Single Table Modes) */}
                {aiMode !== 'create_project' && (
                    <div className="mb-3 flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                         <span className="text-[10px] text-slate-400 uppercase tracking-wider">目标:</span>
                         <Select
                            size="small"
                            value={targetSheetId}
                            onChange={setTargetSheetId}
                            className="flex-1 text-xs"
                            variant="borderless"
                            options={validSheets.map(s => ({ 
                                label: <span className="flex items-center gap-2 text-slate-700">{s.name}</span>, 
                                value: s.id 
                            }))}
                            popupMatchSelectWidth={false}
                         />
                    </div>
                )}

                {/* 3. Input */}
                <div className="relative">
                    <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={modeInfo.placeholder}
                        className="pr-10 rounded-xl py-2.5 resize-none bg-slate-50 focus:bg-white text-sm"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && aiMode !== 'analyze_data' && aiMode !== 'analyze_row_data') || status === AIStatus.LOADING}
                        className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors z-10 shadow-sm"
                    >
                        <Send size={14} />
                    </button>
                </div>
                
                <div className="mt-2 flex justify-between items-center px-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Info size={10}/> {modeInfo.hint}
                    </span>
                    <span className="text-[10px] text-slate-300">Gemini 2.5 Flash</span>
                </div>
             </div>
        </div>
      ),
    },
    {
      key: 'views',
      label: <span className="flex items-center gap-2"><Layout size={14}/> 视图管理</span>,
      children: (
        <div className="flex flex-col h-full p-4">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="font-medium text-slate-700">我的视图</h3>
                 <Button type="dashed" size="small" icon={<Plus size={14}/>} onClick={() => setIsViewModalOpen(true)}>新建</Button>
             </div>
             
             <div className="space-y-2">
                 {views.map(view => (
                     <div 
                        key={view.id}
                        onClick={() => onSwitchView(view.id)}
                        className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            activeViewId === view.id 
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                        }`}
                     >
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-md ${activeViewId === view.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                 {renderViewIcon(view.type)}
                             </div>
                             <div>
                                 <div className={`text-sm font-medium ${activeViewId === view.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                     {view.name}
                                 </div>
                                 <div className="text-[10px] text-slate-400 capitalize">
                                    {view.type === 'grid' ? '表格视图' : view.type === 'kanban' ? '看板视图' : view.type === 'gallery' ? '画廊视图' : '甘特图'}
                                 </div>
                             </div>
                         </div>
                         {views.length > 1 && (
                            <Button 
                                type="text" 
                                size="small" 
                                danger 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                icon={<Trash2 size={14} />} 
                                onClick={(e) => { e.stopPropagation(); onDeleteView(view.id); }} 
                            />
                         )}
                     </div>
                 ))}
             </div>
        </div>
      ),
    },
    {
      key: 'settings',
      label: <span className="flex items-center gap-2"><Settings size={14}/> 设置</span>,
      children: (
        <div className="p-4 h-full bg-slate-50/50 overflow-y-auto">
             
             {/* Role Switcher */}
             <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-4">
                <div className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <User size={16} className="text-indigo-600"/>
                    当前角色 (测试模式)
                </div>
                <div className="text-xs text-slate-500 mb-4 leading-relaxed">
                    切换不同的用户角色，体验系统在不同权限下的表现。
                </div>
                
                <Radio.Group 
                    value={currentUserRole} 
                    onChange={e => onRoleChange(e.target.value)}
                    className="flex flex-col gap-3"
                >
                    {roles.map(role => (
                        <Radio key={role.id} value={role.id} className="items-start">
                            <div className="ml-1">
                                <span className="text-sm font-medium block text-slate-700">
                                    {role.name} 
                                    {role.isSystem && <span className="text-xs text-slate-400 ml-2 bg-slate-100 px-1 rounded">系统</span>}
                                </span>
                                <span className="text-xs text-slate-400 block mt-0.5">{role.description}</span>
                            </div>
                        </Radio>
                    ))}
                </Radio.Group>
             </div>

             {/* Role Management */}
             <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-4">
                 <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        <UserCog size={16} className="text-indigo-600"/>
                        角色管理
                    </div>
                    <Button size="small" icon={<Plus size={14}/>} onClick={() => setIsRoleModalOpen(true)}>添加角色</Button>
                 </div>
                 
                 <div className="space-y-2">
                    {roles.map(role => (
                        <div key={role.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-colors">
                            <div className="text-xs font-medium text-slate-700">{role.name}</div>
                            {!role.isSystem && (
                                <Button 
                                    type="text" 
                                    size="small" 
                                    danger 
                                    icon={<Trash2 size={12}/>} 
                                    onClick={() => handleDeleteRole(role.id)}
                                />
                            )}
                        </div>
                    ))}
                 </div>
             </div>

             {/* Permission Config Button */}
             <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                 <div className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-blue-600"/>
                    字段权限
                 </div>
                 <div className="text-xs text-slate-500 mb-3">
                     配置各个角色的表格与字段可见性及编辑权限。
                 </div>
                 <Button type="default" block size="small" onClick={() => setIsPermModalOpen(true)}>
                     配置可见性
                 </Button>
             </div>
        </div>
      )
    }
  ];

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20">
      <Tabs 
        defaultActiveKey="chat" 
        items={items} 
        className="h-full flex flex-col [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav]:px-4 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-tabpane]:h-full"
      />

      <Modal
        title="新建视图"
        open={isViewModalOpen}
        onOk={() => {
            if(!newViewName.trim()) return;
            onCreateView(newViewName, newViewType);
            setIsViewModalOpen(false);
            setNewViewName('');
            setNewViewType('grid');
        }}
        onCancel={() => setIsViewModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={500}
      >
          <div className="space-y-4 py-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">视图名称</label>
                  <Input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="例如: 任务甘特图" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">视图类型</label>
                  <div className="grid grid-cols-2 gap-3">
                      {[
                          { type: 'grid', label: '表格', icon: <LayoutGrid size={20}/> },
                          { type: 'kanban', label: '看板', icon: <Kanban size={20}/> },
                          { type: 'gallery', label: '画廊', icon: <ImageIcon size={20}/> },
                          { type: 'gantt', label: '甘特图', icon: <CalendarRange size={20}/> },
                      ].map(item => (
                          <div 
                            key={item.type}
                            onClick={() => setNewViewType(item.type as ViewType)}
                            className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all ${
                                newViewType === item.type 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                              {item.icon}
                              <span className="text-xs font-medium">{item.label}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </Modal>

      <PermissionModal 
          isOpen={isPermModalOpen}
          onClose={() => setIsPermModalOpen(false)}
          sheets={sheets}
          permissions={permissions}
          onSave={onUpdatePermissions}
          roles={roles}
      />

      {/* Role Creation Modal */}
      <Modal
          title="创建新角色"
          open={isRoleModalOpen}
          onOk={handleSaveRole}
          onCancel={() => setIsRoleModalOpen(false)}
          okText="创建"
          cancelText="取消"
      >
          <Form form={roleForm} layout="vertical" className="pt-4">
              <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
                  <Input placeholder="例如: 财务专员" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                  <Input placeholder="角色描述..." />
              </Form.Item>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-3 uppercase">基础能力配置</div>
                  <Form.Item name="canManageSheets" valuePropName="checked" initialValue={false}>
                      <Checkbox>允许管理工作表 (创建/删除/重命名)</Checkbox>
                  </Form.Item>
                  <Form.Item name="canEditSchema" valuePropName="checked" initialValue={false}>
                      <Checkbox>允许修改表结构 (添加/编辑/删除列)</Checkbox>
                  </Form.Item>
                  <Form.Item name="canEditData" valuePropName="checked" initialValue={true}>
                      <Checkbox>允许编辑数据 (添加/修改/删除行)</Checkbox>
                  </Form.Item>
              </div>
          </Form>
      </Modal>
    </div>
  );
};

export default Sidebar;