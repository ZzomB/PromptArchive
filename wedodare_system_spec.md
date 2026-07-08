# Wedodare Platform System Specification (SSOT)

본 문서는 Wedodare 플랫폼 산하의 모든 독립 웹 프로젝트(루트, 블로그, 기능 앱)가 동일한 사용자 경험, 디자인 시스템, 그리고 연동 규칙을 따르도록 규정하는 **단일 통합 명세서(Single Source of Truth)**입니다.

---

## 1. 플랫폼 라우팅 및 아키텍처 규칙

### ① 최상위 루트 프로젝트 (`www.wedodare.com`) 역할
* **라우터 역할**: 하위 경로로 들어오는 요청을 각 서브 프로젝트의 실제 배포 주소로 프록시(Rewrite)합니다.
* **디렉토리 구분 규칙**:
  * **블로그**: `/blog` 경로를 활용하여 독자적인 블로그 서비스로 연결합니다.
  * **특정 웹 기능 (`/function/[기능명]`)**: 사이트 자체적으로 독립된 특정 기능을 제공하는 앱 (예: `/function/G2Thumbnail`).
  * **연동 상품 페이지 (`/product/[상품명]`)**: 외부 프로그램(예: 크롬 확장프로그램) 등에서 웹으로 연결하여 사용되는 유틸리티나 결제 등의 상품 앱 (예: `/product/capture-billing`).
* **설정 예시 (`next.config.ts`)**:
  ```typescript
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    async rewrites() {
      return [
        // 1. 블로그
        { source: "/blog", destination: "https://blog-wedodare.vercel.app/blog" },
        { source: "/blog/:path*", destination: "https://blog-wedodare.vercel.app/blog/:path*" },
        
        // 2. 연동 상품 (Product) 예시
        { source: "/product/capture-billing", destination: "https://billing-page-capture-to-question.vercel.app/product/capture-billing" },
        { source: "/product/capture-billing/:path*", destination: "https://billing-page-capture-to-question.vercel.app/product/capture-billing/:path*" },
        
        // 3. 웹 기능 (Function) 예시
        { source: "/function/G2Thumbnail", destination: "https://g2thumbnail.vercel.app/function/G2Thumbnail" },
        { source: "/function/G2Thumbnail/:path*", destination: "https://g2thumbnail.vercel.app/function/G2Thumbnail/:path*" },
      ];
    }
  };
  export default nextConfig;
  ```

### ② 서브 프로젝트 규칙
* **경로 접두사(Base Path) 강제**: 모든 서브 프로젝트는 빌드 결과물 및 정적 자산 경로가 꼬이지 않도록 `basePath`를 본인의 경로 명칭(구조적 디렉토리 경로 포함)으로 고정해야 합니다.
* **설정 예시 (기능 앱 기준 `next.config.ts`)**:
  ```typescript
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    basePath: "/function/G2Thumbnail", // 해당 서브 프로젝트의 URL 디렉토리 구조와 동일하게 기입
  };
  export default nextConfig;
  ```

---

## 2. 공통 디자인 토큰 (Tailwind v4 / CSS Variables)

모든 프로젝트는 아래의 글로벌 CSS 변수를 `app/globals.css`에 주입하여 스타일 테마를 완벽하게 통일해야 합니다.

### CSS 테마 변수 정의 (`globals.css`)
```css
@import 'tailwindcss';
@import 'tw-animate-css';
@plugin 'tailwindcss-animate';
@plugin '@tailwindcss/typography';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  
  /* Wedodare 대표 민트색 브랜딩 컬러 */
  --primary: hsl(153 47% 49%);
  --primary-foreground: oklch(0.985 0 0);
  
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  
  /* 공통 레이아웃 상수 */
  --header-height: 3.5rem;
  --sticky-offset: 1.5rem;
  --sticky-top: calc(var(--header-height) + var(--sticky-offset));
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  
  /* 다크모드 차분한 그레이/화이트 매칭 */
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```

---

## 3. 글로벌 공통 내비게이션 바 (Header) 가이드라인

