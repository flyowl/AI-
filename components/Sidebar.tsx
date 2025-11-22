import React from 'react';
import { AnalysisResult, AIStatus } from '../types';
import { Sparkles, BarChart3, AlertCircle, Loader2 } from 'lucide-react';

interface SidebarProps {
  analysis: AnalysisResult | null;
  status: AIStatus;
  onAnalyze: () => void;
  onGenerateMore: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ analysis, status, onAnalyze, onGenerateMore }) => {
  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          AI 洞察
        </h2>
        <p className="text-xs text-slate-500 mt-1">由 Gemini 2.5 Flash 提供支持</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Actions */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={onGenerateMore}
            disabled={status === AIStatus.LOADING}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all font-medium text-sm disabled:opacity-50"
          >
            {status === AIStatus.LOADING ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
            智能填充 (5行)
          </button>
          
          <button
            onClick={onAnalyze}
            disabled={status === AIStatus.LOADING}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all font-medium text-sm disabled:opacity-50"
          >
            {status === AIStatus.LOADING ? <Loader2 className="animate-spin" size={16}/> : <BarChart3 size={16} />}
            分析数据
          </button>
        </div>

        {/* Analysis Content */}
        {analysis && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-sm">
              <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2">摘要</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide pl-1">关键趋势</h3>
              <ul className="space-y-2">
                {analysis.keyTrends.map((trend, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                    <span className="bg-blue-100 text-blue-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full mt-0.5 shrink-0">
                      {idx + 1}
                    </span>
                    {trend}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-start gap-2">
              <BarChart3 size={14} className="mt-0.5" />
              <span>建议图表：<strong>{analysis.suggestedChartType === 'bar' ? '柱状图' : analysis.suggestedChartType === 'line' ? '折线图' : analysis.suggestedChartType === 'pie' ? '饼图' : analysis.suggestedChartType === 'area' ? '面积图' : '图表'}</strong></span>
            </div>
          </div>
        )}

        {!analysis && status !== AIStatus.LOADING && (
          <div className="text-center py-10 text-slate-400">
            <BarChart3 size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">点击“分析数据”生成洞察。</p>
          </div>
        )}

        {status === AIStatus.ERROR && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>发生错误，请重试。</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;