import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MarketTicker from "@/components/MarketTicker";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Search · 日米株式検索",
  description:
    "日本株・米国株の検索、リアルタイム株価、チャート、ファンダメンタルズ分析、ポートフォリオ管理",
  applicationName: "Stock Search",
  appleWebApp: {
    capable: true,
    title: "Stock Search",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all whitespace-nowrap"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* ── Header ── */}
        <header
          className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/[0.06] [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]"
        >
          {/* Gradient accent stripe */}
          <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

          <div className="max-w-6xl mx-auto px-3 sm:px-4 h-12 flex items-center gap-3 md:gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 group shrink-0"
            >
              <span className="inline-flex w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 group-hover:shadow-blue-500/35 transition-all duration-150">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                  stroke="currentColor"
                >
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </span>
              <span className="hidden sm:block text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                StockSearch
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-0.5 overflow-x-auto scrollbar-none flex-1">
              <NavLink href="/"          label="ホーム" />
              <NavLink href="/portfolio" label="保有" />
              <NavLink href="/screener"  label="スクリーナー" />
              <NavLink href="/stocks"    label="全銘柄" />
              <NavLink href="/sectors"   label="セクター" />
              <NavLink href="/ai-ranking" label="AI予想" />
              <NavLink href="/learn"     label="学習" />
              <NavLink href="/watchlist" label="ウォッチ" />
            </nav>

            {/* Mobile quick-access */}
            <div className="flex md:hidden gap-1 ml-auto">
              <Link
                href="/screener"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <span className="text-base">🎯</span>
              </Link>
              <Link
                href="/watchlist"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <span className="text-base">⭐</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ── Market Ticker ── */}
        <MarketTicker />

        {/* ── Main content ── */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 pb-24 md:pb-8 [padding-left:max(0.75rem,env(safe-area-inset-left))] [padding-right:max(0.75rem,env(safe-area-inset-right))]">
          {children}
        </main>

        {/* ── Footer (desktop only) ── */}
        <footer className="hidden md:flex items-center justify-center border-t border-zinc-200/50 dark:border-white/[0.05] py-4 text-xs text-zinc-400 gap-3">
          <span>Powered by Yahoo Finance</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>投資判断は自己責任でお願いします</span>
        </footer>

        {/* ── Mobile Bottom Nav ── */}
        <BottomNav />
      </body>
    </html>
  );
}
