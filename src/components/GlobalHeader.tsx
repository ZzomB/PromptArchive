'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function GlobalHeader() {
  // usePathname() returns path relative to the basePath (e.g., "/" for "/function/PromptArchive")
  const localPath = usePathname() || '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  // Active status for the platform
  // Since we are in the PromptArchive project, "기능" dropdown should be active.
  const isFunctionActive = true;
  const isPromptArchiveActive = localPath === '/' || localPath.startsWith('/prompt');

  const navItems = [
    { label: '홈', href: '/' },
    { label: '블로그', href: '/blog' },
  ];

  const functionItems = [
    { label: '구글드라이브 썸네일 변환 (G2Thumbnail)', href: '/function/G2Thumbnail' },
    { label: '이미지 랜덤 제시 (ImageRandomPresentation)', href: '/function/ImageRandomPresentation' },
    { label: '프롬프트 저장소 (PromptArchive)', href: '/function/PromptArchive' },
  ];

  // Helper to render links correctly considering basePath
  const renderLink = (item: { label: string; href: string }, className: string, onClick?: () => void) => {
    if (item.href.startsWith('/function/PromptArchive')) {
      const internalHref = item.href.replace('/function/PromptArchive', '') || '/';
      return (
        <Link key={item.href} href={internalHref} className={className} onClick={onClick}>
          {item.label}
        </Link>
      );
    }
    return (
      <a key={item.href} href={item.href} className={className} onClick={onClick}>
        {item.label}
      </a>
    );
  };

  return (
    <header className="relative sticky top-0 z-50 w-full h-14 border-b border-border bg-background/80 backdrop-blur-md select-none">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        
        {/* 로고 영역 */}
        <a 
          href="/" 
          className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-90 z-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Image 
            src="/function/PromptArchive/logo-light.png" 
            alt="WeDoDare Logo" 
            width={24} 
            height={24} 
            className="rounded-md object-contain transition-all duration-300 filter dark:invert"
          />
          <span className="tracking-tight">WeDoDare</span>
        </a>

        {/* 데스크톱 내비게이션 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 h-full">
          {navItems.map((item) => {
            const isActive = localPath === item.href || (item.href !== '/' && localPath.startsWith(item.href));
            const activeClass = `text-sm font-semibold transition-all hover:text-primary ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`;
            return renderLink(item, activeClass);
          })}
          
          {/* 기능 드롭다운 (Nike-Style full-width menu) */}
          <div className="group h-full flex items-center">
            <button 
              className={`flex items-center gap-1 text-sm font-semibold transition-all hover:text-primary cursor-pointer h-full ${
                isFunctionActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              기능
              <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
            </button>
            
            {/* 배경 어둡게 처리하는 오버레이 (Backdrop Blur) */}
            <div className="fixed inset-0 top-14 bg-black/25 backdrop-blur-xs opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-30" />

            {/* 드롭다운 콘텐츠 영역 */}
            <div className="absolute top-full left-0 w-full bg-background border-b border-border shadow-2xl opacity-0 translate-y-[-8px] pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out z-40">
              <div className="mx-auto max-w-5xl px-8 py-10 grid grid-cols-3 gap-8">
                
                {/* Column 1: 웹 기능 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    웹 기능 (Functions)
                  </h4>
                  <ul className="space-y-3">
                    {functionItems.map((subItem) => {
                      const isSubActive = localPath.startsWith('/prompt') || 
                        (subItem.href === '/function/PromptArchive' && (localPath === '/' || localPath === ''));
                      const subActiveClass = `text-sm font-semibold transition-all hover:text-primary block ${
                        isSubActive ? 'text-primary' : 'text-foreground'
                      }`;
                      return (
                        <li key={subItem.href}>
                          {renderLink(subItem, subActiveClass)}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Column 2: 플랫폼 정보 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    플랫폼 (Platform)
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/"
                        className="text-sm font-semibold transition-all hover:text-primary block text-foreground"
                      >
                        WeDoDare 홈
                      </a>
                    </li>
                    <li>
                      <a
                        href="/blog"
                        className="text-sm font-semibold transition-all hover:text-primary block text-foreground"
                      >
                        WeDoDare 기술 블로그
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://github.com/ZzomB"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold transition-all hover:text-primary block text-foreground"
                      >
                        GitHub 저장소
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Column 3: 피드 (Feed) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    피드 (Feed)
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="/feed/OpinionOnAP"
                        className="text-sm font-semibold transition-all hover:text-primary block text-foreground"
                      >
                        OpinionOnAP
                      </a>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </nav>

        {/* 오른쪽 유틸리티 영역 */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
        </div>

        {/* 모바일 햄버거 버튼 및 테마 토글 */}
        <div className="flex md:hidden items-center gap-3 z-50">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-foreground hover:bg-muted focus:outline-none cursor-pointer"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* 모바일 메뉴 모달/오버레이 */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-background z-40 border-t border-border flex flex-col p-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => {
              const isActive = localPath === item.href || (item.href !== '/' && localPath.startsWith(item.href));
              const mobileClass = `text-base font-semibold py-2 border-b border-border/50 transition-colors ${
                isActive ? 'text-primary' : 'text-foreground'
              }`;
              return renderLink(item, mobileClass, () => setMobileMenuOpen(false));
            })}

            {/* 모바일 기능 드롭다운 (아코디언) */}
            <div className="flex flex-col">
              <button
                onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                className={`flex items-center justify-between text-base font-semibold py-2 border-b border-border/50 transition-colors text-left cursor-pointer ${
                  isFunctionActive ? 'text-primary' : 'text-foreground'
                }`}
              >
                <span>기능</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileDropdownOpen && (
                <div className="pl-4 py-2 flex flex-col gap-2 bg-muted/30 rounded-lg mt-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1 px-1">웹 기능</div>
                  {functionItems.map((subItem) => {
                    const isSubActive = localPath.startsWith('/prompt') || 
                      (subItem.href === '/function/PromptArchive' && (localPath === '/' || localPath === ''));
                    const subMobileClass = `text-sm font-medium py-1 transition-colors pl-2 ${
                      isSubActive ? 'text-primary' : 'text-muted-foreground'
                    }`;
                    return renderLink(subItem, subMobileClass, () => setMobileMenuOpen(false));
                  })}
                </div>
              )}
            </div>

            {/* 모바일 플랫폼 홈 바로가기 */}
            <a
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold py-2 border-b border-border/50 transition-colors text-foreground"
            >
              WeDoDare 홈
            </a>

            {/* 모바일 피드 섹션 */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">피드 (Feed)</div>
              <a
                href="/feed/OpinionOnAP"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold py-1 transition-colors pl-2 text-foreground/90"
              >
                OpinionOnAP
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
