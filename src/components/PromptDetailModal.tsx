'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Copy, Share2, CornerDownRight, CheckCircle2, Bookmark, Square, CheckSquare } from 'lucide-react';
import type { Prompt } from '@/lib/notion';

interface PromptDetailModalProps {
  prompt: Prompt;
  isModal: boolean;
}

// Token types for inline markdown parsing
type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; children: InlineToken[] }
  | { type: 'italic'; children: InlineToken[] }
  | { type: 'code'; content: string }
  | { type: 'del'; children: InlineToken[] }
  | { type: 'underline'; children: InlineToken[] }
  | { type: 'link'; text: string; url: string }
  | { type: 'input'; id: string; placeholder: string; defaultValue?: string };

// Block types for structured Notion-like markdown rendering
type MarkdownBlock =
  | { type: 'heading_1'; content: string }
  | { type: 'heading_2'; content: string }
  | { type: 'heading_3'; content: string }
  | { type: 'divider' }
  | { type: 'quote'; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'bullet_list'; indent: number; content: string }
  | { type: 'numbered_list'; number: string; indent: number; content: string }
  | { type: 'to_do'; checked: boolean; indent: number; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'blank' };

export function PromptDetailModal({ prompt, isModal }: PromptDetailModalProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract all variable occurrences in prompt text in document order
  const variableMatches = useMemo(() => {
    const list: Array<{
      id: string;
      placeholder: string;
      defaultValue: string;
    }> = [];
    let count = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(prompt.content)) !== null) {
      const inner = match[1];
      const parts = inner.split(/,\s*(?:예|example)\s*:\s*/i);
      const placeholder = parts[0].trim();
      const defaultValue = parts[1] ? parts[1].trim() : '';
      list.push({
        id: `input-${count++}`,
        placeholder,
        defaultValue,
      });
    }
    return list;
  }, [prompt.content]);

  // Unique inputs for left column form
  const uniqueInputs = useMemo(() => {
    const seen = new Set<string>();
    const unique: typeof variableMatches = [];
    variableMatches.forEach((item) => {
      if (item.placeholder && !seen.has(item.placeholder)) {
        seen.add(item.placeholder);
        unique.push(item);
      }
    });
    return unique;
  }, [variableMatches]);

  // Initialize input values state with defaults
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    variableMatches.forEach((item) => {
      if (item.defaultValue) {
        initial[item.id] = item.defaultValue;
      }
    });
    return initial;
  });

  // Re-sync input default values when viewing a different prompt ID (standard React pattern)
  const [prevPromptId, setPrevPromptId] = useState(prompt.id);
  if (prevPromptId !== prompt.id) {
    setPrevPromptId(prompt.id);
    const initial: Record<string, string> = {};
    variableMatches.forEach((item) => {
      if (item.defaultValue) {
        initial[item.id] = item.defaultValue;
      }
    });
    setInputValues(initial);
  }

  const [markers, setMarkers] = useState<
    Array<{
      id: string;
      top: number;
      offsetTop: number;
      inputs: Array<{ id: string; label: string }>;
    }>
  >([]);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Close modal by navigating back
  const handleClose = useCallback(() => {
    if (isModal) {
      router.back();
    }
  }, [isModal, router]);

  // Close on ESC key press
  useEffect(() => {
    if (!isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, handleClose]);

  // Handle variable value changes (syncing identical placeholders across the prompt)
  const handleInputChange = useCallback((inputId: string, value: string) => {
    const target = variableMatches.find((v) => v.id === inputId);
    if (target) {
      const targetPlaceholder = target.placeholder;
      setInputValues((prev) => {
        const updated = { ...prev };
        variableMatches.forEach((v) => {
          if (v.placeholder === targetPlaceholder) {
            updated[v.id] = value;
          }
        });
        return updated;
      });
    } else {
      setInputValues((prev) => ({
        ...prev,
        [inputId]: value,
      }));
    }
  }, [variableMatches]);

  // Calculate coordinates for custom scrollbar markers (grouping elements on the same vertical position)
  const calculateMarkers = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const inputElements = container.querySelectorAll<HTMLInputElement>('[data-input-id]');
    const scrollHeight = container.scrollHeight;
    const containerRect = container.getBoundingClientRect();

    const grouped: typeof markers = [];
    inputElements.forEach((el) => {
      const inputId = el.getAttribute('data-input-id') || '';
      const label = el.getAttribute('placeholder') || '';

      const elementRect = el.getBoundingClientRect();
      const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
      const topPercentage = scrollHeight > 0 ? (offsetTop / scrollHeight) * 100 : 0;

      // Group items within 8px of offsetTop to prevent overlapping dots
      const existingGroup = grouped.find((g) => Math.abs(g.offsetTop - offsetTop) < 8);

      if (existingGroup) {
        existingGroup.inputs.push({ id: inputId, label });
      } else {
        grouped.push({
          id: inputId,
          top: topPercentage,
          offsetTop,
          inputs: [{ id: inputId, label }],
        });
      }
    });

    setMarkers(grouped);
  }, []);

  // Re-calculate markers when content size changes or on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateMarkers();
    }, 150);

    window.addEventListener('resize', calculateMarkers);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateMarkers);
    };
  }, [prompt.content, calculateMarkers]);

  // Handle marker click to scroll smoothly to the corresponding input
  const handleMarkerClick = (marker: (typeof markers)[0]) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetScrollTop = marker.offsetTop - container.clientHeight / 3;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });

    const firstInputId = marker.inputs[0].id;
    const targetInput = container.querySelector<HTMLInputElement>(`[data-input-id="${firstInputId}"]`);
    if (targetInput) {
      setTimeout(() => targetInput.focus(), 300);
    }
  };

  // Compile prompt by replacing variables with input values and copy Markdown to clipboard
  const handleCopyCompiled = async () => {
    let inputCount = 0;
    const finalPrompt = prompt.content.replace(/\{\{([^}]+)\}\}/g, (_match, inner) => {
      const inputId = `input-${inputCount++}`;
      const val = inputValues[inputId]?.trim();
      if (val) return val;
      const parts = inner.split(/,\s*(?:예|example)\s*:\s*/i);
      return `{{${parts[0].trim()}}}`;
    });

    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy compiled prompt: ', err);
    }
  };

  // Copy share URL of the current prompt
  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/function/PromptArchive/prompt/${prompt.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link: ', err);
    }
  };

  const handleLeftInputFocus = (inputId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetInput = container.querySelector<HTMLInputElement>(`[data-input-id="${inputId}"]`);
    if (targetInput) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = targetInput.getBoundingClientRect();
      const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
      const targetScrollTop = offsetTop - container.clientHeight / 3;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });

      targetInput.classList.add('ring-4', 'ring-primary/35', 'border-primary');
      setTimeout(() => {
        targetInput.classList.remove('ring-4', 'ring-primary/35', 'border-primary');
      }, 1500);
    }
  };

  // Parse markdown text into structured blocks
  const markdownBlocks = useMemo(() => {
    const lines = prompt.content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          blocks.push({
            type: 'code',
            language: codeLang,
            content: codeLines.join('\n'),
          });
          inCodeBlock = false;
          codeLang = '';
          codeLines = [];
        } else {
          inCodeBlock = true;
          codeLang = line.trim().slice(3);
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Divider (--- or *** or ___)
      if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
        blocks.push({ type: 'divider' });
        continue;
      }

      // Heading 1
      if (/^#\s+(.*)$/.test(line)) {
        blocks.push({ type: 'heading_1', content: line.replace(/^#\s+/, '') });
        continue;
      }

      // Heading 2
      if (/^##\s+(.*)$/.test(line)) {
        blocks.push({ type: 'heading_2', content: line.replace(/^##\s+/, '') });
        continue;
      }

      // Heading 3
      if (/^###\s+(.*)$/.test(line)) {
        blocks.push({ type: 'heading_3', content: line.replace(/^###\s+/, '') });
        continue;
      }

      // Callout / Blockquote
      if (/^>\s?(.*)$/.test(line)) {
        blocks.push({ type: 'quote', content: line.replace(/^>\s?/, '') });
        continue;
      }

      // To-do item
      const todoMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (todoMatch) {
        const indentLevel = Math.floor(todoMatch[1].length / 2);
        blocks.push({
          type: 'to_do',
          checked: todoMatch[2].toLowerCase() === 'x',
          indent: indentLevel,
          content: todoMatch[3],
        });
        continue;
      }

      // Bullet list item
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        const indentLevel = Math.floor(bulletMatch[1].length / 2);
        blocks.push({
          type: 'bullet_list',
          indent: indentLevel,
          content: bulletMatch[2],
        });
        continue;
      }

      // Numbered list item
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        const indentLevel = Math.floor(numberedMatch[1].length / 2);
        blocks.push({
          type: 'numbered_list',
          number: numberedMatch[2],
          indent: indentLevel,
          content: numberedMatch[3],
        });
        continue;
      }

      // Empty blank line
      if (!line.trim()) {
        blocks.push({ type: 'blank' });
        continue;
      }

      // Normal paragraph
      blocks.push({ type: 'paragraph', content: line });
    }

    if (inCodeBlock) {
      blocks.push({
        type: 'code',
        language: codeLang,
        content: codeLines.join('\n'),
      });
    }

    return blocks;
  }, [prompt.content]);

  // Inline markdown tokenizer with variable input resolution
  const renderInlineTokens = useCallback((text: string, getNextInputId: () => string): React.ReactNode[] => {
    function parse(str: string): InlineToken[] {
      const regex =
        /(\{\{[^}]+\}\})|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)|(<u>[^<]+<\/u>)|(\[[^\]]+\]\([^)]+\))/g;
      const elements: InlineToken[] = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIdx) {
          elements.push({ type: 'text', content: str.slice(lastIdx, match.index) });
        }

        const matchedStr = match[0];
        if (match[1]) {
          const inner = matchedStr.slice(2, -2);
          const parts = inner.split(/,\s*(?:예|example)\s*:\s*/i);
          const placeholder = parts[0].trim();
          const defaultValue = parts[1] ? parts[1].trim() : '';
          const id = getNextInputId();
          elements.push({ type: 'input', id, placeholder, defaultValue });
        } else if (match[2]) {
          elements.push({ type: 'code', content: matchedStr.slice(1, -1) });
        } else if (match[3]) {
          const inner = matchedStr.slice(2, -2);
          elements.push({ type: 'bold', children: parse(inner) });
        } else if (match[4]) {
          const inner = matchedStr.slice(1, -1);
          elements.push({ type: 'italic', children: parse(inner) });
        } else if (match[5]) {
          const inner = matchedStr.slice(2, -2);
          elements.push({ type: 'del', children: parse(inner) });
        } else if (match[6]) {
          const inner = matchedStr.slice(3, -4);
          elements.push({ type: 'underline', children: parse(inner) });
        } else if (match[7]) {
          const linkMatch = matchedStr.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            elements.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
          } else {
            elements.push({ type: 'text', content: matchedStr });
          }
        }
        lastIdx = regex.lastIndex;
      }

      if (lastIdx < str.length) {
        elements.push({ type: 'text', content: str.slice(lastIdx) });
      }

      return elements;
    }

    const tokens = parse(text);

    function renderToken(token: InlineToken, index: number): React.ReactNode {
      switch (token.type) {
        case 'text':
          return <span key={`txt-${index}`}>{token.content}</span>;
        case 'bold':
          return (
            <strong key={`b-${index}`} className="font-bold text-foreground">
              {token.children.map(renderToken)}
            </strong>
          );
        case 'italic':
          return (
            <em key={`it-${index}`} className="italic">
              {token.children.map(renderToken)}
            </em>
          );
        case 'code':
          return (
            <code
              key={`cd-${index}`}
              className="px-1.5 py-0.5 rounded bg-muted/80 font-mono text-xs text-primary font-semibold border border-border/40"
            >
              {token.content}
            </code>
          );
        case 'del':
          return (
            <del key={`del-${index}`} className="line-through text-muted-foreground">
              {token.children.map(renderToken)}
            </del>
          );
        case 'underline':
          return (
            <span key={`u-${index}`} className="underline underline-offset-2">
              {token.children.map(renderToken)}
            </span>
          );
        case 'link':
          return (
            <a
              key={`lnk-${index}`}
              href={token.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {token.text}
            </a>
          );
        case 'input': {
          const value = inputValues[token.id] || '';
          return (
            <span key={`inp-${token.id}`} className="inline-block mx-1 my-0.5 relative group/input">
              <input
                type="text"
                data-input-id={token.id}
                placeholder={token.placeholder}
                value={value}
                onChange={(e) => handleInputChange(token.id, e.target.value)}
                className={`px-2 py-0.5 text-xs md:text-sm font-semibold rounded border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary text-center ${
                  value
                    ? 'bg-primary/5 text-primary border-primary/40 min-w-[60px]'
                    : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground/40 min-w-[90px]'
                }`}
                style={{
                  width: `${Math.max((value.length || token.placeholder.length || 5) * 11 + 24, 100)}px`,
                }}
              />
              {token.defaultValue && !value && (
                <span
                  onClick={() => handleInputChange(token.id, token.defaultValue!)}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/input:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-muted text-muted-foreground rounded border border-border cursor-pointer whitespace-nowrap shadow-sm hover:text-primary transition-colors z-20"
                >
                  기본값 입력: {token.defaultValue}
                </span>
              )}
            </span>
          );
        }
      }
    }

    return tokens.map(renderToken);
  }, [inputValues, handleInputChange]);

  // Main modal container content
  const modalContent = (
    <div
      className={`relative w-full max-w-3xl lg:max-w-5xl flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 transform select-text cursor-default ${
        isModal ? 'animate-in zoom-in-95 duration-200' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Area */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-black tracking-wider uppercase">
            {prompt.category}
          </span>
          {prompt.isFavorite && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Bookmark className="w-3.5 h-3.5 fill-amber-500" />
              <span>Favorite</span>
            </span>
          )}
        </div>

        {/* Action Buttons (Share, Close) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            title="공유 링크 복사"
            className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-transparent hover:border-border"
          >
            {shared ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
            {shared && (
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-bold bg-foreground text-background rounded shadow-lg whitespace-nowrap">
                링크 복사됨!
              </span>
            )}
          </button>

          {isModal && (
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-transparent hover:border-border"
              aria-label="모달 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Core Parser Playground Area (2 Columns Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 flex-grow overflow-hidden h-[65vh] min-h-[450px]">
        {/* Left Column: Details & Variables Form */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar select-text">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight leading-snug">
              {prompt.title}
            </h2>
          </div>

          {prompt.description && (
            <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/20 border border-border/50 text-xs md:text-sm text-muted-foreground leading-relaxed">
              <span className="font-extrabold text-foreground block">프롬프트 설명</span>
              {prompt.description}
            </div>
          )}

          {/* Variables Inputs Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              입력 필드 설정
            </h3>
            {uniqueInputs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">입력할 변수가 없는 일반 텍스트 프롬프트입니다.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {uniqueInputs.map((seg) => {
                  const value = inputValues[seg.id] || '';
                  return (
                    <div key={`form-field-${seg.id}`} className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-muted-foreground">{seg.placeholder}</label>
                      <input
                        type="text"
                        placeholder={`${seg.placeholder} 입력...`}
                        value={value}
                        onChange={(e) => handleInputChange(seg.id, e.target.value)}
                        onFocus={() => handleLeftInputFocus(seg.id)}
                        className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-all duration-300"
                      />
                      {seg.defaultValue && !value && (
                        <button
                          onClick={() => handleInputChange(seg.id, seg.defaultValue)}
                          className="text-[10px] text-muted-foreground hover:text-primary text-left self-start transition-colors cursor-pointer"
                        >
                          기본값 사용: <span className="font-semibold">{seg.defaultValue}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prompt Preview Container with Notion-faithful Markdown Styling */}
        <div className="flex flex-col gap-3 h-full overflow-hidden">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
            프롬프트 템플릿 실시간 프리뷰
          </h3>

          <div className="relative flex-grow overflow-hidden flex rounded-xl border border-border/80 bg-muted/5">
            {/* Main Content Pane */}
            <div
              ref={scrollContainerRef}
              className="flex-grow p-6 overflow-y-auto custom-scrollbar relative select-text"
              style={{ scrollbarWidth: 'thin' }}
            >
              {(() => {
                let sequentialInputCount = 0;
                const getNextInputId = () => `input-${sequentialInputCount++}`;

                return (
                  <div className="text-sm md:text-base leading-relaxed text-foreground font-sans space-y-0.5">
                    {markdownBlocks.map((block, idx) => {
                      switch (block.type) {
                        case 'heading_1':
                          return (
                            <h1
                              key={`b-${idx}`}
                              className="text-xl md:text-2xl font-black text-foreground tracking-tight mt-6 mb-3 pb-1.5 border-b border-border/80 flex items-center gap-1.5 flex-wrap"
                            >
                              {renderInlineTokens(block.content, getNextInputId)}
                            </h1>
                          );
                        case 'heading_2':
                          return (
                            <h2
                              key={`b-${idx}`}
                              className="text-lg md:text-xl font-bold text-foreground tracking-tight mt-5 mb-2 flex items-center gap-1.5 flex-wrap"
                            >
                              {renderInlineTokens(block.content, getNextInputId)}
                            </h2>
                          );
                        case 'heading_3':
                          return (
                            <h3
                              key={`b-${idx}`}
                              className="text-base md:text-lg font-bold text-foreground tracking-tight mt-4 mb-1.5 flex items-center gap-1.5 flex-wrap"
                            >
                              {renderInlineTokens(block.content, getNextInputId)}
                            </h3>
                          );
                        case 'divider':
                          return <hr key={`b-${idx}`} className="my-5 border-border/80" />;
                        case 'quote':
                          return (
                            <div
                              key={`b-${idx}`}
                              className="my-3 p-3.5 rounded-xl bg-muted/40 border-l-4 border-primary/70 text-foreground text-xs md:text-sm leading-relaxed flex items-start gap-2"
                            >
                              <div className="flex-grow flex-wrap">
                                {renderInlineTokens(block.content, getNextInputId)}
                              </div>
                            </div>
                          );
                        case 'code':
                          return (
                            <pre
                              key={`b-${idx}`}
                              className="my-3 p-3.5 rounded-xl bg-muted/70 border border-border font-mono text-xs overflow-x-auto text-foreground"
                            >
                              <code>{block.content}</code>
                            </pre>
                          );
                        case 'bullet_list':
                          return (
                            <div
                              key={`b-${idx}`}
                              className="flex items-start gap-2 my-1 text-sm md:text-base leading-relaxed text-foreground"
                              style={{ paddingLeft: `${block.indent * 1.5}rem` }}
                            >
                              <span className="text-primary mt-1 select-none font-bold text-xs flex-shrink-0">•</span>
                              <div className="flex-grow flex-wrap">
                                {renderInlineTokens(block.content, getNextInputId)}
                              </div>
                            </div>
                          );
                        case 'numbered_list':
                          return (
                            <div
                              key={`b-${idx}`}
                              className="flex items-start gap-2 my-1 text-sm md:text-base leading-relaxed text-foreground"
                              style={{ paddingLeft: `${block.indent * 1.5}rem` }}
                            >
                              <span className="text-muted-foreground font-bold mt-0.5 select-none font-mono text-xs flex-shrink-0 min-w-[1.25rem]">
                                {block.number}.
                              </span>
                              <div className="flex-grow flex-wrap">
                                {renderInlineTokens(block.content, getNextInputId)}
                              </div>
                            </div>
                          );
                        case 'to_do':
                          return (
                            <div
                              key={`b-${idx}`}
                              className="flex items-start gap-2 my-1 text-sm md:text-base leading-relaxed text-foreground"
                              style={{ paddingLeft: `${block.indent * 1.5}rem` }}
                            >
                              <span className="mt-0.5 text-primary flex-shrink-0">
                                {block.checked ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground" />
                                )}
                              </span>
                              <div
                                className={`flex-grow flex-wrap ${
                                  block.checked ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {renderInlineTokens(block.content, getNextInputId)}
                              </div>
                            </div>
                          );
                        case 'blank':
                          return <div key={`b-${idx}`} className="h-2" />;
                        case 'paragraph':
                        default:
                          return (
                            <p key={`b-${idx}`} className="my-1.5 text-sm md:text-base leading-relaxed text-foreground">
                              {renderInlineTokens(block.content, getNextInputId)}
                            </p>
                          );
                      }
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Custom scroll markers minimap */}
            {markers.length > 0 && (
              <div className="relative w-8 border-l border-border bg-muted/5 flex flex-col items-center py-4 flex-shrink-0">
                <div className="absolute top-0 bottom-0 right-3.5 w-1 bg-border/40 rounded-full my-4" />

                {markers.map((marker) => {
                  const isAllFilled = marker.inputs.every((inp) => Boolean(inputValues[inp.id]));
                  const isSomeFilled = !isAllFilled && marker.inputs.some((inp) => Boolean(inputValues[inp.id]));

                  return (
                    <button
                      key={marker.id}
                      onClick={() => handleMarkerClick(marker)}
                      onMouseEnter={() => setHoveredMarkerId(marker.id)}
                      onMouseLeave={() => setHoveredMarkerId(null)}
                      className={`absolute right-3 w-2 h-2 rounded-full transform -translate-y-1/2 z-10 transition-all duration-300 cursor-pointer ${
                        isAllFilled
                          ? 'bg-primary scale-110 shadow shadow-primary/30'
                          : isSomeFilled
                            ? 'bg-primary/50 border border-primary scale-105 shadow shadow-primary/10'
                            : 'bg-muted-foreground/75 hover:bg-primary scale-100 hover:scale-125'
                      }`}
                      style={{ top: `${marker.top}%` }}
                      aria-label={`Scroll to ${marker.inputs.map((i) => i.label).join(', ')}`}
                    />
                  );
                })}

                {/* Hover preview tooltip */}
                {markers.map((marker) => {
                  const isHovered = hoveredMarkerId === marker.id;
                  if (!isHovered) return null;

                  return (
                    <div
                      key={`tooltip-${marker.id}`}
                      className="absolute right-7 transform -translate-y-1/2 z-20 pointer-events-none"
                      style={{ top: `${marker.top}%` }}
                    >
                      <div className="flex flex-col gap-1 bg-foreground text-background text-[10px] font-black px-3 py-2 rounded-lg shadow-lg whitespace-nowrap mr-2 border border-border/10 animate-in fade-in slide-in-from-right-1 duration-150 min-w-[120px]">
                        {marker.inputs.map((inp) => {
                          const isInputFilled = Boolean(inputValues[inp.id]);
                          return (
                            <div key={inp.id} className="flex items-center gap-1.5">
                              <CornerDownRight className="w-3 h-3 text-primary flex-shrink-0" />
                              <span>{inp.label}</span>
                              {isInputFilled ? (
                                <span className="text-[9px] text-primary ml-auto pl-2">(입력됨)</span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/50 ml-auto pl-2">(미입력)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Copy CTA Area */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
        <div className="text-xs text-muted-foreground hidden sm:block">
          빈칸을 모두 채운 뒤 복사 버튼을 눌러 완성된 마크다운 프롬프트를 획득하세요.
        </div>

        {/* Final Copy button */}
        <button
          onClick={handleCopyCompiled}
          className={`flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-6 rounded-lg transition-all duration-300 cursor-pointer shadow-sm ${
            copied
              ? 'bg-primary text-primary-foreground scale-[0.98]'
              : 'bg-foreground text-background hover:opacity-90'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-primary-foreground animate-bounce" />
              <span>마크다운 프롬프트 복사 완료!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>완성된 프롬프트 복사</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // If page-level rendering, return the content without fixed overlays
  if (!isModal) {
    return modalContent;
  }

  // If modal-level rendering, wrap in fixed backdrop
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {modalContent}
    </div>
  );
}
