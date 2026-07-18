'use dom';

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { TiptapDoc } from "@edgeever/shared";
import { useDOMImperativeHandle, type DOMImperativeFactory, type DOMProps } from "expo/dom";
import { useCallback, useEffect, useRef, type Ref } from "react";

type EditorDoc = TiptapDoc;

type PickedImage = {
  alt: string;
  url: string;
};

export interface LocalTiptapEditorRef extends DOMImperativeFactory {
  flush: () => void;
  focus: () => void;
}

type LocalTiptapEditorProps = {
  baseUrl: string;
  content: EditorDoc;
  dom?: DOMProps;
  onChange: (content: EditorDoc) => Promise<void>;
  onPickImage: () => Promise<PickedImage | null>;
  onReady: (startupMs: number) => Promise<void>;
  ref: Ref<LocalTiptapEditorRef>;
};

const CHANGE_IDLE_MS = 500;

export default function LocalTiptapEditor(props: LocalTiptapEditorProps) {
  const startedAtRef = useRef(performance.now());
  const changeTimerRef = useRef<number | null>(null);
  const onChangeRef = useRef(props.onChange);
  const onPickImageRef = useRef(props.onPickImage);
  const onReadyRef = useRef(props.onReady);

  onChangeRef.current = props.onChange;
  onPickImageRef.current = props.onPickImage;
  onReadyRef.current = props.onReady;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: false,
        inline: false,
      }),
      Placeholder.configure({
        placeholder: "开始记录...",
      }),
    ],
    content: resolveImageSources(props.content, props.baseUrl),
    editorProps: {
      attributes: {
        autocapitalize: "sentences",
        autocomplete: "on",
        autocorrect: "on",
        class: "edgeever-editor-content",
        inputmode: "text",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
      }
      changeTimerRef.current = window.setTimeout(() => {
        changeTimerRef.current = null;
        void onChangeRef.current(normalizeImageSources(activeEditor.getJSON() as EditorDoc, props.baseUrl));
      }, CHANGE_IDLE_MS);
    },
  });

  const flush = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    void onChangeRef.current(normalizeImageSources(editor.getJSON() as EditorDoc, props.baseUrl));
  }, [editor, props.baseUrl]);

  useDOMImperativeHandle(
    props.ref,
    () => ({
      flush,
      focus: () => editor?.commands.focus(),
    }),
    [editor, flush]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    void onReadyRef.current(Math.round(performance.now() - startedAtRef.current));
    const handlePageHide = () => flush();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
      }
    };
  }, [editor, flush]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) =>
      (activeEditor?.isActive("bold") ? 1 : 0) |
      (activeEditor?.isActive("italic") ? 2 : 0) |
      (activeEditor?.isActive("heading", { level: 2 }) ? 4 : 0) |
      (activeEditor?.isActive("bulletList") ? 8 : 0) |
      (activeEditor?.isActive("blockquote") ? 16 : 0) |
      (activeEditor?.isActive("codeBlock") ? 32 : 0),
  });

  const insertImage = async () => {
    if (!editor) {
      return;
    }
    const image = await onPickImageRef.current();
    if (image) {
      editor.chain().focus().setImage({ alt: image.alt, src: resolveUrl(image.url, props.baseUrl) }).run();
    }
  };

  return (
    <div className="edgeever-editor-shell">
      <style>{EDITOR_STYLES}</style>
      <div aria-label="编辑器工具栏" className="edgeever-editor-toolbar" role="toolbar">
        <ToolbarButton active={Boolean(toolbarState & 4)} label="标题" onRun={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} text="H2" />
        <ToolbarButton active={Boolean(toolbarState & 1)} label="加粗" onRun={() => editor?.chain().focus().toggleBold().run()} text="B" />
        <ToolbarButton active={Boolean(toolbarState & 2)} label="斜体" onRun={() => editor?.chain().focus().toggleItalic().run()} text="I" />
        <ToolbarButton active={Boolean(toolbarState & 8)} label="无序列表" onRun={() => editor?.chain().focus().toggleBulletList().run()} text="•" />
        <ToolbarButton active={Boolean(toolbarState & 16)} label="引用" onRun={() => editor?.chain().focus().toggleBlockquote().run()} text="❝" />
        <ToolbarButton active={Boolean(toolbarState & 32)} label="代码块" onRun={() => editor?.chain().focus().toggleCodeBlock().run()} text="&lt;/&gt;" />
        <ToolbarButton label="分割线" onRun={() => editor?.chain().focus().setHorizontalRule().run()} text="—" />
        <ToolbarButton label="插入图片" onRun={() => void insertImage()} text="＋图" />
        <ToolbarButton label="撤销" onRun={() => editor?.chain().focus().undo().run()} text="↶" />
        <ToolbarButton label="重做" onRun={() => editor?.chain().focus().redo().run()} text="↷" />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

const ToolbarButton = ({ active = false, label, onRun, text }: { active?: boolean; label: string; onRun: () => void; text: string }) => (
  <button
    aria-label={label}
    className={active ? "is-active" : undefined}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onRun}
    type="button"
  >
    {text}
  </button>
);

