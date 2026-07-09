import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalHeader } from "@/components/GlobalHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wedodare.com"),
  title: "Prompt Archive - WeDoDare",
  description: "노션 데이터베이스 기반 개인용 프롬프트 저장소 및 파싱 관리 도구",
  alternates: {
    canonical: "/function/PromptArchive",
  },
  openGraph: {
    title: "Prompt Archive - WeDoDare",
    description: "노션 데이터베이스 기반 개인용 프롬프트 저장소 및 파싱 관리 도구",
    url: "https://www.wedodare.com/function/PromptArchive",
    siteName: "WeDoDare",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Archive - WeDoDare",
    description: "노션 데이터베이스 기반 개인용 프롬프트 저장소 및 파싱 관리 도구",
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html 
      lang="ko" 
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} 
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <GlobalHeader />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}
