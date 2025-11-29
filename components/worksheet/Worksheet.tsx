

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar, { AIMode } from '../Sidebar';
import NavigationSidebar from '../NavigationSidebar';
import SmartSpreadsheet from '../SmartSpreadsheet';
import { Column, AIStatus, AnalysisResult, View, ViewType, ChatMessage, Sheet, RowData, UserRole, AppPermissions, RoleDef } from '../../types';
import { generateSmartRows, analyzeDataset, generateSystem, modifySheetSchema } from '../../services/geminiService';
import { Sparkles, Folder, Table2 } from 'lucide-react';
import { message, Modal } from 'antd';

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

const SYSTEM_ROLES: RoleDef[] = [
    {
        id: 'Admin',
        name: '管理员',
        description: '拥有所有操作权限',
        isSystem: true,
        capabilities: { canManageSheets: true, canEditSchema: true, canEditData: true }
    },
    {
        id: 'Editor',
        name: '编辑者',
        description: '无法修改表结构，可管理数据',
        isSystem: true,
        capabilities: { canManageSheets: false, canEditSchema: false, canEditData: true }
    },
    {
        id: 'Viewer',
        name: '只读用户',
        description: '仅查看数据',
        isSystem: true,
        capabilities: { canManageSheets: false, canEditSchema: false, canEditData: false }
    }
];

const INITIAL_PERMISSIONS: AppPermissions = {
    Editor: { sheetVisibility: {}, columnVisibility: {}, columnReadonly: {} },
    Viewer: { sheetVisibility: {}, columnVisibility: {}, columnReadonly: {} }
};

export interface WorksheetProps {
    title?: string;
    initialSheets?: Sheet[];
    onSave?: (sheets: Sheet[]) => void;
}

