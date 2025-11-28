
import React from 'react';
import { 
  Bold, Italic, Strikethrough, Code, 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Undo, Redo,
  Minus, Table as TableIcon, Trash2, PlusSquare, CheckSquare
} from 'lucide-react';
import { Tooltip, Dropdown, MenuProps } from 'antd';

interface MenuBarProps {
  editor: any;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const isActive = (type: string, opts?: any) => editor.isActive(type, opts) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700';
  const btnClass = "p-1.5 rounded-md transition-colors mx-0.5";

  const tableMenu: MenuProps['items'] = [
    {
      key: 'insert',
      label: '插入表格 (3x3)',
      icon: <PlusSquare size={14} />,
      onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    { type: 'divider' },
    {
      key: 'addColumnBefore',
      label: '左侧插入列',
      onClick: () => editor.chain().focus().addColumnBefore().run(),
      disabled: !editor.can().addColumnBefore()
    },
    {
      key: 'addColumnAfter',
      label: '右侧插入列',
      onClick: () => editor.chain().focus().addColumnAfter().run(),
      disabled: !editor.can().addColumnAfter()
    },
    {
      key: 'addRowBefore',
      label: '上方插入行',
      onClick: () => editor.chain().focus().addRowBefore().run(),
      disabled: !editor.can().addRowBefore()
    },
    {
      key: 'addRowAfter',
      label: '下方插入行',
      onClick: () => editor.chain().focus().addRowAfter().run(),
      disabled: !editor.can().addRowAfter()
    },
    { type: 'divider' },
    {
      key: 'deleteColumn',
      label: '删除当前列',
      danger: true,
      onClick: () => editor.chain().focus().deleteColumn().run(),
      disabled: !editor.can().deleteColumn()
    },
    {
      key: 'deleteRow',
      label: '删除当前行',
      danger: true,
      onClick: () => editor.chain().focus().deleteRow().run(),
      disabled: !editor.can().deleteRow()
    },
    {
      key: 'deleteTable',
      label: '删除表格',
      danger: true,
      icon: <Trash2 size={14} />,
      onClick: () => editor.chain().focus().deleteTable().run(),
      disabled: !editor.can().deleteTable()
    },
  ];

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-2 border-b border-slate-200 bg-white sticky top-0 z-10">
      
      <Tooltip title="加粗 (Cmd+B)">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`${btnClass} ${isActive('bold')}`}>
            <Bold size={16} />
        </button>
      </Tooltip>
      <Tooltip title="斜体 (Cmd+I)">
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btnClass} ${isActive('italic')}`}>
            <Italic size={16} />
        </button>
      </Tooltip>
      <Tooltip title="删除线">
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`${btnClass} ${isActive('strike')}`}>
            <Strikethrough size={16} />
        </button>
      </Tooltip>
      <Tooltip title="行内代码">
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={`${btnClass} ${isActive('code')}`}>
            <Code size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-4 bg-slate-200 mx-2"/>

      <Tooltip title="标题 1 (# )">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`${btnClass} ${isActive('heading', { level: 1 })}`}>
            <Heading1 size={16} />
        </button>
      </Tooltip>
      <Tooltip title="标题 2 (## )">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${btnClass} ${isActive('heading', { level: 2 })}`}>
            <Heading2 size={16} />
        </button>
      </Tooltip>
      <Tooltip title="标题 3 (### )">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`${btnClass} ${isActive('heading', { level: 3 })}`}>
            <Heading3 size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-4 bg-slate-200 mx-2"/>

      <Tooltip title="无序列表 (- )">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${btnClass} ${isActive('bulletList')}`}>
            <List size={16} />
        </button>
      </Tooltip>
      <Tooltip title="有序列表 (1. )">
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${btnClass} ${isActive('orderedList')}`}>
            <ListOrdered size={16} />
        </button>
      </Tooltip>
      <Tooltip title="待办列表 ([ ] )">
        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`${btnClass} ${isActive('taskList')}`}>
            <CheckSquare size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-4 bg-slate-200 mx-2"/>

      <Tooltip title="表格">
         <Dropdown menu={{ items: tableMenu }} trigger={['click']} placement="bottomLeft">
            <button className={`${btnClass} ${isActive('table')}`}>
                <TableIcon size={16} />
            </button>
         </Dropdown>
      </Tooltip>

      <Tooltip title="引用 (> )">
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`${btnClass} ${isActive('blockquote')}`}>
            <Quote size={16} />
        </button>
      </Tooltip>
      <Tooltip title="分割线 (---)">
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={`${btnClass}`}>
            <Minus size={16} />
        </button>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip title="撤销 (Cmd+Z)">
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
            <Undo size={16} />
        </button>
      </Tooltip>
      <Tooltip title="重做 (Cmd+Shift+Z)">
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30">
            <Redo size={16} />
        </button>
      </Tooltip>
    </div>
  );
};

export default MenuBar;
