import Link from "next/link";
import { Library, SlidersHorizontal, Star, Sparkles, BookOpen, Calendar, Rocket } from "lucide-react";
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
      <section className="space-y-3 animate-slide-up">
        <PortfolioHero />

        {/* Search + quick links */}
        <div className="space-y-2.5">
          <SearchBox autoFocus />
          <div className="flex flex-wrap gap-2 text-xs">
            <QuickLink href="/stocks"      icon={<Library           className="w-3.5 h-3.5" />} color="bg-blue-500 hover:bg-blue-600">全銘柄</QuickLink>
            <QuickLink href="/screener"    icon={<SlidersHorizontal className="w-3.5 h-3.5" />} color="bg-violet-500 hover:bg-violet-600">スクリーナー</QuickLink>
            <QuickLink href="/watchlist"   icon={<Star              className="w-3.5 h-3.5" />} color="bg-pink-500 hover:bg-pink-600">ウォッチリスト</QuickLink>
            <QuickLink href="/ai-ranking"  icon={<Sparkles          className="w-3.5 h-3.5" />} color="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600" pulse>AI予想</QuickLink>
            <QuickLink href="/earnings"    icon={<Calendar          className="w-3.5 h-3.5" />} color="bg-amber-500 hover:bg-amber-600">決算</QuickLink>
            <QuickLink href="/ipo"         icon={<Rocket            className="w-3.5 h-3.5" />} color="bg-rose-500 hover:bg-rose-600">IPO</QuickLink>
            <QuickLink href="/learn"       icon={<BookOpen          className="w-3.5 h-3.5" />} color="bg-teal-500 hover:bg-teal-600">学習</QuickLink>
          </div>
        </div>
      </section>

      {/* ── Market Overview ── */}
      <section className="animate-slide-up delay-100">
        <MarketOverview />
      </section>

      {/* ── Movers + Sector (2-col on tablet+) ── */}
      <section className="animate-slide-up delay-150">
        <SectionLabel emoji="📊" text="マーケット動向" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <TopMovers />
          <SectorHeatmap />
        </div>
      </section>

      {/* ── Recent viewed ── */}
      <RecentViewed />

      {/* ── News + Themes (2-col on tablet+) ── */}
      <section className="animate-slide-up delay-200">
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
      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 tracking-tight flex items-center gap-1.5">
        <span className="opacity-70">{emoji}</span>
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
  pulse,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg ${color} text-white text-xs font-semibold hover:brightness-110 hover:-translate-y-0.5 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
      )}
      {icon}
      {children}
    </Link>
  );
}
