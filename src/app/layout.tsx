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
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

function NavLink({
  href,
  emoji,
  label,
}: {
  href: string;
  emoji: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <span aria-hidden className="text-[15px] opacity-80">{emoji}</span>
      <span>{label}</span>
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
        className="min-h-full flex flex-col bg-slate-50/60 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* ── Header ── */}
        <header className="relative border-b border-slate-200/60 dark:border-slate-800/50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30 header-gradient-border [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 h-12 flex items-center gap-2 md:gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="font-extrabold tracking-tight inline-flex items-center gap-2 group shrink-0"
            >
              <span className="inline-flex w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-white shadow-md shadow-violet-500/25 group-hover:scale-105 transition-all duration-150">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </span>
              <span className="hidden sm:inline text-sm font-bold text-slate-800 dark:text-slate-100">
                Stock Search
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-0.5 overflow-x-auto scrollbar-none flex-1">
              <NavLink href="/"          emoji="🏠" label="ホーム"      />
              <NavLink href="/portfolio" emoji="💼" label="保有"        />
              <NavLink href="/screener"  emoji="🎯" label="スクリーナー" />
              <NavLink href="/stocks"    emoji="📚" label="全銘柄"      />
              <NavLink href="/sectors"   emoji="📊" label="セクター"    />
              <NavLink href="/learn"     emoji="📖" label="学習"        />
              <NavLink href="/fx"        emoji="💱" label="FX"          />
              <NavLink href="/crypto"    emoji="₿"  label="暗号資産"    />
              <NavLink href="/watchlist" emoji="⭐" label="ウォッチ"    />
            </nav>

            {/* Mobile quick-access */}
            <div className="flex md:hidden gap-1 ml-auto">
              <Link href="/screener"  className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors text-base">🎯</Link>
              <Link href="/watchlist" className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors text-base">⭐</Link>
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
        <footer className="hidden md:flex items-center justify-center border-t border-slate-200/50 dark:border-slate-800/50 py-4 text-xs text-slate-400 gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[9px]">📈</span>
            Powered by Yahoo Finance
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>投資判断は自己責任でお願いします</span>
        </footer>

        {/* ── Mobile Bottom Nav ── */}
        <BottomNav />
      </body>
    </html>
  );
}
