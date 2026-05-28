import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import QuoteHeader from "@/components/QuoteHeader";
import PriceChart from "@/components/PriceChart";
import FundamentalsTable from "@/components/FundamentalsTable";
import AnalystRecommendations from "@/components/AnalystRecommendations";
import EarningsCard from "@/components/EarningsCard";
import YutaiCard from "@/components/YutaiCard";
import CompanyProfile from "@/components/CompanyProfile";
import HoldersCard from "@/components/HoldersCard";
import NewsCard from "@/components/NewsCard";
import PeerStocks from "@/components/PeerStocks";
import RecentViewedTracker from "@/components/RecentViewedTracker";
import BuySellSentiment from "@/components/BuySellSentiment";
import AIAnalysis from "@/components/AIAnalysis";
import StockGeopoliticalNews from "@/components/StockGeopoliticalNews";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <RecentViewedTracker symbol={symbol} />
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="flex-1">
          <SearchBox />
        </div>
      </div>

      <QuoteHeader symbol={symbol} />
      <BuySellSentiment symbol={symbol} />
      <AIAnalysis symbol={symbol} />
      <PriceChart symbol={symbol} />
      <AnalystRecommendations symbol={symbol} />
      <EarningsCard symbol={symbol} />
      <YutaiCard symbol={symbol} />
      <FundamentalsTable symbol={symbol} />
      <HoldersCard symbol={symbol} />
      <NewsCard symbol={symbol} />
      <StockGeopoliticalNews symbol={symbol} />
      <PeerStocks symbol={symbol} />
      <CompanyProfile symbol={symbol} />
    </div>
  );
}
