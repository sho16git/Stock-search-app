import Link from "next/link";
import { Library, SlidersHorizontal, Star } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import SectorHeatmap from "@/components/SectorHeatmap";
import MarketOverview from "@/components/MarketOverview";
import TopMovers from "@/components/TopMovers";
import RecentViewed from "@/components/RecentViewed";
import InvestmentThemes from "@/components/InvestmentThemes";
import PortfolioHero from "@/components/PortfolioHero";
import NewsPanel from "@/components/NewsPanel";

export default function Home() {
  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Hero: Portfolio + Search ── */}
      <section className="space-y-3">
        <PortfolioHero />

        {/* Search + quick links */}
        <div className="space-y-2.5">
          <SearchBox autoFocus />
          <div className="flex flex-wrap gap-2 text-xs">
            <QuickLink href="/stocks"    icon={<Library           className="w-3.5 h-3.5" />} color="from-blue-500 to-cyan-500">全銘柄</QuickLink>
            <QuickLink href="/screener"  icon={<SlidersHorizontal className="w-3.5 h-3.5" />} color="from-orange-500 to-amber-500">スクリーナー</QuickLink>
            <QuickLink href="/watchlist" icon={<Star              className="w-3.5 h-3.5" />} color="from-pink-500 to-rose-500">ウォッチリスト</QuickLink>
          </div>
        </div>
      </section>

      {/* ── Market Overview ── */}
      <section>
        <MarketOverview />
      </section>

      {/* ── Movers + Sector (2-col on tablet+) ── */}
      <section>
        <SectionLabel emoji="📊" text="マーケット動向" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <TopMovers />
          <SectorHeatmap />
        </div>
      </section>

      {/* ── Recent viewed ── */}
      <RecentViewed />

      {/* ── News + Themes (2-col on tablet+) ── */}
      <section>
        <SectionLabel emoji="🗂️" text="ニュース・テーマ" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <NewsPanel />
          <InvestmentThemes />
        </div>
      </section>

    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
        <span>{emoji}</span>
        <span>{text}</span>
      </span>
    </div>
  );
}

/* ── Quick link pill ── */
function QuickLink({
  href,
  icon,
  color,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${color} text-white text-xs font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-150`}
    >
      {icon}
      {children}
    </Link>
  );
}