const Worksheet: React.FC<WorksheetProps> = ({ title = '多维表格', initialSheets = [], onSave }) => {
  // --- Project State ---
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // --- User Role & Permissions State ---
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');
  const [roles, setRoles] = useState<RoleDef[]>(SYSTEM_ROLES);
  const [permissions, setPermissions] = useState<AppPermissions>(INITIAL_PERMISSIONS);

  // Derive Current Capabilities
  const currentRoleDef = useMemo(() => roles.find(r => r.id === currentUserRole) || SYSTEM_ROLES[2], [roles, currentUserRole]);
  const capabilities = currentRoleDef.capabilities;

  // --- Persistence Logic ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Initial Load / Default Creation
  useEffect(() => {
    if (sheets.length > 0) {
        if (!activeSheetId) {
            const firstItem = sheets.find(s => s.type === 'sheet');
            if (firstItem) setActiveSheetId(firstItem.id);
        }
    } else {
        // Initialize Default Data if empty
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
    setIsInitialized(true);
  }, []);

  // 2. Auto-Save Debounce
  useEffect(() => {
    if (!isInitialized) return;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        onSave?.(sheets);
    }, 1000); 

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sheets, isInitialized, onSave]);


  // --- Derived Active Sheet Helpers ---
  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId), [sheets, activeSheetId]);
  
  const updateActiveSheet = (updater: (sheet: Sheet) => Sheet) => {
      setSheets(prev => prev.map(s => s.id === activeSheetId ? updater(s) : s));
  };
  
  const updateSheetById = (id: string, updater: (sheet: Sheet) => Sheet) => {
      setSheets(prev => prev.map(s => s.id === id ? updater(s) : s));
  };

  // --- Filtering Logic based on Permissions ---
  const getVisibleSheets = (roleId: string, allSheets: Sheet[]) => {
      if (roleId === 'Admin') return allSheets;
      const rolePerms = permissions[roleId];
      if (!rolePerms) return allSheets;
      
      return allSheets.filter(s => {
          if (s.type === 'sheet') {
              return rolePerms.sheetVisibility[s.id] !== false;
          }
          return true; // Folders/Docs visible for now
      });
  };

  const getVisibleColumns = (roleId: string, columns: Column[]) => {
      if (roleId === 'Admin') return columns;
      const rolePerms = permissions[roleId];
      if (!rolePerms) return columns;
      return columns.filter(c => rolePerms.columnVisibility[c.id] !== false);
  };

  const visibleSheets = useMemo(() => getVisibleSheets(currentUserRole, sheets), [currentUserRole, sheets, permissions]);
  
  // Redirect if active sheet becomes hidden
  useEffect(() => {
      if (activeSheetId && !visibleSheets.find(s => s.id === activeSheetId)) {
          const firstVisible = visibleSheets.find(s => s.type === 'sheet');
          if (firstVisible) setActiveSheetId(firstVisible.id);
          else setActiveSheetId('');
      }
  }, [visibleSheets, activeSheetId]);

  const activeSheetVisibleCols = useMemo(() => {
      if (!activeSheet) return [];
      return getVisibleColumns(currentUserRole, activeSheet.columns);
  }, [activeSheet, currentUserRole, permissions]);

  // Compute Readonly Columns for current sheet & role
  const activeSheetReadonlyColumnIds = useMemo(() => {
      const set = new Set<string>();
      // Admin always edit, Viewer never edit (handled by capabilities)
      if (currentUserRole === 'Admin' || currentUserRole === 'Viewer') return set; 

      // For custom roles / Editor
      const rolePerms = permissions[currentUserRole];
      if (activeSheet && rolePerms) {
          activeSheet.columns.forEach(col => {
              if (rolePerms.columnReadonly?.[col.id]) {
                  set.add(col.id);
              }
          });
      }
      return set;
  }, [activeSheet, currentUserRole, permissions]);


  // Chat / AI State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus>(AIStatus.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

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
      if (!capabilities.canManageSheets) {
          message.error('无权限新建工作表');
          return;
      }
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
    if (!capabilities.canManageSheets) return;
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
      if (!capabilities.canManageSheets) return;
      const sheetToDelete = sheets.find(s => s.id === id);
      if (!sheetToDelete) return;
      
      const typeLabel = sheetToDelete.type === 'folder' ? '文件夹' : '工作表';
      
      Modal.confirm({
          title: `删除${typeLabel}`,
          content: `确定要删除“${sheetToDelete.name}”吗？此操作无法撤销。`,
          okType: 'danger',
          onOk: () => {
              let idsToDelete = new Set([id]);
              if (sheetToDelete.type === 'folder') {
                  // Recursive delete children
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
                  // Fallback selection
                  const fallback = newSheets.find(s => s.type === 'sheet');
                  if (fallback) setActiveSheetId(fallback.id);
                  else setActiveSheetId('');
              }
              message.success('已删除');
          }
      })
  };

  const handleRenameSheet = (id: string, newName: string) => {
      if (!capabilities.canManageSheets) return;
      if (!newName.trim()) return;
      setSheets(prev => prev.map(s => s.id === id ? { ...s, name: newName.trim() } : s));
  };

  const handleMoveSheet = (dragId: string, targetId: string, position: 'top' | 'bottom' | 'inside') => {
      if (!capabilities.canManageSheets) return;
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
      if (!capabilities.canManageSheets) return;
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

  /**
   * Main AI Action Handler
   */
  const handleAiAction = async (prompt: string, mode: AIMode, targetSheetId?: string) => {
      setAiStatus(AIStatus.LOADING);
      if (prompt.trim()) addMessage('user', prompt);

      try {
        if (mode === 'create_project') {
            if (!capabilities.canManageSheets) throw new Error("无创建权限");
            // 1. Generate System Structure (JSON)
            const systemData = await generateSystem(prompt);
            
            // 2. Parse JSON into Sheet objects (Resolve IDs and Relations)
            const newSheets: Sheet[] = [];
            const nameToIdMap: Record<string, string> = {};

            // Pass 1: Create Sheets and basic columns (map Names to UUIDs)
            systemData.forEach(s => {
                const sheetId = crypto.randomUUID();
                nameToIdMap[s.name] = sheetId;

                const columns: Column[] = s.columns.map((c: any) => ({
                    id: crypto.randomUUID(),
                    label: c.label,
                    type: c.type,
                    options: c.options || undefined,
                    relationConfig: c.targetSheetName ? { targetSheetId: "PENDING_" + c.targetSheetName } : undefined
                }));

                const newSheet: Sheet = {
                    id: sheetId,
                    name: s.name,
                    type: 'sheet',
                    columns: columns,
                    rows: [],
                    views: [{ ...INITIAL_VIEW, id: crypto.randomUUID() }],
                    activeViewId: '',
                    selectedRowIds: new Set()
                };
                newSheet.activeViewId = newSheet.views[0].id;
                newSheets.push(newSheet);
            });

            // Pass 2: Resolve Relation Target IDs
            newSheets.forEach(sheet => {
                sheet.columns.forEach(col => {
                    if (col.type === 'relation' && col.relationConfig?.targetSheetId?.startsWith('PENDING_')) {
                        const targetName = col.relationConfig.targetSheetId.replace('PENDING_', '');
                        const realTargetId = nameToIdMap[targetName];
                        if (realTargetId) {
                            col.relationConfig.targetSheetId = realTargetId;
                        } else {
                            // Fallback if AI hallucinates a non-existent table name
                            col.type = 'text'; // degrade to text
                            col.relationConfig = undefined;
                        }
                    }
                });
            });

            // Pass 3: Generate Rows using the correct Column IDs
            newSheets.forEach((sheet, idx) => {
                const sampleRawData = systemData[idx].sampleRows;
                const rows: RowData[] = sampleRawData.map((rawRow: any) => {
                    const newRow: RowData = { id: crypto.randomUUID() };
                    sheet.columns.forEach(col => {
                        // Match data by Label
                        newRow[col.id] = rawRow[col.label] || '';
                    });
                    return newRow;
                });
                sheet.rows = rows;
            });

            // Replace current system or append? Let's Append for now, but focus on the new first sheet.
            // If "Create Project", maybe we should clear existing empty default sheet? 
            let finalSheets = [...sheets];
            // If we only have the default empty sheet, replace it
            if (sheets.length === 1 && sheets[0].rows.length === 0 && sheets[0].columns.length === 1) {
                finalSheets = newSheets;
            } else {
                finalSheets = [...sheets, ...newSheets];
            }
            
            setSheets(finalSheets);
            if(newSheets.length > 0) setActiveSheetId(newSheets[0].id);
            addMessage('ai', `✅ 已为您生成 "${prompt}" 系统，包含 ${newSheets.length} 个数据表。`);

        } else if (mode === 'modify_table') {
            if (!capabilities.canEditSchema) throw new Error("无修改结构权限");
            const targetSheet = sheets.find(s => s.id === targetSheetId) || activeSheet;
            if (!targetSheet || targetSheet.type !== 'sheet') {
                addMessage('ai', '请先选择一个有效的工作表。');
                setAiStatus(AIStatus.ERROR);
                return;
            }
            
            const result = await modifySheetSchema(prompt, targetSheet.columns, targetSheet.name);
            
            if (result.type === 'ADD_COLUMN' && result.data) {
                const newCol: Column = { 
                    id: crypto.randomUUID(), 
                    label: result.data.label, 
                    type: result.data.columnType 
                };
                updateSheetById(targetSheet.id, s => ({ ...s, columns: [...s.columns, newCol] }));
                addMessage('ai', `✅ 已添加列：${newCol.label}`);
            } else if (result.type === 'DELETE_COLUMN' && result.data) {
                const colToDelete = targetSheet.columns.find(c => c.label === result.data.label);
                if (colToDelete) {
                     updateSheetById(targetSheet.id, s => ({ ...s, columns: s.columns.filter(c => c.id !== colToDelete.id) }));
                     addMessage('ai', `🗑️ 已删除列：${colToDelete.label}`);
                } else {
                    addMessage('ai', `⚠️ 找不到列 "${result.data.label}"`);
                }
            } else if (result.type === 'RENAME_COLUMN' && result.data) {
                 const col = targetSheet.columns.find(c => c.label === result.data.oldLabel);
                 if (col) {
                     updateSheetById(targetSheet.id, s => ({ 
                         ...s, 
                         columns: s.columns.map(c => c.id === col.id ? { ...c, label: result.data.newLabel } : c)
                     }));
                     addMessage('ai', `✅ 已将 "${result.data.oldLabel}" 重命名为 "${result.data.newLabel}"`);
                 } else {
                     addMessage('ai', `⚠️ 找不到列 "${result.data.oldLabel}"`);
                 }
            } else {
                addMessage('ai', result.reply);
            }

        } else if (mode === 'fill_data') {
            if (!capabilities.canEditData) throw new Error("无填充数据权限");
            const targetSheet = sheets.find(s => s.id === targetSheetId) || activeSheet;
             if (!targetSheet || targetSheet.type !== 'sheet') {
                addMessage('ai', '请先选择一个有效的工作表。');
                setAiStatus(AIStatus.ERROR);
                return;
            }
            
            // Extract count from prompt, defaulting to 10
            // Regex to find a number in the prompt (e.g., "300 rows", "add 50", etc.)
            const match = prompt.match(/(\d+)/);
            let count = match ? parseInt(match[0], 10) : 10;
            
            // Safety cap: Limit to 50 rows per request to avoid token limits/timeouts
            if (count > 50) {
                count = 50;
                addMessage('ai', '⚠️ 为了保证生成速度与稳定性，单次生成限制为 50 条数据。正在为您生成...');
            }

            // Generate rows
            const newRows = await generateSmartRows(targetSheet.columns, targetSheet.rows, count, prompt);
            updateSheetById(targetSheet.id, sheet => ({ ...sheet, rows: [...sheet.rows, ...newRows] }));
            addMessage('ai', `✨ 已为“${targetSheet.name}”生成 ${newRows.length} 条新数据。`);

        } else if (mode === 'analyze_data') {
            const targetSheet = sheets.find(s => s.id === targetSheetId) || activeSheet;
             if (!targetSheet || targetSheet.type !== 'sheet') {
                addMessage('ai', '请先选择一个有效的工作表。');
                setAiStatus(AIStatus.ERROR);
                return;
            }
            const result = await analyzeDataset(targetSheet.columns, targetSheet.rows);
            setAnalysis(result);
            addMessage('ai', `📊 “${targetSheet.name}” 分析完成！\n\n**摘要**: ${result.summary}\n\n**关键趋势**:\n${result.keyTrends.map(t => `- ${t}`).join('\n')}\n\n建议图表: ${result.suggestedChartType === 'bar' ? '柱状图' : result.suggestedChartType === 'line' ? '折线图' : '饼图'}。`);
        } else if (mode === 'analyze_row_data') {
            const targetSheet = sheets.find(s => s.id === targetSheetId) || activeSheet;
            if (!targetSheet || targetSheet.type !== 'sheet') {
                addMessage('ai', '请先选择一个有效的工作表。');
                setAiStatus(AIStatus.ERROR);
                return;
            }

            if (targetSheet.selectedRowIds.size === 0) {
                addMessage('ai', '⚠️ 请先在表格中选中至少一行数据，以便进行分析。');
                setAiStatus(AIStatus.ERROR);
                return;
            }

            const selectedRows = targetSheet.rows.filter(r => targetSheet.selectedRowIds.has(r.id));
            const rowsToAnalyze = selectedRows.slice(0, 100); // Max 100 limit

            if (selectedRows.length > 100) {
                addMessage('ai', `ℹ️ 已选中 ${selectedRows.length} 行，将仅分析前 100 行。`);
            }

            const result = await analyzeDataset(targetSheet.columns, rowsToAnalyze);
            setAnalysis(result);
            addMessage('ai', `📊 已针对选中的 ${rowsToAnalyze.length} 行数据完成分析！\n\n**摘要**: ${result.summary}\n\n**关键趋势**:\n${result.keyTrends.map(t => `- ${t}`).join('\n')}\n\n建议图表: ${result.suggestedChartType === 'bar' ? '柱状图' : result.suggestedChartType === 'line' ? '折线图' : '饼图'}。`);
        }

        setAiStatus(AIStatus.SUCCESS);
      } catch (error: any) {
        console.error(error);
        setAiStatus(AIStatus.ERROR);
        addMessage('ai', `错误: ${error.message || '执行过程中遇到了错误，请稍后再试。'}`);
      }
  };

  return (
      <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
        
        {/* Navigation Sidebar */}
        <NavigationSidebar 
            sheets={visibleSheets} activeSheetId={activeSheetId} onSwitchSheet={setActiveSheetId}
            canManageSheets={capabilities.canManageSheets}
            onAddSheet={handleAddSheet} onAddFolder={handleAddFolder} onRenameSheet={handleRenameSheet}
            onDeleteSheet={handleDeleteSheet} onToggleFolder={handleToggleFolder} onMoveSheet={handleMoveSheet}
            onImportSheets={handleImportSheets}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                <Table2 size={18} />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                 {title} <span className="text-slate-300">/</span> {activeSheet?.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
                {activeSheet?.type === 'sheet' && (
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500 border border-slate-200">
                        视图: {activeSheet.views.find(v => v.id === activeSheet.activeViewId)?.name}
                    </span>
                )}
                
                {/* Global AI Chat Toggle */}
                <button onClick={() => setShowSidebar(!showSidebar)} className={`p-1.5 rounded-md transition-colors border border-transparent ${showSidebar ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <Sparkles size={18} />
                </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex overflow-hidden p-0 relative bg-white">
            
            {activeSheet?.type === 'sheet' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 p-4">
                    <SmartSpreadsheet 
                        sheetId={activeSheet.id} sheetName={activeSheet.name}
                        columns={activeSheetVisibleCols} rows={activeSheet.rows}
                        views={activeSheet.views} activeViewId={activeSheet.activeViewId} selectedRowIds={activeSheet.selectedRowIds}
                        analysisResult={analysis} allSheets={visibleSheets}
                        readonlyColumnIds={activeSheetReadonlyColumnIds}
                        capabilities={capabilities}
                        onRowsChange={(newRows) => updateActiveSheet(s => ({ ...s, rows: newRows }))}
                        onColumnsChange={(newCols) => updateActiveSheet(s => ({ ...s, columns: newCols }))}
                        onViewsChange={(newViews) => updateActiveSheet(s => ({ ...s, views: newViews }))}
                        onActiveViewChange={(id) => updateActiveSheet(s => ({ ...s, activeViewId: id }))}
                        onSelectionChange={(newSet) => updateActiveSheet(s => ({ ...s, selectedRowIds: newSet }))}
                        onUpdateOtherSheet={updateSheetById}
                    />
                </div>
            )}

            {!activeSheet && (
                <div className="flex-1 flex items-center justify-center flex-col text-slate-400 gap-4 bg-slate-50">
                    <Folder size={64} className="opacity-20"/>
                    <p>请在左侧选择一个工作表以开始</p>
                </div>
            )}

            {/* Global AI Sidebar */}
            <div className={`transition-all duration-300 ease-in-out border-l border-slate-200 bg-white ${showSidebar ? 'w-96' : 'w-0 opacity-0 overflow-hidden'}`}>
               <Sidebar 
                    messages={messages} 
                    status={aiStatus} 
                    onSendMessage={handleAiAction}
                    sheets={sheets} 
                    activeSheetId={activeSheetId} 
                    views={activeSheet?.views || []} 
                    activeViewId={activeSheet?.activeViewId || ''} 
                    onSwitchView={handleSwitchView} 
                    onCreateView={handleCreateView} 
                    onDeleteView={handleDeleteView} 
                    currentUserRole={currentUserRole}
                    onRoleChange={setCurrentUserRole}
                    roles={roles}
                    onRolesChange={setRoles}
                    permissions={permissions}
                    onUpdatePermissions={setPermissions}
                />
            </div>
          </main>
        </div>
      </div>
  );
};

export default Worksheet;