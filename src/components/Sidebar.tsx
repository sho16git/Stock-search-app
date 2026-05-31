"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Briefcase, SlidersHorizontal, Library,
  BarChart2, Star, Sparkles, BookOpen,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  fg: string;
  bg: string;
  dot: string;
};

const ITEMS: NavItem[] = [
  {
    href: "/",          label: "ホーム",       Icon: Home,
    fg: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    dot: "bg-violet-500",
  },
  {
    href: "/portfolio", label: "保有",         Icon: Briefcase,
    fg: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  {
    href: "/screener",  label: "スクリーナー",  Icon: SlidersHorizontal,
    fg: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    dot: "bg-orange-500",
  },
  {
    href: "/stocks",    label: "全銘柄",        Icon: Library,
    fg: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    dot: "bg-blue-500",
  },
  {
    href: "/sectors",   label: "セクター",      Icon: BarChart2,
    fg: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    dot: "bg-sky-500",
  },
  {
    href: "/watchlist", label: "ウォッチ",      Icon: Star,
    fg: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
    dot: "bg-pink-500",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 bottom-0 z-20 w-52 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/70 overflow-y-auto"
      style={{ top: "50px" }}
    >
      {/* ── 通常ナビ ── */}
      <nav className="flex-1 px-2 pt-5 pb-2 space-y-0.5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? `${item.fg} ${item.bg} font-semibold`
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <item.Icon
                className="w-[18px] h-[18px] shrink-0"
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── 特別リンク ── */}
      <div className="px-2 pb-5 pt-2 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800">
        {/* AI予想 */}
        <Link
          href="/ai-ranking"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-sm shadow-violet-500/20 transition-all ${
            pathname.startsWith("/ai-ranking") ? "ring-2 ring-violet-400/40" : ""
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>AI予想</span>
        </Link>

        {/* 学習 */}
        <Link
          href="/learn"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all ${
            pathname === "/learn" ? "ring-2 ring-teal-400/40" : ""
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>📚 学習</span>
        </Link>
      </div>
    </aside>
  );
}
