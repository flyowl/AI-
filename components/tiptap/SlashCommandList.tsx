
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Table, Quote, Code, Type 
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
    <div className="slash-command-menu flex flex-col bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[240px]">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-50 border-b border-slate-100">
          基础组件
      </div>
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            className={`flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors w-full
              ${index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
            `}
            key={index}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className={`p-1 rounded ${index === selectedIndex ? 'bg-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                {item.icon}
            </div>
            <div className="flex flex-col">
                <span className="font-medium leading-none">{item.title}</span>
                {item.description && <span className="text-[10px] text-slate-400 mt-1 leading-none">{item.description}</span>}
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-slate-400">无匹配结果</div>
      )}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';

// Helper to define command items
export const getSuggestionItems = ({ query }: { query: string }) => {
  const items = [
    {
      title: '普通文本',
      description: '开始输入普通段落',
      icon: <Type size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('paragraph').run();
      },
    },
    {
      title: '一级标题',
      description: '最大的标题',
      icon: <Heading1 size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: '二级标题',
      description: '中等标题',
      icon: <Heading2 size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: '三级标题',
      description: '小标题',
      icon: <Heading3 size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: '无序列表',
      description: '创建一个项目列表',
      icon: <List size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: '有序列表',
      description: '创建一个编号列表',
      icon: <ListOrdered size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: '待办列表',
      description: '跟踪任务进度',
      icon: <CheckSquare size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: '表格',
      description: '插入 3x3 表格',
      icon: <Table size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: '引用',
      description: '引用一段文字',
      icon: <Quote size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: '代码块',
      description: '插入代码片段',
      icon: <Code size={14} />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
  ];

  return items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
};

export default SlashCommandList;
