
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NavigationSidebar from '../components/NavigationSidebar';
import SmartSpreadsheet from '../components/SmartSpreadsheet';
import { Column, RowData, AIStatus, AnalysisResult, View, ViewType, ChatMessage, Sheet } from '../types';
import { generateSmartRows, analyzeDataset, generateSystem, processAgentCommand } from '../services/geminiService';
import { loadProjectSheets, syncProjectSheets, loadProjects } from '../services/db';
import { Sparkles, Folder, ArrowLeft } from 'lucide-react';
import { ConfigProvider, message, Modal, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';

// Minimal Initial Data
const INITIAL_COLUMNS: Column[] = [
  { id: 'col1', label: '列 1', type: 'text' },
];

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

const ProjectEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // --- Multi-Sheet State ---
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [projectName, setProjectName] = useState('加载中...');

  // --- Persistence Logic ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Initial Load
  useEffect(() => {
    if (!projectId) return;

    const initData = async () => {
        // Load Project Meta
        const projects = await loadProjects();
        const currentProject = projects.find(p => p.id === projectId);
        if (currentProject) setProjectName(currentProject.name);

        // Load Sheets
        const loadedSheets = await loadProjectSheets(projectId);
        if (loadedSheets.length > 0) {
            setSheets(loadedSheets);
            const firstSheet = loadedSheets.find(s => s.type === 'sheet');
            if (firstSheet) setActiveSheetId(firstSheet.id);
        } else {
            // Initialize Default Data if DB is empty for this project
            const defaultSheet: Sheet = {
                id: crypto.randomUUID(),
                name: '工作表 1',
                type: 'sheet',
                columns: [...INITIAL_COLUMNS],
                rows: [],
                views: [INITIAL_VIEW],
                activeViewId: INITIAL_VIEW.id,
                selectedRowIds: new Set()
            };
            setSheets([defaultSheet]);
            setActiveSheetId(defaultSheet.id);
        }
        setIsLoaded(true);
    };
    initData();
  }, [projectId]);

  // 2. Auto-Save Debounce
  useEffect(() => {
    if (!isLoaded || !projectId) return;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        syncProjectSheets(projectId, sheets);
    }, 1000); 

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sheets, isLoaded, projectId]);


  // --- Derived Active Sheet Helpers ---
  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId) || sheets.find(s => s.type === 'sheet'), [sheets, activeSheetId]);
  
  const updateActiveSheet = (updater: (sheet: Sheet) => Sheet) => {
      setSheets(prev => prev.map(s => s.id === activeSheetId ? updater(s) : s));
  };
  
  const updateSheetById = (id: string, updater: (sheet: Sheet) => Sheet) => {
      setSheets(prev => prev.map(s => s.id === id ? updater(s) : s));
  };

  // Chat / AI State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus>(AIStatus.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // --- Handlers (View, Sheet, AI) copied from original App.tsx ---
  // ... (Identical logic, just context aware) ...
  
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

  const handleAddSheet = () => {
      const newSheet: Sheet = {
          id: crypto.randomUUID(),
          name: `工作表 ${sheets.filter(s => s.type === 'sheet').length + 1}`,
          type: 'sheet',
          columns: [{ id: crypto.randomUUID(), label: '列 1', type: 'text' }],
          rows: [],
          views: [{ ...INITIAL_VIEW, id: crypto.randomUUID() }],
          activeViewId: INITIAL_VIEW.id,
          selectedRowIds: new Set()
      };
      newSheet.activeViewId = newSheet.views[0].id;
      setSheets([...sheets, newSheet]);
      setActiveSheetId(newSheet.id);
      message.success('新工作表已创建');
  };

  const handleAddFolder = () => {
    const newFolder: Sheet = {
        id: crypto.randomUUID(),
        name: `新建文件夹 ${sheets.filter(s => s.type === 'folder').length + 1}`,
        type: 'folder',
        isOpen: true,
        columns: [], rows: [], views: [], activeViewId: '', selectedRowIds: new Set()
    };
    setSheets([...sheets, newFolder]);
  };

  const handleToggleFolder = (id: string) => {
      setSheets(prev => prev.map(s => s.id === id ? { ...s, isOpen: !s.isOpen } : s));
  };

  const handleDeleteSheet = (id: string) => {
      const sheetToDelete = sheets.find(s => s.id === id);
      if (!sheetToDelete) return;
      const remainingSheets = sheets.filter(s => s.id !== id && s.type === 'sheet');
      if (sheetToDelete.type === 'sheet' && remainingSheets.length === 0) {
          message.warning('至少需要保留一个工作表');
          return;
      }
      Modal.confirm({
          title: `删除${sheetToDelete.type === 'folder' ? '文件夹' : '工作表'}`,
          content: `确定要删除“${sheetToDelete.name}”吗？此操作无法撤销。`,
          okType: 'danger',
          onOk: () => {
              let idsToDelete = new Set([id]);
              if (sheetToDelete.type === 'folder') {
                  const findDescendants = (parentId: string) => {
                      sheets.filter(s => s.parentId === parentId).forEach(s => {
                          idsToDelete.add(s.id);
                          if(s.type === 'folder') findDescendants(s.id);
                      });
                  }
                  findDescendants(id);
              }
              const newSheets = sheets.filter(s => !idsToDelete.has(s.id));
              setSheets(newSheets);
              if (idsToDelete.has(activeSheetId)) {
                  const fallback = newSheets.find(s => s.type === 'sheet');
                  if (fallback) setActiveSheetId(fallback.id);
              }
              message.success('已删除');
          }
      })
  };

  const handleRenameSheet = (id: string, newName: string) => {
      if (!newName.trim()) return;
      setSheets(prev => prev.map(s => s.id === id ? { ...s, name: newName.trim() } : s));
  };

  const handleMoveSheet = (dragId: string, targetId: string, position: 'top' | 'bottom' | 'inside') => {
      if (dragId === targetId) return;
      setSheets(prev => {
          const dragItemIndex = prev.findIndex(s => s.id === dragId);
          if (dragItemIndex === -1) return prev;
          const dragItem = prev[dragItemIndex];
          if (dragItem.type === 'folder') {
               let current = prev.find(s => s.id === targetId);
               while (current?.parentId) {
                   if (current.parentId === dragId) {
                       message.warning('无法将文件夹移动到其子目录中');
                       return prev; 
                   }
                   current = prev.find(s => s.id === current.parentId);
               }
               if (targetId === dragId) return prev;
          }
          const newSheets = [...prev];
          newSheets.splice(dragItemIndex, 1);
          let newParentId = dragItem.parentId;
          if (position === 'inside') {
              newParentId = targetId;
              const targetFolderIndex = newSheets.findIndex(s => s.id === targetId);
              if (targetFolderIndex !== -1) newSheets[targetFolderIndex] = { ...newSheets[targetFolderIndex], isOpen: true };
              newSheets.push({ ...dragItem, parentId: newParentId });
          } else {
              const targetItem = prev.find(s => s.id === targetId);
              if (!targetItem) return prev;
              newParentId = targetItem.parentId;
              const targetIndex = newSheets.findIndex(s => s.id === targetId);
              if (position === 'top') newSheets.splice(targetIndex, 0, { ...dragItem, parentId: newParentId });
              else newSheets.splice(targetIndex + 1, 0, { ...dragItem, parentId: newParentId });
          }
          return newSheets;
      });
  };

  const handleImportSheets = (importedData: any) => {
      try {
          if (!Array.isArray(importedData)) throw new Error("格式错误");
          const restoredSheets: Sheet[] = importedData.map((s: any) => ({
              ...s,
              selectedRowIds: new Set(s.selectedRowIds || [])
          }));
          setSheets(restoredSheets);
          const firstSheet = restoredSheets.find(s => s.type === 'sheet');
          if (firstSheet) setActiveSheetId(firstSheet.id);
          message.success('数据导入成功');
      } catch (e) {
          console.error(e);
          message.error('导入失败，文件格式不正确');
      }
  };

  const addMessage = (role: 'user' | 'ai', content: string) => {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content, timestamp: Date.now() }]);
  };

  const executeAiAction = async (action: 'fill' | 'analyze' | 'chat', payload?: string, targetSheetId?: string) => {
      setAiStatus(AIStatus.LOADING);
      const targetSheet = sheets.find(s => s.id === targetSheetId) || activeSheet;
      const targetId = targetSheet?.id;

      if (action !== 'chat' && (!targetSheet || !targetId)) {
          addMessage('ai', '请先选择一个有效的工作表。');
          setAiStatus(AIStatus.ERROR);
          return;
      }

      try {
          if (action === 'fill') {
              if (!targetSheet) return;
              const newRows = await generateSmartRows(targetSheet.columns, targetSheet.rows, 50);
              updateSheetById(targetSheet.id, sheet => ({ ...sheet, rows: [...sheet.rows, ...newRows] }));
              addMessage('ai', `✅ 已为“${targetSheet.name}”智能填充 50 行新数据。`);
          } else if (action === 'analyze') {
              if (!targetSheet) return;
              const result = await analyzeDataset(targetSheet.columns, targetSheet.rows);
              setAnalysis(result);
              addMessage('ai', `📊 “${targetSheet.name}” 分析完成！\n\n**摘要**: ${result.summary}\n\n**关键趋势**:\n${result.keyTrends.map(t => `- ${t}`).join('\n')}\n\n建议图表: ${result.suggestedChartType}。`);
          } else if (action === 'chat' && payload) {
             const result = await processAgentCommand(payload, targetSheet?.columns || [], targetSheet?.name || 'New');
             addMessage('ai', result.reply);
             if (result.type === 'ADD_COLUMN' && result.data && targetId) {
                updateSheetById(targetId, s => ({
                    ...s,
                    columns: [...s.columns, { id: crypto.randomUUID(), label: result.data.label, type: result.data.columnType }]
                }));
             }
             else if (result.type === 'DELETE_COLUMN' && result.data && targetId) {
                updateSheetById(targetId, s => ({
                    ...s,
                    columns: s.columns.filter(c => !c.label.toLowerCase().includes(result.data.label.toLowerCase()))
                }));
             }
             else if (result.type === 'RENAME_COLUMN' && result.data && targetId) {
                updateSheetById(targetId, s => ({
                    ...s,
                    columns: s.columns.map(c => c.label === result.data.oldLabel ? { ...c, label: result.data.newLabel } : c)
                }));
             }
             else if (result.type === 'FILL_DATA' && targetSheet) {
                 const count = result.data?.count || 20;
                 const newRows = await generateSmartRows(targetSheet.columns, targetSheet.rows, count);
                 updateSheetById(targetId!, sheet => ({ ...sheet, rows: [...sheet.rows, ...newRows] }));
             }
             else if (result.type === 'ANALYZE_DATA') {
                 await executeAiAction('analyze', undefined, targetId);
             }
             else if (result.type === 'CREATE_SHEET' && result.data) {
                 const blueprints = await generateSystem(result.data.prompt);
                 if (blueprints.length === 0) {
                     addMessage('ai', '未能生成表格，请稍后重试。'); return;
                 }
                 const sheetMap = new Map<string, string>(); 
                 blueprints.forEach(bp => sheetMap.set(bp.name, crypto.randomUUID()));
                 const newSheets: Sheet[] = [];
                 for (const bp of blueprints) {
                     const sheetId = sheetMap.get(bp.name)!;
                     const columns: Column[] = bp.columns.map((colDef: any) => {
                         let relationConfig;
                         if (colDef.type === 'relation' && colDef.targetSheetName) {
                             const tId = sheetMap.get(colDef.targetSheetName);
                             if (tId) relationConfig = { targetSheetId: tId };
                             else colDef.type = 'text';
                         }
                         return { id: crypto.randomUUID(), label: colDef.label, type: colDef.type, options: colDef.options, relationConfig };
                     });
                     const rows: RowData[] = (bp.sampleRows || []).map((r: any) => {
                         const row: RowData = { id: crypto.randomUUID() };
                         columns.forEach(c => row[c.id] = c.type === 'relation' ? [] : r[c.label]);
                         return row;
                     });
                     const viewId = crypto.randomUUID();
                     newSheets.push({
                         id: sheetId, name: bp.name, type: 'sheet', columns, rows,
                         views: [{ id: viewId, name: '主表格', type: 'grid', config: { ...INITIAL_VIEW.config } }],
                         activeViewId: viewId, selectedRowIds: new Set()
                     });
                 }
                 setSheets(prev => [...prev, ...newSheets]);
                 if (newSheets.length > 0) setActiveSheetId(newSheets[0].id);
                 addMessage('ai', `✅ 已构建系统: ${newSheets.map(s => s.name).join(', ')}。`);
             }
          }
          setAiStatus(AIStatus.SUCCESS);
      } catch (error) {
          console.error(error);
          setAiStatus(AIStatus.ERROR);
          addMessage('ai', '任务执行失败，请重试。');
      }
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-slate-50"><Spin size="large" /></div>;

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#2563eb', borderRadius: 6 } }}>
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        
        <NavigationSidebar 
            sheets={sheets} activeSheetId={activeSheetId} onSwitchSheet={setActiveSheetId}
            onAddSheet={handleAddSheet} onAddFolder={handleAddFolder} onRenameSheet={handleRenameSheet}
            onDeleteSheet={handleDeleteSheet} onToggleFolder={handleToggleFolder} onMoveSheet={handleMoveSheet}
            onImportSheets={handleImportSheets}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-1 hover:bg-slate-100 rounded text-slate-500 mr-1"><ArrowLeft size={18}/></button>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                 <span className="text-slate-400 font-normal">{projectName} /</span> 
                 {activeSheet?.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
                {activeSheet?.type === 'sheet' && <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500 border border-slate-200">视图: {activeSheet.views.find(v => v.id === activeSheet.activeViewId)?.name}</span>}
                <button onClick={() => setShowSidebar(!showSidebar)} className={`p-1.5 rounded-md transition-colors border border-transparent ${showSidebar ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}><Sparkles size={18} /></button>
            </div>
          </header>

          <main className="flex-1 flex overflow-hidden p-0 bg-slate-50/50 relative">
            {activeSheet?.type === 'sheet' ? (
                <SmartSpreadsheet 
                    sheetId={activeSheet.id} sheetName={activeSheet.name}
                    columns={activeSheet.columns} rows={activeSheet.rows}
                    views={activeSheet.views} activeViewId={activeSheet.activeViewId} selectedRowIds={activeSheet.selectedRowIds}
                    analysisResult={analysis} allSheets={sheets}
                    onRowsChange={(newRows) => updateActiveSheet(s => ({ ...s, rows: newRows }))}
                    onColumnsChange={(newCols) => updateActiveSheet(s => ({ ...s, columns: newCols }))}
                    onViewsChange={(newViews) => updateActiveSheet(s => ({ ...s, views: newViews }))}
                    onActiveViewChange={(id) => updateActiveSheet(s => ({ ...s, activeViewId: id }))}
                    onSelectionChange={(newSet) => updateActiveSheet(s => ({ ...s, selectedRowIds: newSet }))}
                    onUpdateOtherSheet={updateSheetById}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center flex-col text-slate-400 gap-4"><Folder size={64} className="opacity-20"/><p>请选择一个工作表以开始</p></div>
            )}
            <div className={`transition-all duration-300 ease-in-out border-l border-slate-200 bg-white ${showSidebar ? 'w-96' : 'w-0 opacity-0 overflow-hidden'}`}>
               <Sidebar messages={messages} status={aiStatus} onSendMessage={(text, targetId) => { addMessage('user', text); executeAiAction('chat', text, targetId); }} onQuickAction={(action, targetId) => { addMessage('user', action === 'fill' ? '智能填充' : '分析数据'); executeAiAction(action, undefined, targetId); }} sheets={sheets} activeSheetId={activeSheetId} views={activeSheet?.views || []} activeViewId={activeSheet?.activeViewId || ''} onSwitchView={handleSwitchView} onCreateView={handleCreateView} onDeleteView={handleDeleteView} />
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ProjectEditor;
