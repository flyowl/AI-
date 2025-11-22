import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { RowData, Column } from '../types';

interface DataVizProps {
  data: RowData[];
  columns: Column[];
  chartType: 'bar' | 'line' | 'pie' | 'area';
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const DataViz: React.FC<DataVizProps> = ({ data, columns, chartType }) => {
  // Heuristic: 
  // Label: First text or select column.
  // Values: Number or Rating columns.
  const labelCol = columns.find(c => c.type === 'text' || c.type === 'select' || c.type === 'date') || columns[0];
  const numberCols = columns.filter(c => c.type === 'number' || c.type === 'rating');

  if (!labelCol || numberCols.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
        <div className="text-center">
            <p className="text-sm font-medium">暂无数字数据可供可视化</p>
            <p className="text-xs text-slate-400 mt-1">请尝试添加“数字”或“评分”类型的列。</p>
        </div>
      </div>
    );
  }

  // Transform data for charts
  const chartData = data.map(row => {
    const newRow: any = { name: String(row[labelCol.id]) };
    numberCols.forEach(col => {
      const val = row[col.id];
      // Ensure numeric parsing
      const num = typeof val === 'string' ? parseFloat(val) : val;
      newRow[col.label] = isNaN(num) ? 0 : num;
    });
    return newRow;
  });

  const getChartLabel = (type: string) => {
      switch(type) {
          case 'bar': return '柱状图';
          case 'line': return '折线图';
          case 'pie': return '饼图';
          case 'area': return '面积图';
          default: return '图表';
      }
  }

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            {numberCols.map((col, i) => (
              <Line key={col.id} type="monotone" dataKey={col.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{fontSize: '12px'}} />
              {numberCols.map((col, i) => (
                <Area key={col.id} type="monotone" dataKey={col.label} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
              ))}
            </AreaChart>
          );
      case 'pie':
        const targetCol = numberCols[0];
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey={targetCol.label}
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{fontSize: '12px'}} />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            {numberCols.map((col, i) => (
              <Bar key={col.id} dataKey={col.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="h-full w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">数据可视化</h3>
          <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">{getChartLabel(chartType)}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DataViz;