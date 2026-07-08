'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Copy, Share2, CornerDownRight, CheckCircle2, Bookmark } from 'lucide-react';
import type { Prompt } from '@/lib/notion';

interface PromptDetailModalProps {
  prompt: Prompt;
  isModal: boolean;
}

export function PromptDetailModal({ prompt, isModal }: PromptDetailModalProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [markers, setMarkers] = useState<Array<{
    id: string;
    top: number;
    offsetTop: number;
    inputs: Array<{ id: string; label: string }>;
  }>>([]);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Close modal by navigating back
  const handleClose = () => {
    if (isModal) {
      router.back();
    }
  };

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
  }, [isModal]);

  // Parse prompt content into text and input segments
  const segments = useMemo(() => {
    const parsedSegments: Array<{
      type: 'text' | 'input';
      value: string;
      id: string;
      placeholder?: string;
      defaultValue?: string;
    }> = [];
    
    let lastIndex = 0;
    let match;
    let inputCount = 0;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    while ((match = variableRegex.exec(prompt.content)) !== null) {
      // Plain text before the variable
      if (match.index > lastIndex) {
        parsedSegments.push({
          type: 'text',
          value: prompt.content.substring(lastIndex, match.index),
          id: `text-${lastIndex}`
        });
      }
      
      const fullMatchContent = match[1];
      // Check for custom example in variable, e.g. {{이름, 예: 홍길동}} or {{이름, example: 홍길동}}
      const parts = fullMatchContent.split(/,\s*(?:예|example)\s*:\s*/i);
      const placeholder = parts[0].trim();
      const defaultValue = parts[1] ? parts[1].trim() : '';
      
      const inputId = `input-${inputCount++}`;
      parsedSegments.push({
        type: 'input',
        value: placeholder,
        id: inputId,
        placeholder: placeholder,
        defaultValue: defaultValue
      });

      // Preset default value if any
      if (defaultValue) {
        setInputValues(prev => ({
          ...prev,
          [inputId]: defaultValue
        }));
      }
      
      lastIndex = variableRegex.lastIndex;
    }
    
    // Remaining plain text
    if (lastIndex < prompt.content.length) {
      parsedSegments.push({
        type: 'text',
        value: prompt.content.substring(lastIndex),
        id: `text-${lastIndex}`
      });
    }
    
    return parsedSegments;
  }, [prompt.content]);

  // Calculate coordinates for custom scrollbar markers (grouping elements on the same vertical position)
  const calculateMarkers = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const inputElements = container.querySelectorAll('[data-input-id]');
    const scrollHeight = container.scrollHeight;
    const containerRect = container.getBoundingClientRect();
    
    const grouped: typeof markers = [];
    inputElements.forEach((el: any) => {
      const inputId = el.getAttribute('data-input-id') || '';
      const label = el.getAttribute('placeholder') || '';
      
      // Precise offset calculation relative to scroll container
      const elementRect = el.getBoundingClientRect();
      const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
      const topPercentage = scrollHeight > 0 ? (offsetTop / scrollHeight) * 100 : 0;
      
      // Group items within 8px of offsetTop to prevent visual overlapping on same/close lines
      const existingGroup = grouped.find(g => Math.abs(g.offsetTop - offsetTop) < 8);
      
      if (existingGroup) {
        existingGroup.inputs.push({ id: inputId, label });
      } else {
        grouped.push({
          id: inputId, // Group ID is the ID of the first input in the group
          top: topPercentage,
          offsetTop: offsetTop,
          inputs: [{ id: inputId, label }]
        });
      }
    });
    
    setMarkers(grouped);
  };

  // Re-calculate markers when content size changes or on mount
  useEffect(() => {
    // Small timeout to allow input rendering to complete in DOM
    const timer = setTimeout(() => {
      calculateMarkers();
    }, 100);

    window.addEventListener('resize', calculateMarkers);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateMarkers);
    };
  }, [segments]);

  // Handle marker click to scroll smoothly to the corresponding input
  const handleMarkerClick = (marker: typeof markers[0]) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Scroll element to about 1/3 of the viewport height from the top of the container
    const targetScrollTop = marker.offsetTop - (container.clientHeight / 3);
    
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });

    // Momentarily focus the first input field in the group
    const firstInputId = marker.inputs[0].id;
    const targetInput = container.querySelector(`[data-input-id="${firstInputId}"]`) as HTMLInputElement;
    if (targetInput) {
      setTimeout(() => targetInput.focus(), 300);
    }
  };

  // Compile prompt by replacing variables with input values and copy to clipboard
  const handleCopyCompiled = async () => {
    let finalPrompt = '';
    segments.forEach(seg => {
      if (seg.type === 'text') {
        finalPrompt += seg.value;
      } else {
        const val = inputValues[seg.id]?.trim();
        // If empty, fallback to original variable placeholder: {{Variable}}
        finalPrompt += val ? val : `{{${seg.placeholder}}}`;
      }
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

  const modalContent = (
    <div 
      className={`relative w-full max-w-3xl flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 transform select-none ${
        isModal ? 'animate-in zoom-in-95 duration-200' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Area */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-black tracking-wider uppercase">
              {prompt.category}
            </span>
            {prompt.isFavorite && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                <Bookmark className="w-3 h-3 fill-amber-500" />
                <span>Favorite</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight mt-1 line-clamp-1">
            {prompt.title}
          </h2>
        </div>

        {/* Action Buttons (Share, Close) */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            onClick={handleShare}
            title="공유 링크 복사"
            className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-transparent hover:border-border"
          >
            {shared ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {shared && (
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-[10px] font-bold bg-foreground text-background rounded shadow-lg whitespace-nowrap">
                링크 복사됨!
              </span>
            )}
          </button>

          {/* Close button (only shown if rendering as modal overlay) */}
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

      {/* Description Panel */}
      {prompt.description && (
        <div className="px-6 py-4 bg-muted/10 border-b border-border/50 text-xs text-muted-foreground leading-relaxed">
          <span className="font-extrabold text-foreground block mb-0.5">프롬프트 설명</span>
          {prompt.description}
        </div>
      )}

      {/* Core Parser Playground Area */}
      <div className="relative flex flex-grow h-[55vh] min-h-[300px]">
        {/* Main Content Pane */}
        <div 
          ref={scrollContainerRef}
          className="flex-grow p-6 overflow-y-auto custom-scrollbar relative"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="text-sm md:text-base leading-relaxed text-foreground whitespace-pre-wrap font-medium font-sans">
            {segments.map((seg) => {
              if (seg.type === 'text') {
                return <span key={seg.id}>{seg.value}</span>;
              } else {
                const value = inputValues[seg.id] || '';
                return (
                  <span 
                    key={seg.id} 
                    className="inline-block mx-1 my-0.5 relative group/input"
                  >
                    <input
                      type="text"
                      data-input-id={seg.id}
                      placeholder={seg.placeholder}
                      value={value}
                      onChange={(e) => handleInputChange(seg.id, e.target.value)}
                      className={`px-2 py-0.5 text-xs md:text-sm font-semibold rounded border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary text-center ${
                        value 
                          ? 'bg-primary/5 text-primary border-primary/40 min-w-[60px]' 
                          : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground/40 min-w-[90px]'
                      }`}
                      style={{
                        // Dynamic width based on placeholder or value length to fit layout neatly
                        width: `${Math.max(
                          (value.length || seg.placeholder?.length || 5) * 11 + 24,
                          100
                        )}px`
                      }}
                    />
                    {seg.defaultValue && !value && (
                      <span 
                        onClick={() => handleInputChange(seg.id, seg.defaultValue!)}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/input:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-muted text-muted-foreground rounded border border-border cursor-pointer whitespace-nowrap shadow-sm hover:text-primary transition-colors"
                      >
                        기본값 입력: {seg.defaultValue}
                      </span>
                    )}
                  </span>
                );
              }
            })}
          </div>
        </div>

        {/* Custom scroll markers minimap */}
        {markers.length > 0 && (
          <div className="relative w-8 border-l border-border bg-muted/5 flex flex-col items-center py-4 flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-3.5 w-1 bg-border/40 rounded-full my-4" />
            
            {markers.map((marker) => {
              // Group is fully completed if every input is filled.
              const isAllFilled = marker.inputs.every(inp => !!inputValues[inp.id]);
              const isSomeFilled = !isAllFilled && marker.inputs.some(inp => !!inputValues[inp.id]);
              
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
                  aria-label={`Scroll to ${marker.inputs.map(i => i.label).join(', ')}`}
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
                      const isInputFilled = !!inputValues[inp.id];
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

      {/* Footer Copy CTA Area */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
        <div className="text-xs text-muted-foreground hidden sm:block">
          빈칸을 모두 채운 뒤 복사 버튼을 눌러 완성된 프롬프트를 획득하세요.
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
              <span>클립보드 복사 성공!</span>
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

  const handleInputChange = (inputId: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [inputId]: value
    }));
  };

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
