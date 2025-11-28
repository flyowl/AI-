
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Type, Minus, Table as TableIcon
} from 'lucide-react';

interface SlashCommandListProps {
  items: any[];
  command: (item: any) => void;
}

const SlashCommandList = forwardRef((props: SlashCommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[280px] p-1 animate-in fade-in zoom-in duration-200">
      <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          基础块
      </div>
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {props.items.length > 0 ? (
            props.items.map((item, index) => (
            <button
                className={`flex items-center gap-3 px-2 py-2 text-sm text-left transition-colors w-full rounded-md
                ${index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
                `}
                key={index}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
            >
                <div className={`p-1.5 rounded border ${index === selectedIndex ? 'bg-white border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {item.icon}
                </div>
                <div className="flex flex-col">
                    <span className="font-medium text-xs leading-none mb-1">{item.title}</span>
                    <span className="text-[10px] text-slate-400 leading-none">{item.description}</span>
                </div>
            </button>
            ))
        ) : (
            <div className="px-3 py-2 text-sm text-slate-400">无匹配结果</div>
        )}
      </div>
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';

export const getSuggestionItems = ({ query }: { query: string }) => {
  const items = [
    {
      title: '文本',
      description: '开始输入普通文本',
      icon: <Type size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('paragraph').run();
      },
    },
    {
      title: '表格',
      description: '插入 3x3 表格',
      icon: <TableIcon size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: '一级标题',
      description: '最大的标题',
      icon: <Heading1 size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: '二级标题',
      description: '中等标题',
      icon: <Heading2 size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: '三级标题',
      description: '小标题',
      icon: <Heading3 size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: '无序列表',
      description: '创建一个项目列表',
      icon: <List size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: '有序列表',
      description: '创建一个编号列表',
      icon: <ListOrdered size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: '待办事项',
      description: '跟踪任务进度',
      icon: <CheckSquare size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: '引用',
      description: '引用一段文字',
      icon: <Quote size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: '代码块',
      description: '插入代码片段',
      icon: <Code size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: '分割线',
      description: '插入一条水平分割线',
      icon: <Minus size={16} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  return items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
};

export default SlashCommandList;
