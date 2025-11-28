import React, { useState, useRef } from 'react';
import { Sparkles, Wand2, Send, Bot, RefreshCw, PanelRightClose } from 'lucide-react';
import { Button, Tooltip, Input, Spin } from 'antd';
import { generateDocumentContent } from '../../services/geminiService';
import NovelEditor, { NovelEditorRef } from './NovelEditor';

interface DocumentEditorProps {
    content: string;
    onContentChange: (newContent: string) => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ content, onContentChange }) => {
    const editorRef = useRef<NovelEditorRef>(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPreview, setGeneratedPreview] = useState('');
    const [aiMode, setAiMode] = useState<'create' | 'refine'>('create');

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            // Context is just current content string for now
            const currentContext = content || '';
            
            const result = await generateDocumentContent(
                aiPrompt, 
                currentContext, 
                aiMode
            );
            setGeneratedPreview(result);
        } catch (error) {
            console.error(error);
            setGeneratedPreview('<p class="text-red-500">生成失败，请重试。</p>');
        } finally {
            setIsGenerating(false);
        }
    };

    const insertAiContent = () => {
        if (editorRef.current) {
            editorRef.current.insertContent(generatedPreview);
            setGeneratedPreview('');
            setAiPrompt('');
            setIsAiOpen(false);
        }
    };

    const SuggestionBtn: React.FC<{ text: string, onClick: (val: string) => void }> = ({ text, onClick }) => (
        <button 
            onClick={() => onClick(text)}
            className="text-left text-xs px-3 py-2.5 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 rounded-lg border border-slate-200 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
        >
            {text}
        </button>
    );

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <NovelEditor 
                        ref={editorRef}
                        content={content}
                        onChange={onContentChange}
                    >
                         {/* Floating AI Trigger */}
                         <Button 
                            type={isAiOpen ? 'primary' : 'default'}
                            icon={<Sparkles size={14} />}
                            className={`flex items-center gap-1 shadow-sm transition-all ${isAiOpen ? 'bg-indigo-600' : 'text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:text-indigo-700 bg-white/80 backdrop-blur-sm'}`}
                            onClick={() => setIsAiOpen(!isAiOpen)}
                        >
                            AI 助手
                        </Button>
                    </NovelEditor>
                </div>

                {/* AI Sidebar Panel (Right Side) */}
                {isAiOpen && (
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-right-5 duration-200 shadow-xl z-20 absolute right-0 top-0 bottom-0 h-full">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                <Bot size={18} className="text-indigo-600"/>
                                智能助手
                            </div>
                            <button onClick={() => setIsAiOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
                                <PanelRightClose size={16}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                            {!generatedPreview ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wand2 size={24} className="text-indigo-500"/>
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-900 mb-1">我可以帮您做什么？</h3>
                                    <p className="text-xs text-slate-500 mb-6">生成文档草稿、润色内容或总结要点。</p>
                                    
                                    <div className="flex flex-col gap-2">
                                        <SuggestionBtn text="📝 帮我写一份产品需求文档" onClick={setAiPrompt}/>
                                        <SuggestionBtn text="✨ 优化这段文字的语气" onClick={setAiPrompt}/>
                                        <SuggestionBtn text="🔍 总结当前文档的核心内容" onClick={setAiPrompt}/>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-sm">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
                                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Sparkles size={12}/> 生成结果</span>
                                        <Tooltip title="重新生成">
                                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors" onClick={handleAiGenerate}>
                                                <RefreshCw size={12}/>
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div 
                                        className="prose prose-sm prose-slate max-h-[300px] overflow-y-auto p-2 text-sm mb-3 bg-slate-50 rounded border border-slate-100" 
                                        dangerouslySetInnerHTML={{ __html: generatedPreview }} 
                                    />
                                    <div className="flex gap-2">
                                        <Button type="primary" size="small" block onClick={insertAiContent} className="bg-indigo-600">
                                            插入内容
                                        </Button>
                                        <Button size="small" onClick={() => setGeneratedPreview('')}>
                                            取消
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white">
                            <div className="relative">
                                <Input.TextArea 
                                    placeholder="输入指令..." 
                                    className="resize-none pr-9 rounded-lg text-sm py-2"
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    onKeyDown={e => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAiGenerate();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={handleAiGenerate}
                                    disabled={!aiPrompt.trim() || isGenerating}
                                    className="absolute right-2 bottom-2 p-1 bg-indigo-600 text-white rounded disabled:opacity-50 disabled:bg-slate-300 hover:bg-indigo-700 transition-colors"
                                >
                                    {isGenerating ? <Spin size="small" className="text-white scale-75"/> : <Send size={12} />}
                                </button>
                            </div>
                            <div className="flex gap-3 mt-2 px-1">
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="radio" name="aiMode" checked={aiMode === 'create'} onChange={() => setAiMode('create')} className="accent-indigo-600"/>
                                    <span className="text-xs text-slate-500 group-hover:text-indigo-600">生成</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="radio" name="aiMode" checked={aiMode === 'refine'} onChange={() => setAiMode('refine')} className="accent-indigo-600"/>
                                    <span className="text-xs text-slate-500 group-hover:text-indigo-600">润色</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentEditor;