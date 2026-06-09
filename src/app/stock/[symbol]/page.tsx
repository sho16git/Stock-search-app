import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import QuoteHeader from "@/components/QuoteHeader";
import { CurrencyProvider } from "@/lib/currency-context";
import StockChart from "@/components/StockChart";
import FundamentalsTable from "@/components/FundamentalsTable";
import AnalystRecommendations from "@/components/AnalystRecommendations";
import EarningsCard from "@/components/EarningsCard";
import YutaiCard from "@/components/YutaiCard";
import HoldersCard from "@/components/HoldersCard";
import NewsCard from "@/components/NewsCard";
import PeerStocks from "@/components/PeerStocks";
import RecentViewedTracker from "@/components/RecentViewedTracker";
import BuySellSentiment from "@/components/BuySellSentiment";
import AIAnalysis from "@/components/AIAnalysis";
import AiScenarios from "@/components/AiScenarios";
import StockGeopoliticalNews from "@/components/StockGeopoliticalNews";
import DividendHistory from "@/components/DividendHistory";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);

  return (
    <CurrencyProvider>
    <div className="space-y-3.5 sm:space-y-4">
      <RecentViewedTracker symbol={symbol} />
      <div className="flex items-center gap-3 animate-fade-up">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:-translate-x-0.5 transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="flex-1">
          <SearchBox />
        </div>
      </div>

      <div className="animate-slide-up delay-75"><QuoteHeader symbol={symbol} /></div>
      <div className="animate-slide-up delay-100"><StockChart symbol={symbol} /></div>
      <div className="animate-slide-up delay-150"><DividendHistory symbol={symbol} /></div>
      <div className="animate-slide-up delay-200"><BuySellSentiment symbol={symbol} /></div>
      <div className="animate-slide-up delay-200"><AIAnalysis symbol={symbol} /></div>
      <div className="animate-slide-up delay-300"><AiScenarios symbol={symbol} /></div>
      <div className="animate-slide-up delay-300"><AnalystRecommendations symbol={symbol} /></div>
      <div className="animate-slide-up delay-400"><EarningsCard symbol={symbol} /></div>
      <div className="animate-slide-up delay-400"><YutaiCard symbol={symbol} /></div>
      <div className="animate-slide-up delay-500"><FundamentalsTable symbol={symbol} /></div>
      <div className="animate-slide-up delay-500"><HoldersCard symbol={symbol} /></div>
      <div className="animate-slide-up delay-500"><NewsCard symbol={symbol} /></div>
      <div className="animate-slide-up delay-500"><StockGeopoliticalNews symbol={symbol} /></div>
      <div className="animate-slide-up delay-500"><PeerStocks symbol={symbol} /></div>
    </div>
    </CurrencyProvider>
  );
}
