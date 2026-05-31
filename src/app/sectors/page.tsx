import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SectorHeatmap from "@/components/SectorHeatmap";
import { GICS_SECTORS } from "@/lib/gics";

export const metadata = {
  title: "セクター一覧",
  description: "GICS 11セクター別の株価動向と銘柄一覧",
};

export default function SectorsPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>トップ</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          📊 セクター一覧
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          GICS 11セクター — 各セクターをタップして銘柄を見る
        </p>
      </div>

      {/* Sector heatmap (market filter + heat/list view + links) */}
      <SectorHeatmap />

      {/* Quick-jump grid */}
      <section>
        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">
          セクターから探す
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {GICS_SECTORS.map((s) => (
            <Link
              key={s.id}
              href={`/sector/${s.id}`}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <span className="text-xl shrink-0">{s.emoji}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {s.nameJa}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{s.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
