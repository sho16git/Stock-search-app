import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { getMarketIndex, MARKET_INDICES } from "@/lib/index-components";
import SectorStockTable from "@/components/SectorStockTable";
import SearchBox from "@/components/SearchBox";

export function generateStaticParams() {
  return MARKET_INDICES.map((i) => ({ id: i.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const index = getMarketIndex(id);
  if (!index) return { title: "指数不明" };
  return {
    title: `${index.emoji} ${index.nameJa} — 構成銘柄一覧`,
    description: `${index.nameJa}の構成銘柄一覧。${index.description}`,
  };
}

export default async function MarketIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const index = getMarketIndex(id);
  if (!index) notFound();

  // Deduplicate symbols (S&P 500 list has some symbols listed in multiple sector groups)
  const uniqueSymbols = [...new Set(index.components)];
  const stocks = uniqueSymbols.map((symbol) => ({
    symbol,
    name: symbol, // Resolved at runtime from quote API / getJpName
    market: index.market,
  }));

  const gradientMap: Record<string, string> = {
    nikkei225:     "from-rose-50 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900",
    "topix-core30": "from-pink-50 via-white to-white dark:from-pink-950/20 dark:via-slate-900 dark:to-slate-900",
    dow30:         "from-sky-50 via-white to-white dark:from-sky-950/20 dark:via-slate-900 dark:to-slate-900",
    nasdaq100:     "from-violet-50 via-white to-white dark:from-violet-950/20 dark:via-slate-900 dark:to-slate-900",
    sp500:         "from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900",
  };
  const gradient = gradientMap[index.id] ?? gradientMap.sp500;

  return (
    <div className="space-y-4">

      {/* ── Navigation bar ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="flex-1">
          <SearchBox />
        </div>
      </div>

      {/* ── Index header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div
          className={`absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-br ${gradient}`}
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl shrink-0 leading-none mt-1">{index.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                マーケット指数 構成銘柄
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{index.nameJa}</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{index.nameEn}</p>
              <p className="text-sm text-slate-500 mt-1.5">{index.description}</p>

              {/* Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {index.market === "JP" ? "🇯🇵 日本株" : "🇺🇸 米国株"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {uniqueSymbols.length.toLocaleString()} 銘柄
                </span>
                {index.note && (
                  <span className="text-xs text-slate-400">{index.note}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Constituent table ── */}
      <SectorStockTable stocks={stocks} />
    </div>
  );
}
