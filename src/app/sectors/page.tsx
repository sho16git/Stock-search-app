import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GICS_SECTORS } from "@/lib/gics";
import { getStocksBySector } from "@/lib/stocks-catalog";
import SectorStockTable from "@/components/SectorStockTable";

export const metadata = { title: "セクター一覧 | Stock Search" };

const ACCENT_CLASSES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber:   { bg: "from-amber-500 to-orange-500",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-200 dark:border-amber-900",   badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"   },
  stone:   { bg: "from-stone-500 to-slate-500",    text: "text-stone-700 dark:text-stone-300",   border: "border-stone-200 dark:border-stone-900",   badge: "bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300"   },
  sky:     { bg: "from-sky-500 to-blue-500",       text: "text-sky-700 dark:text-sky-300",       border: "border-sky-200 dark:border-sky-900",       badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"           },
  rose:    { bg: "from-rose-500 to-pink-500",      text: "text-rose-700 dark:text-rose-300",     border: "border-rose-200 dark:border-rose-900",     badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"       },
  emerald: { bg: "from-emerald-500 to-teal-500",   text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
  teal:    { bg: "from-teal-500 to-cyan-500",      text: "text-teal-700 dark:text-teal-300",     border: "border-teal-200 dark:border-teal-900",     badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"       },
  indigo:  { bg: "from-indigo-500 to-blue-600",    text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-900", badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  blue:    { bg: "from-blue-500 to-indigo-500",    text: "text-blue-700 dark:text-blue-300",     border: "border-blue-200 dark:border-blue-900",     badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"       },
  violet:  { bg: "from-violet-500 to-purple-500",  text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-900", badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" },
  yellow:  { bg: "from-yellow-500 to-amber-400",   text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-900", badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  fuchsia: { bg: "from-fuchsia-500 to-pink-500",   text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-900", badge: "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300" },
};

function fallbackAccent() {
  return { bg: "from-slate-500 to-slate-600", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800", badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" };
}

export default function SectorsPage() {
  const allSectors = GICS_SECTORS.map((sector) => {
    const stocks  = getStocksBySector(sector.id);
    const jpStocks = stocks.filter((s) => s.market === "JP" && (s.type ?? "stock") === "stock");
    const usStocks = stocks.filter((s) => s.market === "US" && (s.type ?? "stock") === "stock");
    return { sector, jpStocks, usStocks, total: jpStocks.length + usStocks.length };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-violet-500/20">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            📊 全セクター一覧
          </h1>
          <p className="text-violet-100 text-sm mt-1">
            GICS（世界産業分類基準）11セクター · 日米{allSectors.reduce((a, b) => a + b.total, 0)}銘柄
          </p>
        </div>
      </div>

      {/* Sector overview grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allSectors.map(({ sector, jpStocks, usStocks, total }) => {
          const ac = ACCENT_CLASSES[sector.accent] ?? fallbackAccent();
          return (
            <a
              key={sector.id}
              href={`#${sector.id}`}
              className={`group rounded-2xl border ${ac.border} bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${ac.bg} items-center justify-center text-xl shadow-sm mb-2`}>
                {sector.emoji}
              </div>
              <div className={`text-sm font-bold ${ac.text}`}>{sector.nameJa}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{sector.description}</div>
              <div className="flex gap-1.5 mt-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  🇯🇵 {jpStocks.length}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  🇺🇸 {usStocks.length}
                </span>
              </div>
            </a>
          );
        })}
      </div>

      {/* Per-sector sections */}
      {allSectors.map(({ sector, jpStocks, usStocks }) => {
        const ac = ACCENT_CLASSES[sector.accent] ?? fallbackAccent();
        return (
          <section key={sector.id} id={sector.id} className="scroll-mt-20">
            {/* Sector header */}
            <div className={`rounded-2xl border ${ac.border} bg-white dark:bg-slate-900 overflow-hidden shadow-sm`}>
              <div className={`h-1.5 bg-gradient-to-r ${ac.bg}`} />
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${ac.bg} items-center justify-center text-xl shadow-sm shrink-0`}>
                    {sector.emoji}
                  </span>
                  <div>
                    <h2 className={`text-lg font-black ${ac.text}`}>{sector.nameJa}</h2>
                    <p className="text-xs text-slate-500">{sector.description}</p>
                  </div>
                </div>
                <Link
                  href={`/sector/${sector.id}`}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${ac.border} ${ac.text} hover:opacity-80 transition-opacity whitespace-nowrap`}
                >
                  詳細 →
                </Link>
              </div>

              {/* JP Stocks */}
              {jpStocks.length > 0 && (
                <div className="px-4 pb-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">🇯🇵 日本株</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${ac.badge}`}>{jpStocks.length}銘柄</span>
                  </div>
                  <SectorStockTable stocks={jpStocks} compact />
                </div>
              )}

              {/* US Stocks */}
              {usStocks.length > 0 && (
                <div className={`px-4 pb-4 ${jpStocks.length > 0 ? "mt-4 pt-4 border-t border-slate-100 dark:border-slate-800" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">🇺🇸 米国株</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${ac.badge}`}>{usStocks.length}銘柄</span>
                  </div>
                  <SectorStockTable stocks={usStocks} compact />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
