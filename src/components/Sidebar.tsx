"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Briefcase, SlidersHorizontal, Library,
  BarChart2, Star, Sparkles, BookOpen, Calendar, Rocket,
} from "lucide-react";

type NavItem = {
  href:  string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon:  any;
  fg:    string;
  bg:    string;
  dot:   string;
};

// ── メインナビ ─────────────────────────────────────────────────────
const MAIN_ITEMS: NavItem[] = [
  {
    href: "/",          label: "ホーム",      Icon: Home,
    fg: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    dot: "bg-violet-500",
  },
  {
    href: "/portfolio", label: "保有",        Icon: Briefcase,
    fg: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  {
    href: "/screener",  label: "スクリーナー", Icon: SlidersHorizontal,
    fg: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    dot: "bg-orange-500",
  },
  {
    href: "/stocks",    label: "全銘柄",       Icon: Library,
    fg: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    dot: "bg-blue-500",
  },
  {
    href: "/sectors",   label: "セクター",     Icon: BarChart2,
    fg: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    dot: "bg-sky-500",
  },
  {
    href: "/watchlist", label: "ウォッチ",     Icon: Star,
    fg: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
    dot: "bg-pink-500",
  },
];

// ── マーケット情報ナビ ─────────────────────────────────────────────
const MARKET_ITEMS: NavItem[] = [
  {
    href: "/earnings",  label: "決算カレンダー", Icon: Calendar,
    fg: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
  },
  {
    href: "/ipo",       label: "IPO情報",        Icon: Rocket,
    fg: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    dot: "bg-rose-500",
  },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? `${item.fg} ${item.bg} font-semibold`
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      <item.Icon
        className="w-4 h-4 shrink-0"
        strokeWidth={active ? 2.5 : 1.8}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {active && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 bottom-0 z-20 w-48 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/70"
      style={{ top: "50px" }}
    >
      {/* ── メインナビ ── */}
      <nav className="px-2 pt-3 pb-1 space-y-px">
        {MAIN_ITEMS.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* ── マーケット情報 ── */}
      <div className="px-2 pt-2 pb-1">
        <div className="px-2.5 py-1 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            マーケット情報
          </span>
        </div>
        <div className="space-y-px">
          {MARKET_ITEMS.map(item => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </div>

      {/* ── スペーサー ── */}
      <div className="flex-1" />

      {/* ── 特別リンク ── */}
      <div className="px-2 py-2 space-y-1 border-t border-zinc-100 dark:border-zinc-800">
        {/* AI予想 */}
        <Link
          href="/ai-ranking"
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-sm shadow-violet-500/20 transition-all ${
            isActive("/ai-ranking") ? "ring-2 ring-violet-400/40" : ""
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span>AI投資予想</span>
        </Link>

        {/* 学習 */}
        <Link
          href="/learn"
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all ${
            isActive("/learn") ? "ring-2 ring-teal-400/40" : ""
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span>📚 学習</span>
        </Link>
      </div>
    </aside>
  );
}