const mapImageSources = (doc: EditorDoc, mapSource: (source: string) => string): EditorDoc => {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (!value || typeof value !== "object") {
      return value;
    }
    const node = value as Record<string, unknown>;
    const next = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
    if (node.type === "image" && next.attrs && typeof next.attrs === "object") {
      const attrs = next.attrs as Record<string, unknown>;
      if (typeof attrs.src === "string") {
        next.attrs = { ...attrs, src: mapSource(attrs.src) };
      }
    }
    return next;
  };

  return visit(doc) as EditorDoc;
};

const resolveImageSources = (doc: EditorDoc, baseUrl: string) => mapImageSources(doc, (source) => resolveUrl(source, baseUrl));

const normalizeImageSources = (doc: EditorDoc, baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return mapImageSources(doc, (source) => source.startsWith(`${normalizedBaseUrl}/`) ? source.slice(normalizedBaseUrl.length) : source);
};

const resolveUrl = (source: string, baseUrl: string) => {
  if (!source.startsWith("/")) {
    return source;
  }
  return `${baseUrl.replace(/\/+$/, "")}${source}`;
};

const EDITOR_STYLES = `
  :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  html, body, #root { width: 100%; height: 100%; margin: 0; background: #fff; }
  body { overflow: hidden; color: #0f172a; }
  .edgeever-editor-shell { display: flex; height: 100%; min-height: 100%; flex-direction: column; background: #fff; }
  .edgeever-editor-toolbar { display: flex; flex: 0 0 auto; gap: 6px; overflow-x: auto; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; scrollbar-width: none; }
  .edgeever-editor-toolbar::-webkit-scrollbar { display: none; }
  .edgeever-editor-toolbar button { min-width: 38px; height: 36px; padding: 0 10px; border: 0; border-radius: 9px; background: #fff; color: #475569; font: inherit; font-size: 14px; font-weight: 700; box-shadow: inset 0 0 0 1px #e2e8f0; }
  .edgeever-editor-toolbar button.is-active { background: #ccfbf1; color: #0f766e; box-shadow: inset 0 0 0 1px #5eead4; }
  .tiptap { min-height: 100%; outline: none; }
  .edgeever-editor-shell > div:last-child { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .edgeever-editor-content { min-height: 100%; padding: 18px 18px 40vh; font-size: 17px; line-height: 1.7; word-break: break-word; caret-color: #0f766e; }
  .edgeever-editor-content > :first-child { margin-top: 0; }
  .edgeever-editor-content p.is-editor-empty:first-child::before { float: left; height: 0; color: #94a3b8; content: attr(data-placeholder); pointer-events: none; }
  .edgeever-editor-content h1, .edgeever-editor-content h2, .edgeever-editor-content h3 { line-height: 1.3; }
  .edgeever-editor-content blockquote { margin-left: 0; padding-left: 14px; border-left: 3px solid #5eead4; color: #475569; }
  .edgeever-editor-content pre { overflow-x: auto; border-radius: 10px; padding: 14px; background: #0f172a; color: #e2e8f0; }
  .edgeever-editor-content code { border-radius: 4px; padding: 2px 4px; background: #f1f5f9; }
  .edgeever-editor-content pre code { padding: 0; background: transparent; }
  .edgeever-editor-content img { display: block; max-width: 100%; height: auto; margin: 14px auto; border-radius: 10px; }
  .edgeever-editor-content hr { margin: 24px 0; border: 0; border-top: 1px solid #cbd5e1; }
`;
