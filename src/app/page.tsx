import Link from "next/link";
import { Library, Filter, Star, TrendingUp } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import SectorHeatmap from "@/components/SectorHeatmap";
import MarketOverview from "@/components/MarketOverview";
import TopMovers from "@/components/TopMovers";
import RecentViewed from "@/components/RecentViewed";
import InvestmentThemes from "@/components/InvestmentThemes";
import PortfolioHero from "@/components/PortfolioHero";
import TrendNews from "@/components/TrendNews";
import GeopoliticalNews from "@/components/GeopoliticalNews";

export default function Home() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Hero ── */}
      <section className="space-y-3.5">
        <PortfolioHero />
        <div>
          <SearchBox autoFocus />
          <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
            <QuickLink href="/stocks"    icon={<Library   className="w-3.5 h-3.5" />} color="from-blue-500 to-cyan-500">全銘柄</QuickLink>
            <QuickLink href="/screener"  icon={<Filter    className="w-3.5 h-3.5" />} color="from-orange-500 to-amber-500">スクリーナー</QuickLink>
            <QuickLink href="/watchlist" icon={<Star      className="w-3.5 h-3.5" />} color="from-pink-500 to-rose-500">ウォッチリスト</QuickLink>
            <QuickLink href="/sectors" icon={<TrendingUp className="w-3.5 h-3.5" />} color="from-violet-500 to-purple-500">セクター</QuickLink>
          </div>
        </div>
      </section>

      {/* ── Market Overview ── */}
      <section>
        <MarketOverview />
      </section>

      {/* ── Top movers + Trend news ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopMovers />
        <TrendNews />
      </div>

      <RecentViewed />

      {/* ── Sector heatmap + Themes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectorHeatmap />
        <InvestmentThemes />
      </div>

      {/* ── Geopolitical / Macro News ── */}
      <GeopoliticalNews />
    </div>
  );
}

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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${color} text-white text-xs font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-150`}
    >
      {icon}
      {children}
    </Link>
  );
}
