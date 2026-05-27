import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
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
      className="px-2.5 md:px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium"
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-3 md:gap-6">
            <Link
              href="/"
              className="font-bold text-base tracking-tight inline-flex items-center gap-2 group shrink-0"
            >
              <span className="inline-flex w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all">
                <svg
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                >
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </span>
              <span className="hidden sm:inline">Stock Search</span>
            </Link>
            <nav className="flex gap-0.5 text-sm overflow-x-auto -mx-1 px-1 scrollbar-hide flex-1">
              <NavLink href="/" emoji="🔍" label="ホーム" />
              <NavLink href="/portfolio" emoji="💼" label="保有" />
              <NavLink href="/screener" emoji="🎯" label="検索" />
              <NavLink href="/stocks" emoji="📚" label="全銘柄" />
              <NavLink href="/etfs" emoji="📊" label="ETF" />
              <NavLink href="/watchlist" emoji="⭐" label="ウォッチ" />
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-7 [padding-left:max(0.75rem,env(safe-area-inset-left))] [padding-right:max(0.75rem,env(safe-area-inset-right))]">
          {children}
        </main>
        <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-xs text-center text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            📈 Powered by Yahoo Finance
            <span>·</span>
            投資判断は自己責任で
          </span>
        </footer>
      </body>
    </html>
  );
}
