"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Sparkles, TrendingUp, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  activeFg: string;
  activeBg: string;
};

const ITEMS: NavItem[] = [
  {
    href: "/",          label: "ホーム",   Icon: Home,
    activeFg: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-50 dark:bg-violet-500/[0.12]",
  },
  {
    href: "/portfolio", label: "保有",     Icon: Briefcase,
    activeFg: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-50 dark:bg-emerald-500/[0.12]",
  },
  {
    href: "/ranking",   label: "ランキング", Icon: TrendingUp,
    activeFg: "text-orange-600 dark:text-orange-400",
    activeBg: "bg-orange-50 dark:bg-orange-500/[0.12]",
  },
  {
    href: "/ai-ranking", label: "AI予想",  Icon: Sparkles,
    activeFg: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-50 dark:bg-violet-500/[0.12]",
  },
  {
    href: "/watchlist", label: "ウォッチ", Icon: Star,
    activeFg: "text-pink-600 dark:text-pink-400",
    activeBg: "bg-pink-50 dark:bg-pink-500/[0.12]",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl"
    >
      {/* Hairline separator */}
      <div className="h-px bg-zinc-200/80 dark:bg-white/[0.06]" />

      <div
        className="flex items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all active:scale-90"
              style={{ minHeight: 56 }}
            >
              {/* Icon */}
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-150 ${
                  active
                    ? `${item.activeBg} ${item.activeFg}`
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                <item.Icon
                  className="w-[19px] h-[19px]"
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </span>

              {/* Label */}
              <span
                className={`text-[9px] font-semibold tracking-wide leading-none transition-colors whitespace-nowrap ${
                  active
                    ? "text-zinc-800 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
