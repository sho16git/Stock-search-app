import Link from "next/link";
import { Library, Filter, Star } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import SectorHeatmap from "@/components/SectorHeatmap";
import MarketOverview from "@/components/MarketOverview";
import TopMovers from "@/components/TopMovers";
import RecentViewed from "@/components/RecentViewed";
import InvestmentThemes from "@/components/InvestmentThemes";
import PortfolioHero from "@/components/PortfolioHero";
import TrendNews from "@/components/TrendNews";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <PortfolioHero />
        <div>
          <SearchBox autoFocus />
          <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
            <QuickLink href="/stocks" icon={<Library className="w-3.5 h-3.5" />}>
              全銘柄
            </QuickLink>
            <QuickLink href="/screener" icon={<Filter className="w-3.5 h-3.5" />}>
              条件検索
            </QuickLink>
            <QuickLink href="/watchlist" icon={<Star className="w-3.5 h-3.5" />}>
              ウォッチリスト
            </QuickLink>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold tracking-tight mb-2.5 flex items-center gap-1.5">
          <span>🌐</span>
          <span>マーケット指数</span>
        </h2>
        <MarketOverview />
      </section>

      {/* Top movers + Trend news side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopMovers />
        <TrendNews />
      </div>

      <RecentViewed />

      {/* Sector heatmap + Investment themes side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectorHeatmap />
        <InvestmentThemes />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
    >
      {icon}
      {children}
    </Link>
  );
}
