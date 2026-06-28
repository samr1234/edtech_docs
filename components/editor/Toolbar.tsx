"use client";

import { useState, useRef, useEffect } from "react";
import { type Editor } from "@tiptap/react";
import { clsx } from "clsx";

interface ToolbarProps {
  editor: Editor | null;
  isReadOnly?: boolean;
}

// Prevent the button from stealing focus from the editor on mousedown.
function noFocusSteal(e: React.MouseEvent) {
  e.preventDefault();
}

export function Toolbar({ editor, isReadOnly }: ToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const savedSelection = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus();
  }, [showLinkInput]);

  if (!editor || isReadOnly) return null;

  function handleLinkButton() {
    if (editor!.isActive("link")) {
      editor!.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      return;
    }
    const { from, to } = editor!.state.selection;
    savedSelection.current = { from, to };
    const attrs = editor!.getAttributes("link");
    setLinkUrl(attrs.href ?? "https://");

    if (linkButtonRef.current) {
      const rect = linkButtonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPopoverStyle({
          position: "fixed",
          top: rect.bottom + 6,
          left: 8,
          right: 8,
        });
      } else {
        // Position to the right of the sidebar button
        setPopoverStyle({
          position: "fixed",
          top: Math.max(8, rect.top - 20),
          left: rect.right + 8,
          width: 240,
        });
      }
    }

    setShowLinkInput(true);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url || url === "https://") { cancelLink(); return; }

    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url)) {
      setLinkError("Only http:// and https:// links are allowed.");
      return;
    }
    setLinkError("");
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const sel = savedSelection.current;
    if (sel && sel.from !== sel.to) {
      editor!.chain()
        .focus()
        .setTextSelection({ from: sel.from, to: sel.to })
        .setLink({ href })
        .run();
    } else {
      editor!.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
    savedSelection.current = null;
  }

  function cancelLink() {
    setShowLinkInput(false);
    setLinkError("");
    savedSelection.current = null;
    editor!.chain().focus().run();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); applyLink(); }
    if (e.key === "Escape") cancelLink();
  }

  type Btn = {
    label: string;
    title: string;
    action: () => void;
    isActive: boolean;
    cls?: string;
    ref?: React.RefObject<HTMLButtonElement | null>;
  };

  const groups: Btn[][] = [
    [
      { label: "B",   title: "Bold",          action: () => editor.chain().focus().toggleBold().run(),                      isActive: editor.isActive("bold"),              cls: "font-bold" },
      { label: "I",   title: "Italic",         action: () => editor.chain().focus().toggleItalic().run(),                   isActive: editor.isActive("italic"),            cls: "italic" },
      { label: "S",   title: "Strikethrough",  action: () => editor.chain().focus().toggleStrike().run(),                   isActive: editor.isActive("strike"),            cls: "line-through" },
    ],
    [
      { label: "H1",  title: "Heading 1",      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),      isActive: editor.isActive("heading", { level: 1 }) },
      { label: "H2",  title: "Heading 2",      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),      isActive: editor.isActive("heading", { level: 2 }) },
      { label: "H3",  title: "Heading 3",      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),      isActive: editor.isActive("heading", { level: 3 }) },
      { label: "H4",  title: "Heading 4",      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),      isActive: editor.isActive("heading", { level: 4 }) },
    ],
    [
      { label: "≡",   title: "Bullet list",    action: () => editor.chain().focus().toggleBulletList().run(),               isActive: editor.isActive("bulletList"),        cls: "text-base" },
      { label: "1.",  title: "Numbered list",  action: () => editor.chain().focus().toggleOrderedList().run(),              isActive: editor.isActive("orderedList") },
    ],
    [
      { label: "⌘",   title: editor.isActive("link") ? "Remove link" : "Add link",  action: handleLinkButton,             isActive: editor.isActive("link"),              cls: "text-base", ref: linkButtonRef },
      { label: "❝",   title: "Blockquote",     action: () => editor.chain().focus().toggleBlockquote().run(),              isActive: editor.isActive("blockquote"),        cls: "text-base" },
      { label: "</>", title: "Inline code",    action: () => editor.chain().focus().toggleCode().run(),                    isActive: editor.isActive("code"),              cls: "font-mono text-[10px]" },
    ],
  ];

  const btnBase =
    "w-8 h-8 md:w-full md:h-8 rounded text-xs font-medium transition-colors flex items-center justify-center shrink-0";
  const btnActive =
    "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900";
  const btnInactive =
    "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white";

  return (
    // Mobile: horizontal scrollable bar (flex-row). md+: vertical sidebar (flex-col).
    // The outer editor layout switches flex-col→flex-row at md, so this element
    // naturally sits above the editor on mobile and to the left on desktop.
    <aside
      aria-label="Formatting toolbar"
      className={clsx(
        "bg-white dark:bg-gray-900 shrink-0",
        // Mobile horizontal bar
        "flex flex-row overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 gap-1 w-full",
        // Desktop vertical sidebar
        "md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-0 md:py-3 md:gap-1 md:w-12 md:h-full",
      )}
    >
      {groups.map((group, gi) => (
        <div
          key={gi}
          className="flex flex-row md:flex-col items-center gap-1 md:w-full md:px-1.5"
        >
          {group.map((btn) => (
            <button
              key={btn.title}
              ref={btn.ref}
              onMouseDown={noFocusSteal}
              onClick={btn.action}
              aria-label={btn.title}
              aria-pressed={btn.isActive}
              title={btn.title}
              className={clsx(btnBase, btn.cls, btn.isActive ? btnActive : btnInactive)}
            >
              {btn.label}
            </button>
          ))}

          {/* Divider: vertical on mobile, horizontal on desktop */}
          {gi < groups.length - 1 && (
            <div className="self-center h-5 w-px mx-1 bg-gray-200 dark:bg-gray-700 md:hidden" />
          )}
          {gi < groups.length - 1 && (
            <div className="hidden md:block w-6 border-t border-gray-200 dark:border-gray-700 my-1" />
          )}
        </div>
      ))}

      {/* Clear formatting — pushed right on mobile, bottom on desktop */}
      <div className="flex items-center md:flex-col ml-auto md:ml-0 md:mt-auto md:w-full md:px-1.5">
        <div className="self-center h-5 w-px mx-1 bg-gray-200 dark:bg-gray-700 md:hidden" />
        <div className="hidden md:block w-6 border-t border-gray-200 dark:border-gray-700 my-1" />
        <button
          onMouseDown={noFocusSteal}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          aria-label="Clear formatting"
          title="Clear formatting"
          className={clsx(btnBase, "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300")}
        >
          ✕
        </button>
      </div>

      {/* Link URL popover — rendered with fixed positioning so no overflow container clips it */}
      {showLinkInput && (
        <div
          role="dialog"
          aria-label="Insert link"
          style={popoverStyle}
          className="z-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
        >
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Insert link</p>
          <label htmlFor="toolbar-link-input" className="sr-only">URL</label>
          <input
            id="toolbar-link-input"
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => { setLinkUrl(e.target.value); setLinkError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            aria-describedby={linkError ? "toolbar-link-error" : undefined}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {linkError && (
            <p id="toolbar-link-error" role="alert" className="text-[10px] text-red-500 mt-1">
              {linkError}
            </p>
          )}
          <div className="flex gap-1.5 mt-2.5">
            <button
              onMouseDown={noFocusSteal}
              onClick={applyLink}
              className="flex-1 py-1.5 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 font-medium transition-colors"
            >
              Apply
            </button>
            <button
              onMouseDown={noFocusSteal}
              onClick={cancelLink}
              className="flex-1 py-1.5 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
