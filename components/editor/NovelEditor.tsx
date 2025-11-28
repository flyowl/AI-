import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import tippy from 'tippy.js';
import SlashCommandList, { getSuggestionItems } from './SlashCommandList';

// Robust imports for CDN compatibility (handling default vs named exports)
import * as StarterKitPkg from '@tiptap/starter-kit';
import * as TablePkg from '@tiptap/extension-table';
import * as TableRowPkg from '@tiptap/extension-table-row';
import * as TableCellPkg from '@tiptap/extension-table-cell';
import * as TableHeaderPkg from '@tiptap/extension-table-header';
import * as TaskListPkg from '@tiptap/extension-task-list';
import * as TaskItemPkg from '@tiptap/extension-task-item';
import * as PlaceholderPkg from '@tiptap/extension-placeholder';
import * as SuggestionPkg from '@tiptap/suggestion';

import { 
  Plus, Minus, Trash2
} from 'lucide-react';

const StarterKit = (StarterKitPkg as any).StarterKit || (StarterKitPkg as any).default;
const Table = (TablePkg as any).Table || (TablePkg as any).default;
const TableRow = (TableRowPkg as any).TableRow || (TableRowPkg as any).default;
const TableCell = (TableCellPkg as any).TableCell || (TableCellPkg as any).default;
const TableHeader = (TableHeaderPkg as any).TableHeader || (TableHeaderPkg as any).default;
const TaskList = (TaskListPkg as any).TaskList || (TaskListPkg as any).default;
const TaskItem = (TaskItemPkg as any).TaskItem || (TaskItemPkg as any).default;
const Placeholder = (PlaceholderPkg as any).Placeholder || (PlaceholderPkg as any).default;
const Suggestion = (SuggestionPkg as any).Suggestion || (SuggestionPkg as any).default;

interface NovelEditorProps {
  content: string;
  onChange: (content: string) => void;
  children?: React.ReactNode;
}

export interface NovelEditorRef {
  insertContent: (content: string) => void;
}

// Custom Extension for Slash Commands
const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

const NovelEditor = forwardRef<NovelEditorRef, NovelEditorProps>(({ content, onChange, children }, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "输入 '/' 打开命令菜单，或直接开始写作...",
      }),
      SlashCommands.configure({
        suggestion: {
          items: getSuggestionItems,
          render: () => {
            let component: ReactRenderer;
            let popup: any;
            let isRendered = false;

            return {
              onStart: (props: any) => {
                isRendered = true;
                component = new ReactRenderer(SlashCommandList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  zIndex: 9999,
                });
              },
              onUpdate(props: any) {
                if (!isRendered) return;
                component.updateProps(props);
                if (!props.clientRect) return;
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown(props: any) {
                if (!isRendered) return false;
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return (component.ref as any)?.onKeyDown(props);
              },
              onExit() {
                if (!isRendered) return;
                popup[0].destroy();
                component.destroy();
                isRendered = false;
              },
            };
          },
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  });

  // Handle external content updates
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
       // Only update if content length is significantly different to avoid cursor jumps on small formatting changes
       // or if the editor is empty
       if (Math.abs(editor.getHTML().length - content.length) > 10 || editor.isEmpty) {
           editor.commands.setContent(content);
       }
    }
  }, [content, editor]);

  useImperativeHandle(ref, () => ({
    insertContent: (html: string) => {
      editor?.commands.insertContent(html);
    }
  }));

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full bg-white relative group">
      {/* Table Menu (Only visible when table selected) */}
      {editor && editor.isActive('table') && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-white border border-slate-200 shadow-lg rounded-lg flex items-center p-1 gap-1 animate-in fade-in slide-in-from-top-2">
              <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="左侧插入列"><Plus size={14} className="rotate-90"/></button>
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="右侧插入列"><Plus size={14} className="-rotate-90"/></button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="上方插入行"><Plus size={14}/></button>
              <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="下方插入行"><Plus size={14} className="rotate-180"/></button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded" title="删除列"><Minus size={14} className="rotate-90"/></button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded" title="删除行"><Minus size={14}/></button>
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded" title="删除表格"><Trash2 size={14}/></button>
          </div>
      )}

      {children && (
          <div className="absolute top-3 right-6 z-20">
              {children}
          </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

NovelEditor.displayName = 'NovelEditor';

export default NovelEditor;