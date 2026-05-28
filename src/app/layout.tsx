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
  color,
}: {
  href: string;
  emoji: string;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 md:px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-white transition-all inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium group hover:bg-gradient-to-br ${color} hover:shadow-md`}
    >
      <span aria-hidden className="text-base group-hover:scale-110 transition-transform">{emoji}</span>
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
        className="min-h-full flex flex-col bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 text-slate-800 dark:text-slate-100"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* ── Header ── */}
        <header className="relative border-b border-slate-200/60 dark:border-slate-800/60 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl sticky top-0 z-30 header-gradient-border [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3 md:gap-5">
            {/* Logo */}
            <Link
              href="/"
              className="font-extrabold text-base tracking-tight inline-flex items-center gap-2 group shrink-0"
            >
              <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 items-center justify-center text-white shadow-lg shadow-violet-500/30 group-hover:scale-110 group-hover:shadow-violet-500/50 group-hover:rotate-3 transition-all duration-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </span>
              <span className="hidden sm:inline bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                Stock Search
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-0.5 text-sm overflow-x-auto -mx-1 px-1 scrollbar-hide flex-1">
              <NavLink href="/"          emoji="🏠" label="ホーム"       color="from-violet-500 to-indigo-500" />
              <NavLink href="/portfolio" emoji="💼" label="保有"         color="from-emerald-500 to-teal-500"  />
              <NavLink href="/screener"  emoji="🎯" label="検索"         color="from-orange-500 to-amber-500"  />
              <NavLink href="/stocks"    emoji="📚" label="全銘柄"       color="from-blue-500 to-cyan-500"     />
              <NavLink href="/sectors"   emoji="📊" label="セクター"     color="from-violet-500 to-purple-500" />
              <NavLink href="/fx"        emoji="💱" label="FX"           color="from-cyan-500 to-sky-500"      />
              <NavLink href="/crypto"    emoji="₿"  label="仮想通貨"     color="from-orange-500 to-amber-500"  />
              <NavLink href="/watchlist" emoji="⭐" label="ウォッチ"     color="from-pink-500 to-rose-500"     />
            </nav>

            {/* Mobile quick icons */}
            <nav className="flex md:hidden gap-0.5 overflow-x-auto scrollbar-hide flex-1 justify-end">
              <Link href="/screener"  className="p-2 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors text-lg">🎯</Link>
              <Link href="/watchlist" className="p-2 rounded-xl text-slate-500 hover:text-pink-500  hover:bg-pink-50  dark:hover:bg-pink-950/30  transition-colors text-lg">⭐</Link>
            </nav>
          </div>
        </header>

        {/* ── Market Ticker ── */}
        <MarketTicker />

        {/* ── Main content ── */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 pb-20 md:pb-6 [padding-left:max(0.75rem,env(safe-area-inset-left))] [padding-right:max(0.75rem,env(safe-area-inset-right))]">
          {children}
        </main>

        {/* ── Footer (desktop only) ── */}
        <footer className="hidden md:block border-t border-slate-200/60 dark:border-slate-800/60 py-5 text-xs text-center text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white">📈</span>
            Powered by Yahoo Finance
            <span className="text-slate-300 dark:text-slate-600">·</span>
            投資判断は自己責任でお願いします
          </span>
        </footer>

        {/* ── Mobile Bottom Nav ── */}
        <BottomNav />
      </body>
    </html>
  );
}
