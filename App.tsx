
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import NavigationSidebar from './components/NavigationSidebar';
import SmartSpreadsheet from './components/SmartSpreadsheet';
import { Column, RowData, AIStatus, AnalysisResult, View, ViewType, ChatMessage, Sheet } from './types';
import { generateSmartRows, analyzeDataset, generateSheetFromPrompt } from './services/geminiService';
import { Sparkles } from 'lucide-react';
import { ConfigProvider, message, Modal } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Minimal Initial Data
const INITIAL_COLUMNS: Column[] = [
  { id: 'col1', label: '列 1', type: 'text' },
];

const INITIAL_ROWS: RowData[] = [];

const INITIAL_VIEW: View = {
    id: 'view-1',
    name: '主表格',
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

const App: React.FC = () => {
  // --- Multi-Sheet State ---
  const [sheets, setSheets] = useState<Sheet[]>([{
      id: 'sheet-1',
      name: '工作表 1',
      columns: [...INITIAL_COLUMNS],
      rows: [],
      views: [INITIAL_VIEW],
      activeViewId: INITIAL_VIEW.id,
      selectedRowIds: new Set()
  }]);
  const [activeSheetId, setActiveSheetId] = useState<string>('sheet-1');

  // --- Derived Active Sheet Helpers ---
  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId) || sheets[0], [sheets, activeSheetId]);
  
  const updateActiveSheet = (updater: (sheet: Sheet) => Sheet) => {
      setSheets(prev => prev.map(s => s.id === activeSheetId ? updater(s) : s));
  };

  // Chat / AI State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus>(AIStatus.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // --- View Management Handlers ---
  const handleCreateView = (name: string, type: ViewType) => {
      const newView: View = {
          id: crypto.randomUUID(),
          name,
          type,
          config: { ...INITIAL_VIEW.config } 
      };
      updateActiveSheet(sheet => ({
          ...sheet,
          views: [...sheet.views, newView],
          activeViewId: newView.id
      }));
      message.success('视图已创建');
  };

  const handleDeleteView = (viewId: string) => {
      updateActiveSheet(sheet => {
          if (sheet.views.length <= 1) { message.warning('至少保留一个视图'); return sheet; }
          const newViews = sheet.views.filter(v => v.id !== viewId);
          return {
              ...sheet,
              views: newViews,
              activeViewId: sheet.activeViewId === viewId ? newViews[0].id : sheet.activeViewId
          };
      });
  };

  const handleSwitchView = (viewId: string) => {
      updateActiveSheet(sheet => ({ ...sheet, activeViewId: viewId }));
  };

  // --- Sheet Management Handlers ---
  const handleAddSheet = () => {
      const newSheet: Sheet = {
          id: crypto.randomUUID(),
          name: `工作表 ${sheets.length + 1}`,
          columns: [{ id: crypto.randomUUID(), label: '列 1', type: 'text' }],
          rows: [],
          views: [{ ...INITIAL_VIEW, id: crypto.randomUUID() }],
          activeViewId: INITIAL_VIEW.id, // This might be buggy if IDs are not unique in the View object but INITIAL_VIEW has a static ID. Let's fix that in initialization.
          selectedRowIds: new Set()
      };
      // Fix activeViewId reference for the new sheet
      newSheet.activeViewId = newSheet.views[0].id;

      setSheets([...sheets, newSheet]);
      setActiveSheetId(newSheet.id);
      message.success('新工作表已创建');
  };

  const handleDeleteSheet = (id: string) => {
      if (sheets.length <= 1) {
          message.warning('至少需要保留一个工作表');
          return;
      }
      Modal.confirm({
          title: '删除工作表',
          content: '确定要删除这个工作表吗？此操作无法撤销。',
          okType: 'danger',
          onOk: () => {
              const newSheets = sheets.filter(s => s.id !== id);
              setSheets(newSheets);
              if (activeSheetId === id) setActiveSheetId(newSheets[0].id);
              message.success('工作表已删除');
          }
      })
  };

  const handleRenameSheet = (id: string) => {
      const sheet = sheets.find(s => s.id === id);
      if(!sheet) return;
      let newName = sheet.name;
      Modal.confirm({
          title: '重命名工作表',
          content: <input className="w-full border p-2 rounded" defaultValue={sheet.name} onChange={e => newName = e.target.value} autoFocus />,
          onOk: () => {
              if(newName.trim()) {
                  setSheets(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
              }
          }
      });
  };

  // --- AI & Generation ---
  const addMessage = (role: 'user' | 'ai', content: string) => {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content, timestamp: Date.now() }]);
  };

  const executeAiAction = async (action: 'fill' | 'analyze' | 'chat', payload?: string) => {
      setAiStatus(AIStatus.LOADING);
      try {
          if (action === 'fill') {
              const newRows = await generateSmartRows(activeSheet.columns, activeSheet.rows, 50);
              updateActiveSheet(sheet => ({ ...sheet, rows: [...sheet.rows, ...newRows] }));
              addMessage('ai', '✅ 已为您智能填充 50 行新数据。');
          } else if (action === 'analyze') {
              const result = await analyzeDataset(activeSheet.columns, activeSheet.rows);
              setAnalysis(result);
              addMessage('ai', `📊 分析完成！\n\n**摘要**: ${result.summary}\n\n**关键趋势**:\n${result.keyTrends.map(t => `- ${t}`).join('\n')}\n\n建议图表: ${result.suggestedChartType}。`);
          } else if (action === 'chat' && payload) {
             // Heuristic check for Create/Generate intent
             const lowerPrompt = payload.toLowerCase();
             const isCreationRequest = /(生成|创建|建一个|make|create|generate)/.test(lowerPrompt) && /(表|单|list|sheet|table)/.test(lowerPrompt);

             if (isCreationRequest) {
                 addMessage('ai', '正在为您生成数据表，请稍候...');
                 const { columns, rows } = await generateSheetFromPrompt(payload);
                 
                 // Determine a name from prompt or default
                 let sheetName = "AI 生成表格";
                 const match = payload.match(/(?:关于|for)\s*(.+)/);
                 if(match) sheetName = match[1].slice(0, 10);
                 
                 const newSheet: Sheet = {
                     id: crypto.randomUUID(),
                     name: sheetName,
                     columns: columns,
                     rows: rows,
                     views: [INITIAL_VIEW],
                     activeViewId: INITIAL_VIEW.id,
                     selectedRowIds: new Set()
                 };
                 
                 setSheets(prev => [...prev, newSheet]);
                 setActiveSheetId(newSheet.id);
                 addMessage('ai', `✅ 已成功创建“${sheetName}”，包含 ${columns.length} 个字段和 ${rows.length} 条示例数据。`);
             } else if (payload.includes('填充') || payload.includes('数据')) {
                 await executeAiAction('fill');
             } else if (payload.includes('分析') || payload.includes('图表')) {
                 await executeAiAction('analyze');
             } else {
                 // Generic Chat Response
                 setTimeout(() => {
                      addMessage('ai', '收到。我可以帮您：\n1. 生成全新的数据表 (例如: "生成一个CRM客户列表")\n2. 填充当前表格数据\n3. 分析当前数据趋势');
                      setAiStatus(AIStatus.SUCCESS);
                 }, 800);
                 return;
             }
          }
          setAiStatus(AIStatus.SUCCESS);
      } catch (error) {
          console.error(error);
          setAiStatus(AIStatus.ERROR);
          addMessage('ai', '抱歉，执行任务时遇到了问题，请重试。');
      }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
        },
      }}
    >
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        
        {/* Left Navigation Sidebar */}
        <NavigationSidebar 
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSwitchSheet={setActiveSheetId}
            onAddSheet={handleAddSheet}
            onRenameSheet={handleRenameSheet}
            onDeleteSheet={handleDeleteSheet}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20 shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">{activeSheet.name}</h1>
            </div>
            
            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500 border border-slate-200">
                  视图: {activeSheet.views.find(v => v.id === activeSheet.activeViewId)?.name}
                </span>
                <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`p-1.5 rounded-md transition-colors border border-transparent ${showSidebar ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Sparkles size={18} />
                </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 flex overflow-hidden p-0 bg-slate-50/50 relative">
            {/* 
              SmartSpreadsheet Component
              Encapsulates: Toolbar, Table/Kanban/Gallery Views, Filters, Sorting, Logic 
            */}
            <SmartSpreadsheet 
                columns={activeSheet.columns}
                rows={activeSheet.rows}
                views={activeSheet.views}
                activeViewId={activeSheet.activeViewId}
                selectedRowIds={activeSheet.selectedRowIds}
                analysisResult={analysis}
                
                // State Updates via Callbacks
                onRowsChange={(newRows) => updateActiveSheet(s => ({ ...s, rows: newRows }))}
                onColumnsChange={(newCols) => updateActiveSheet(s => ({ ...s, columns: newCols }))}
                onViewsChange={(newViews) => updateActiveSheet(s => ({ ...s, views: newViews }))}
                onActiveViewChange={(id) => updateActiveSheet(s => ({ ...s, activeViewId: id }))}
                onSelectionChange={(newSet) => updateActiveSheet(s => ({ ...s, selectedRowIds: newSet }))}
            />

            {/* Right Sidebar (Chat) */}
            <div className={`transition-all duration-300 ease-in-out border-l border-slate-200 bg-white ${showSidebar ? 'w-96' : 'w-0 opacity-0 overflow-hidden'}`}>
               <Sidebar 
                 messages={messages}
                 status={aiStatus}
                 onSendMessage={(text) => { addMessage('user', text); executeAiAction('chat', text); }}
                 onQuickAction={(action) => { addMessage('user', action === 'fill' ? '智能填充' : '分析数据'); executeAiAction(action); }}
                 views={activeSheet.views}
                 activeViewId={activeSheet.activeViewId}
                 onSwitchView={handleSwitchView}
                 onCreateView={handleCreateView}
                 onDeleteView={handleDeleteView}
               />
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
