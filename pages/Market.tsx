
import React from 'react';
import { AppTemplate } from '../types';
import { Layout, GitBranch, Calendar, Users, ShoppingCart, Briefcase, ChevronRight, Search } from 'lucide-react';

const CATEGORIES = ['全部', '项目管理', '市场营销', '产品研发', '人力资源', '销售客服', '财务法务'];

const TEMPLATES: AppTemplate[] = [
    { id: '1', name: '敏捷开发管理', description: 'Sprint 规划、任务看板、缺陷追踪', category: '产品研发', color: 'bg-blue-500', icon: GitBranch, popularity: 98 },
    { id: '2', name: '内容营销日历', description: '社交媒体排期、内容审核流程', category: '市场营销', color: 'bg-pink-500', icon: Calendar, popularity: 95 },
    { id: '3', name: '候选人追踪系统', description: '招聘流程、面试评价、Offer管理', category: '人力资源', color: 'bg-orange-500', icon: Users, popularity: 88 },
    { id: '4', name: '销售CRM', description: '客户线索、商机跟进、合同管理', category: '销售客服', color: 'bg-green-500', icon: Briefcase, popularity: 92 },
    { id: '5', name: '电商进销存', description: '库存管理、采购订单、销售报表', category: '财务法务', color: 'bg-purple-500', icon: ShoppingCart, popularity: 85 },
    { id: '6', name: 'OKRs 目标管理', description: '目标对齐、关键结果追踪', category: '项目管理', color: 'bg-red-500', icon: Layout, popularity: 90 },
];

const Market: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-10">
        <div className="text-center mb-12 py-10 bg-gradient-to-b from-indigo-50 to-white rounded-3xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">应用市场</h1>
            <p className="text-slate-500 max-w-2xl mx-auto mb-8">
                发现海量开箱即用的业务模版，快速搭建您的专属系统。
            </p>
            <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="搜索模版，例如：CRM、OKR..." 
                    className="w-full pl-12 pr-6 py-4 rounded-full border border-slate-200 shadow-lg shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                />
            </div>
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat, idx) => (
                <button 
                    key={cat} 
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${idx === 0 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map(template => (
                <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${template.color} text-white flex items-center justify-center shadow-md`}>
                            <template.icon size={24} />
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-md text-slate-500">
                            {template.category}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                        {template.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 h-10 line-clamp-2">
                        {template.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                            🔥 热度 {template.popularity}
                        </div>
                        <button className="flex items-center text-sm font-semibold text-indigo-600 hover:gap-2 transition-all">
                            使用模版 <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default Market;
