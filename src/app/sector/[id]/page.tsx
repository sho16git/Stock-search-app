import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GICS_SECTORS, type GicsSectorId } from "@/lib/gics";
import { getStocksBySectorAll } from "@/lib/stocks-catalog";
import SectorStockTable from "@/components/SectorStockTable";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sector = GICS_SECTORS.find((s) => s.id === id);
  if (!sector) notFound();

  const stocks = getStocksBySectorAll(sector.id as GicsSectorId);
  const jpStocks = stocks.filter((s) => s.market === "JP");
  const usStocks = stocks.filter((s) => s.market === "US");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6">
          <div className="absolute -right-4 -top-4 text-8xl opacity-10 select-none">
            {sector.emoji}
          </div>
          <div className="relative">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              GICS · {sector.name}
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <span>{sector.emoji}</span>
              <span>{sector.nameJa}</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {sector.description}
            </p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>🇯🇵 日本株 {jpStocks.length}</span>
              <span>🇺🇸 米国株 {usStocks.length}</span>
              <span>合計 {stocks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {jpStocks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
            <span>🇯🇵</span>
            <span>日本株 ({jpStocks.length})</span>
          </h2>
          <SectorStockTable stocks={jpStocks} />
        </section>
      )}

      {usStocks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
            <span>🇺🇸</span>
            <span>米国株 ({usStocks.length})</span>
          </h2>
          <SectorStockTable stocks={usStocks} />
        </section>
      )}
    </div>
  );
}
