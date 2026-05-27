"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/",          emoji: "🏠", label: "ホーム",  color: "from-violet-500 to-indigo-500"  },
  { href: "/portfolio", emoji: "💼", label: "保有",    color: "from-emerald-500 to-teal-500"   },
  { href: "/screener",  emoji: "🎯", label: "検索",    color: "from-orange-500 to-amber-500"   },
  { href: "/fx",        emoji: "💱", label: "FX",      color: "from-cyan-500 to-sky-500"       },
  { href: "/crypto",    emoji: "₿",  label: "仮想通貨", color: "from-orange-500 to-amber-400"  },
  { href: "/watchlist", emoji: "⭐", label: "ウォッチ", color: "from-pink-500 to-rose-500"     },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bg-white/92 dark:bg-slate-900/92 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 flex items-stretch justify-around px-0.5 shadow-2xl shadow-black/10 overflow-x-auto scrollbar-hide">
        {ITEMS.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 min-w-[52px] flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-90"
            >
              <span className={`flex items-center justify-center w-8 h-6 rounded-lg text-base transition-all ${active ? `bg-gradient-to-br ${item.color} shadow-sm` : ""}`}>
                {item.emoji}
              </span>
              <span className={`text-[8px] font-medium tracking-wide transition-colors whitespace-nowrap ${
                active ? "text-slate-900 dark:text-white font-bold" : "text-slate-400 dark:text-slate-500"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
