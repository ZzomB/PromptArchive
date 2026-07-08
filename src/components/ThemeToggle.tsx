'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration 오류 방지 (서버/클라이언트 렌더링 상태 일치)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // 마운트되기 전 빈 토글 스켈레톤 렌더링
    return <div className="h-7 w-14 rounded-full border bg-muted" />;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-7 w-14 items-center rounded-full bg-muted border transition-colors duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
      aria-label="테마 변경"
    >
      {/* 움직이는 원형 토글 썸(Thumb) */}
      <span className="absolute left-1 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-500 ease-in-out dark:translate-x-7">
        
        {/* Sun (라이트 모드 아이콘) - 다크 모드 진입 시 회전하며 축소 삭제 */}
        <Sun className="absolute h-3 w-3 scale-100 rotate-0 transition-all duration-500 ease-in-out dark:scale-0 dark:-rotate-90 text-slate-700 dark:text-slate-200" />
        
        {/* Moon (다크 모드 아이콘) - 다크 모드 진입 시 회전하며 확대 노출 */}
        <Moon className="absolute h-3 w-3 scale-0 rotate-90 transition-all duration-500 ease-in-out dark:scale-100 dark:rotate-0 text-slate-700 dark:text-slate-200" />
        
      </span>
    </button>
  );
}
