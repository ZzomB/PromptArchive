'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Star, Copy, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Prompt } from '@/lib/notion';

interface PromptCatalogProps {
  initialPrompts: Prompt[];
}

export function PromptCatalog({ initialPrompts }: PromptCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);

  // Extract all unique categories
  const categories = useMemo(() => {
    const cats = new Set(initialPrompts.map(p => p.category).filter(Boolean));
    return ['전체', ...Array.from(cats)];
  }, [initialPrompts]);

  // Filtered prompts list
  const filteredPrompts = useMemo(() => {
    return initialPrompts.filter(prompt => {
      // 1. Search Query Filter
      const matchesSearch = 
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Category Filter
      const matchesCategory = selectedCategory === '전체' || prompt.category === selectedCategory;

      // 3. Favorites Filter
      const matchesFavorite = !showOnlyFavorites || prompt.isFavorite;

      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [initialPrompts, searchQuery, selectedCategory, showOnlyFavorites]);

  // Copy raw prompt content to clipboard
  const handleCopyRaw = async (e: React.MouseEvent, prompt: Prompt) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Share link copy to clipboard
  const handleShare = async (e: React.MouseEvent, prompt: Prompt) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/function/PromptArchive/prompt/${prompt.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setSharedId(prompt.id);
      setTimeout(() => setSharedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  return (
    <div className="w-full flex-grow mx-auto max-w-7xl px-4 py-8 flex flex-col gap-8">
      {/* Hero Section */}
      <div className="text-center flex flex-col items-center gap-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Prompt Archive
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          업무 효율을 극대화해 줄 검증된 프롬프트 모음입니다. 필요한 파라미터를 입력하고 완성본을 복사해 사용해 보세요.
        </p>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch md:items-center bg-card/45 backdrop-blur-md p-4 rounded-xl border border-border/80 max-w-4xl mx-auto w-full">
        
        {/* Search input */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="프롬프트 제목, 설명 또는 태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
          />
        </div>

        {/* Favorite toggle button */}
        <div className="flex items-center gap-2 flex-shrink-0 justify-center">
          <button
            onClick={() => setShowOnlyFavorites(prev => !prev)}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer transition-all duration-300 ${
              showOnlyFavorites 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                : 'bg-background/50 hover:bg-muted text-muted-foreground border-border'
            }`}
          >
            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-amber-500' : ''}`} />
            <span>즐겨찾기</span>
          </button>
        </div>
      </div>

      {/* Horizontal Category selector */}
      <div className="flex flex-wrap gap-2.5 items-center justify-center">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-card/65 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card/10">
          <p className="text-muted-foreground text-sm">일치하는 프롬프트가 존재하지 않습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Link 
              key={prompt.id}
              href={`/prompt/${prompt.id}`}
              scroll={false} // Prevent jumping to top on parallel intercept navigation
              className="group flex flex-col justify-between bg-card hover:bg-card/85 rounded-xl border border-border hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
            >
              <div className="p-6 flex flex-col gap-3">
                {/* Badge and Favorite Status */}
                <div className="flex justify-between items-start gap-4">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {prompt.category}
                  </span>
                  {prompt.isFavorite && (
                    <span className="flex items-center justify-center p-1 rounded-full bg-amber-500/10 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {prompt.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 min-h-[4.5rem]">
                  {prompt.description || "간단한 설명이 등록되지 않은 프롬프트입니다."}
                </p>
              </div>

              {/* Divider and Action Bar */}
              <div className="mt-auto">
                <hr className="border-border" />
                <div className="px-6 py-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                    인터랙티브 파싱 시작 →
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Share Button */}
                    <button
                      onClick={(e) => handleShare(e, prompt)}
                      title="공유 링크 복사"
                      className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-transparent hover:border-border"
                    >
                      {sharedId === prompt.id ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {sharedId === prompt.id && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold bg-foreground text-background rounded shadow-lg whitespace-nowrap">
                          링크 복사됨!
                        </span>
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={(e) => handleCopyRaw(e, prompt)}
                      title="원문 프롬프트 복사"
                      className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-transparent hover:border-border"
                    >
                      {copiedId === prompt.id ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedId === prompt.id && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold bg-foreground text-background rounded shadow-lg whitespace-nowrap">
                          복사 완료!
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
