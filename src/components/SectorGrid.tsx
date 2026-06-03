import Link from "next/link";
import { GICS_SECTORS } from "@/lib/gics";
import { getStocksBySector } from "@/lib/stocks-catalog";

export default function SectorGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {GICS_SECTORS.map((s) => {
        const count = getStocksBySector(s.id).length;
        return (
          <Link
            key={s.id}
            href={`/sector/${s.id}`}
            className="card-hover group relative block p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm overflow-hidden"
          >
            <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:opacity-20 transition-opacity select-none">
              {s.emoji}
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.emoji}</span>
                <span className="font-semibold text-sm">{s.nameJa}</span>
              </div>
              <div className="text-xs text-slate-500 truncate">
                {s.description}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider">
                {count} 銘柄
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
