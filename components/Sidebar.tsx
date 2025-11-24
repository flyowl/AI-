
import React, { useState, useRef, useEffect } from 'react';
import { AIStatus, ChatMessage, View, ViewType, Sheet } from '../types';
import { Sparkles, Send, Bot, User, Layout, Plus, Trash2, LayoutGrid, Kanban, Image as ImageIcon, Table2 } from 'lucide-react';
import { Tabs, Input, Button, Modal, Select } from 'antd';

interface SidebarProps {
  // Chat Props
  messages: ChatMessage[];
  status: AIStatus;
  onSendMessage: (text: string, targetSheetId?: string) => void;
  onQuickAction: (action: 'fill' | 'analyze', targetSheetId?: string) => void;
  
  // Context Props
  sheets: Sheet[];
  activeSheetId: string;

  // View Props
  views: View[];
  activeViewId: string;
  onSwitchView: (viewId: string) => void;
  onCreateView: (name: string, type: ViewType) => void;
  onDeleteView: (viewId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    messages, status, onSendMessage, onQuickAction,
    sheets, activeSheetId,
    views, activeViewId, onSwitchView, onCreateView, onDeleteView
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewType, setNewViewType] = useState<ViewType>('grid');
  
  // Target sheet for AI Context
  const [targetSheetId, setTargetSheetId] = useState<string>(activeSheetId);

  // Sync target sheet with active sheet unless AI is busy, but allow manual override
  useEffect(() => {
    // Only auto-switch if the current target is no longer valid or we want to follow user navigation
    // The requirement says "bound to operation object", which usually means the active one.
    // We update it when activeSheetId changes.
    if (sheets.find(s => s.id === activeSheetId && s.type === 'sheet')) {
        setTargetSheetId(activeSheetId);
    }
  }, [activeSheetId, sheets]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input, targetSheetId);
    setInput('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const renderViewIcon = (type: ViewType) => {
      switch(type) {
          case 'grid': return <LayoutGrid size={16} />;
          case 'kanban': return <Kanban size={16} />;
          case 'gallery': return <ImageIcon size={16} />;
      }
  }

  // Filter only actual sheets for the dropdown
  const validSheets = sheets.filter(s => s.type === 'sheet');

  const items = [
    {
      key: 'chat',
      label: <span className="flex items-center gap-2"><Sparkles size={14}/> AI 助手</span>,
      children: (
        <div className="flex flex-col h-full">
             {/* Chat Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center mt-10 opacity-60">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600">
                            <Bot size={24} />
                        </div>
                        <p className="text-slate-500 text-sm">你好！我是你的智能表格助手。<br/>我可以帮你生成数据、分析趋势，或者创建新表。</p>
                        <div className="mt-4 flex flex-col gap-2 text-xs text-indigo-500">
                            <span className="cursor-pointer hover:underline" onClick={() => setInput('帮我创建一个运维管理表')}>“帮我创建一个运维管理表”</span>
                            <span className="cursor-pointer hover:underline" onClick={() => setInput('给当前表添加一列状态')}>“给当前表添加一列状态”</span>
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                        }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}
                
                {status === AIStatus.LOADING && (
                     <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Bot size={14} />
                        </div>
                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
             </div>

             {/* Quick Actions & Input */}
             <div className="p-4 bg-white border-t border-slate-200">
                {/* Target Sheet Selector */}
                <div className="mb-3 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <span className="text-xs text-slate-500 whitespace-nowrap">操作对象:</span>
                     <Select
                        size="small"
                        value={targetSheetId}
                        onChange={setTargetSheetId}
                        className="flex-1"
                        variant="borderless"
                        options={validSheets.map(s => ({ 
                            label: <span className="flex items-center gap-2"><Table2 size={14} className="text-indigo-500"/> {s.name}</span>, 
                            value: s.id 
                        }))}
                        popupMatchSelectWidth={false}
                     />
                </div>

                {messages.length < 2 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                        <button onClick={() => onQuickAction('fill', targetSheetId)} className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 hover:bg-indigo-100 transition-colors">
                            ✨ 智能填充
                        </button>
                        <button onClick={() => onQuickAction('analyze', targetSheetId)} className="whitespace-nowrap px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100 hover:bg-green-100 transition-colors">
                            📊 分析数据
                        </button>
                    </div>
                )}
                
                <div className="relative">
                    <Input.TextArea
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="输入指令 (如：添加一列邮箱)..."
                        className="pr-10 rounded-xl py-2.5 resize-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || status === AIStatus.LOADING}
                        className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors z-10"
                    >
                        <Send size={14} />
                    </button>
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
                                 <div className="text-[10px] text-slate-400 capitalize">{view.type === 'grid' ? '表格视图' : view.type === 'kanban' ? '看板视图' : '画廊视图'}</div>
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
      >
          <div className="space-y-4 py-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">视图名称</label>
                  <Input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="例如: 任务看板" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">视图类型</label>
                  <div className="grid grid-cols-3 gap-3">
                      {[
                          { type: 'grid', label: '表格', icon: <LayoutGrid size={20}/> },
                          { type: 'kanban', label: '看板', icon: <Kanban size={20}/> },
                          { type: 'gallery', label: '画廊', icon: <ImageIcon size={20}/> },
                      ].map(item => (
                          <div 
                            key={item.type}
                            onClick={() => setNewViewType(item.type as ViewType)}
                            className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center gap-2 transition-all ${
                                newViewType === item.type 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
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
    </div>
  );
};

export default Sidebar;
