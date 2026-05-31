import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getSector, GICS_SECTORS } from "@/lib/gics";
import { getStocksBySectorAll } from "@/lib/stocks-catalog";
import SectorStockTable from "@/components/SectorStockTable";
import SearchBox from "@/components/SearchBox";

export function generateStaticParams() {
  return GICS_SECTORS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sector = getSector(id);
  if (!sector) return { title: "セクター不明" };
  return {
    title: `${sector.emoji} ${sector.nameJa} — セクター銘柄一覧`,
    description: `${sector.nameJa}セクターの銘柄一覧（日本株・米国株）。${sector.description}`,
  };
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sector = getSector(id);
  if (!sector) notFound();

  const allStocks = getStocksBySectorAll(sector.id);
  const jpStocks  = allStocks.filter((s) => s.market === "JP");
  const usStocks  = allStocks.filter((s) => s.market === "US");

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

      {/* ── Sector header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* bg accent */}
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-br from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl shrink-0 leading-none mt-1">{sector.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                GICS セクター
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{sector.nameJa}</h1>
              <p className="text-sm text-slate-500 mt-1.5">{sector.description}</p>

              {/* Stock count chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  🇯🇵 日本株 {jpStocks.length.toLocaleString()} 銘柄
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  🇺🇸 米国株 {usStocks.length.toLocaleString()} 銘柄
                </span>
                <span className="text-xs text-slate-400">
                  合計 {allStocks.length.toLocaleString()} 銘柄
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Japanese stocks ── */}
      {jpStocks.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-2">
            🇯🇵 <span>日本株</span>
            <span className="text-slate-400 font-normal text-xs">
              ({jpStocks.length.toLocaleString()} 銘柄)
            </span>
          </h2>
          <SectorStockTable stocks={jpStocks} />
        </section>
      )}

      {/* ── US stocks ── */}
      {usStocks.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-2">
            🇺🇸 <span>米国株</span>
            <span className="text-slate-400 font-normal text-xs">
              ({usStocks.length.toLocaleString()} 銘柄)
            </span>
          </h2>
          <SectorStockTable stocks={usStocks} />
        </section>
      )}
    </div>
  );
}
