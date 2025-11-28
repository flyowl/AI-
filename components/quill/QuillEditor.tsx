import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Quill from 'quill';

interface QuillEditorProps {
  content: string;
  onChange: (content: string) => void;
  children?: React.ReactNode;
}

export interface QuillEditorRef {
  insertContent: (content: string) => void;
  getEditor: () => Quill | null;
}

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(({ content, onChange, children }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Quill
    if (!quillRef.current) {
        const editorContainer = containerRef.current.appendChild(
            containerRef.current.ownerDocument.createElement('div')
        );

        const quill = new Quill(editorContainer, {
            theme: 'snow',
            placeholder: '开始输入文档内容...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });

        quillRef.current = quill;

        // Set initial content
        if (content) {
            quill.clipboard.dangerouslyPasteHTML(content);
        }

        // Handle Change
        quill.on('text-change', () => {
            if (isUpdatingRef.current) return;
            const html = quill.getSemanticHTML();
            onChange(html);
        });
    }

    // Cleanup
    return () => {
        // We generally don't destroy Quill in React StrictMode to preserve state 
        // unless container is removed, but basic ref management is safe.
    };
  }, []); // Run once on mount

  // Sync content updates from parent (if they are external)
  useEffect(() => {
    if (quillRef.current && content) {
        const currentContent = quillRef.current.getSemanticHTML();
        if (currentContent !== content && !quillRef.current.hasFocus()) {
            // Only update if content is different and user is NOT typing (not focused)
            // This prevents cursor jumping issues common in controlled contenteditable
            isUpdatingRef.current = true;
            const range = quillRef.current.getSelection();
            quillRef.current.clipboard.dangerouslyPasteHTML(content);
            if (range) {
                quillRef.current.setSelection(range);
            }
            isUpdatingRef.current = false;
        }
    }
  }, [content]);

  useImperativeHandle(ref, () => ({
    insertContent: (html: string) => {
        if (quillRef.current) {
            const range = quillRef.current.getSelection();
            if (range) {
                quillRef.current.clipboard.dangerouslyPasteHTML(range.index, html);
                // Move cursor after inserted content
                // Note: dangerousPaste doesn't return length, so we estimate or just let user click
            } else {
                // If no selection, append to end
                const length = quillRef.current.getLength();
                quillRef.current.clipboard.dangerouslyPasteHTML(length, html);
            }
        }
    },
    getEditor: () => quillRef.current
  }));

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Container for Quill */}
      <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden" />
      
      {/* Children (e.g., Floating AI Buttons) absolute positioned over the editor */}
      {children && (
          <div className="absolute top-3 right-4 z-20 pointer-events-none">
             <div className="pointer-events-auto">
                {children}
             </div>
          </div>
      )}
    </div>
  );
});

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;