모든 서브디렉토리로의 이동 시 헤더가 깜빡이거나 형태가 어긋나지 않도록 다음 디자인 가이드를 강제합니다.

### ① 헤더 디자인 핵심 스펙
* **높이(Height)**: `h-[3.5rem]` (`h-14`) 고정.
* **배경색(Background)**: 투명도가 가미된 배경 (`bg-background/80 backdrop-blur-md`).
* **경계선(Border)**: 하단에 얇은 보더선 적용 (`border-b border-border`).
* **폭(Width)**: `.container` 클래스 내에 배치하여 좌우 여백을 `max-w-7xl px-4`로 일치시킵니다.
* **드롭다운 메뉴 (Nike-Style)**:
  * **전체 화면 확장**: 마우스 호버 시 가로로 화면 끝까지 확장되는 드롭다운 레이어(`left-0 w-full`)를 absolute로 배치합니다.
  * **호버 버그(Hover Gap) 방지**: 헤더와 드롭다운 영역 사이에 마진(margin-top 등)으로 인한 물리적 갭이 생기면 마우스 커서가 이동하는 순간 호버 이벤트가 끊어져 메뉴가 닫힙니다. 이를 방지하기 위해 트리거 컨테이너를 `h-full` flex 아이템으로 감싸고 드롭다운을 `top-full`에 정확히 밀착시켜 갭을 0px로 고정합니다.
  * **백드롭 오버레이**: 드롭다운 뒤쪽 화면 전체를 반투명 어두운 톤으로 블러 처리(`bg-black/25 backdrop-blur-xs`)하는 오버레이를 배치하여 콘텐츠 몰입감을 극대화합니다. 오버레이에 `pointer-events-none`을 지정하여 마우스가 드롭다운 밖의 빈 배경으로 나가는 순간 호버 상태가 자연스럽게 풀려 닫히도록 유도합니다.
  * **구조적 메뉴 분류**: 드롭다운 내부 영역을 4개 열(Column)로 균등 분할하고, 각각 웹 기능(Functions), 연동 서비스(Products), 플랫폼(Platform), 준비 중(Upcoming) 등으로 구조화하여 링크를 매핑합니다.

### ② React / Tailwind 컴포넌트 마크업 표준 구조
```tsx
import Link from 'next/link';
import Image from 'next/image';

export function GlobalHeader({ currentPath }: { currentPath: string }) {
  const navItems = [
    { label: '홈', href: '/' },
    { label: '블로그', href: '/blog' },
    { label: '기능1', href: '/[기능경로]' }, // [기능경로]는 실제 폴더명/경로명으로 치환하여 사용
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        
        {/* 로고 영역 */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-90">
          <Image 
            src="/logo-light.png" // 각 프로젝트의 public/logo-light.png에 위치한 대표 D 로고 이미지 사용
            alt="WeDoDare Logo" 
            width={24} 
            height={24} 
            className="rounded-md object-contain transition-all duration-300 filter dark:invert"
          />
          <span className="tracking-tight">WeDoDare</span>
        </Link>

        {/* 내비게이션 메뉴 */}
        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.href) && (item.href !== '/' || currentPath === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 오른쪽 유틸리티 영역 (다크모드 토글 등) */}
        <div className="flex items-center gap-4">
          {/* ThemeToggle 컴포넌트 위치 */}
        </div>

      </div>
    </header>
  );
}
```

---

## 4. 검색엔진 최적화(SEO) 및 성능 연동 체크리스트

1. **상대경로/절대경로 검사**: 내부 에셋(이미지, 파비콘 등)을 가리킬 때 반드시 절대 경로 `/`가 아닌 상대 경로 또는 `basePath`가 적용된 경로를 활용합니다.
2. **Canonical 태그 설정**: 중복 사이트 제거를 위해 모든 페이지는 `<link rel="canonical" href="https://www.wedodare.com/blog/..." />` 형태의 통합 도메인 Canonical URL을 가져야 합니다.
3. **통합 로봇 파일**: 메인 사이트의 `public/robots.txt`만 외부에 검색 노출되며, 서브 프로젝트들의 `robots.txt`는 비활성화하거나 무시됩니다.
