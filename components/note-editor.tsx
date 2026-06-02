"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Strikethrough } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  className?: string;
  minHeight?: string;
}

export default function NoteEditor({
  value,
  onChange,
  className,
  minHeight = "288px",
}: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2 text-foreground",
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      // tiptap-markdown doesn't export its storage type
      const md = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown;
      onChange(md.getMarkdown());
    },
  });

  if (!editor) return null;

  const tools = [
    {
      label: "Bold",
      Icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Italic",
      Icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Strikethrough",
      Icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
    },
    null, // divider
    {
      label: "Heading 2",
      Icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "Heading 3",
      Icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
    null, // divider
    {
      label: "Bullet list",
      Icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Ordered list",
      Icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
  ];

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
        {tools.map((tool, i) =>
          tool === null ? (
            <div key={`divider-${i}`} className="w-px h-4 bg-border mx-1" />
          ) : (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              onMouseDown={(e) => {
                e.preventDefault();
                tool.action();
              }}
              className={cn(
                "p-1.5 rounded transition-colors hover:bg-muted",
                tool.active ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <tool.Icon className="w-3.5 h-3.5" />
            </button>
          ),
        )}
      </div>
      {/* Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
