import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import * as StarterKitPkg from '@tiptap/starter-kit';
import * as TablePkg from '@tiptap/extension-table';
import * as TableRowPkg from '@tiptap/extension-table-row';
import * as TableCellPkg from '@tiptap/extension-table-cell';
import * as TableHeaderPkg from '@tiptap/extension-table-header';
import * as TaskListPkg from '@tiptap/extension-task-list';
import * as TaskItemPkg from '@tiptap/extension-task-item';
import * as PlaceholderPkg from '@tiptap/extension-placeholder';
import * as SuggestionPkg from '@tiptap/suggestion';
import tippy from 'tippy.js';
import SlashCommandList, { getSuggestionItems } from './SlashCommandList';
import MenuBar from './MenuBar';

// Robust import handling for CDN modules with Type casting
const StarterKit = (StarterKitPkg as any).StarterKit || (StarterKitPkg as any).default;
const Table = (TablePkg as any).Table || (TablePkg as any).default;
const TableRow = (TableRowPkg as any).TableRow || (TableRowPkg as any).default;
const TableCell = (TableCellPkg as any).TableCell || (TableCellPkg as any).default;
const TableHeader = (TableHeaderPkg as any).TableHeader || (TableHeaderPkg as any).default;
const TaskList = (TaskListPkg as any).TaskList || (TaskListPkg as any).default;
const TaskItem = (TaskItemPkg as any).TaskItem || (TaskItemPkg as any).default;
const Placeholder = (PlaceholderPkg as any).Placeholder || (PlaceholderPkg as any).default;
const Suggestion = (SuggestionPkg as any).Suggestion || (SuggestionPkg as any).default;

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  children?: React.ReactNode;
}

export interface TiptapEditorRef {
  insertContent: (content: string) => void;
  getEditor: () => any;
}

// Create a custom extension for Slash Commands
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

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({ content, onChange, children }, ref) => {
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: '输入 / 打开命令菜单，或直接开始写作...',
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

                if (!props.clientRect) {
                  return;
                }

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
                
                if (!props.clientRect) {
                  return;
                }
                
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
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      if (Math.abs(editor.getHTML().length - content.length) > 5) {
         editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  useImperativeHandle(ref, () => ({
    insertContent: (html: string) => {
      editor?.commands.insertContent(html);
    },
    getEditor: () => editor
  }));

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      <MenuBar editor={editor} />
      
      {children && (
          <div className="absolute top-2 right-4 z-20">
              {children}
          </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>

      <style>{`
        /* Tiptap Table Styles */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 1px solid #ced4da;
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: #f8f9fa;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf;
          pointer-events: none;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: center;
        }
        ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
          user-select: none;
        }
        ul[data-type="taskList"] li > div {
          flex: 1;
        }
      `}</style>
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;