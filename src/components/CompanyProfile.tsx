"use client";

import { useEffect, useState } from "react";
import { Users, Globe, MapPin, Briefcase } from "lucide-react";
import { formatLargeNumber } from "@/lib/format";
import { translateCountry, translateIndustry } from "@/lib/i18n";

type Officer = {
  name: string;
  title: string | null;
  age: number | null;
  yearBorn: number | null;
  totalPay: number | null;
};

type Profile = {
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  address1?: string | null;
  phone?: string | null;
  website?: string | null;
  fullTimeEmployees?: number | null;
  longBusinessSummary?: string | null;
  longBusinessSummaryJa?: string | null;
  officers?: Officer[];
};

export default function CompanyProfile({ symbol }: { symbol: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.error) setProfile(j);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="text-sm text-slate-400">企業情報を読み込み中…</div>
      </div>
    );
  }

  if (!profile) return null;

  const location = [
    profile.city,
    profile.state,
    profile.country ? translateCountry(profile.country) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const summaryJa = profile.longBusinessSummaryJa ?? "";
  const summaryEn = profile.longBusinessSummary ?? "";
  const summary = showOriginal || !summaryJa ? summaryEn : summaryJa;
  const truncated =
    summary.length > 350 ? summary.slice(0, 350) + "…" : summary;
  const hasTranslation = !!summaryJa && summaryJa !== summaryEn;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
      <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-slate-500" />
        企業情報
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {profile.fullTimeEmployees !== null &&
          profile.fullTimeEmployees !== undefined && (
            <Stat
              icon={<Users className="w-3.5 h-3.5" />}
              label="従業員"
              value={formatLargeNumber(profile.fullTimeEmployees)}
            />
          )}
        {location && (
          <Stat
            icon={<MapPin className="w-3.5 h-3.5" />}
            label="本社所在地"
            value={location}
          />
        )}
        {profile.industry && (
          <Stat
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="業種"
            value={translateIndustry(profile.industry)}
          />
        )}
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
              <Globe className="w-3.5 h-3.5" />
              公式サイト
            </div>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline truncate mt-0.5">
              {new URL(profile.website).hostname.replace("www.", "")}
            </div>
          </a>
        )}
      </div>

      {summary && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">
              事業概要
              {hasTranslation && !showOriginal && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 normal-case tracking-normal">
                  自動翻訳
                </span>
              )}
            </h3>
            {hasTranslation && (
              <button
                onClick={() => setShowOriginal((s) => !s)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showOriginal ? "日本語で表示" : "原文 (英語) を表示"}
              </button>
            )}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {expanded ? summary : truncated}
          </p>
          {summary.length > 350 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {expanded ? "閉じる" : "もっと見る"}
            </button>
          )}
        </div>
      )}

      {profile.officers && profile.officers.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            主要役員
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {profile.officers.slice(0, 6).map((o, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
              >
                <div className="font-medium text-sm">{o.name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {o.title ?? "—"}
                  {o.age ? ` · ${o.age}歳` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="font-medium mt-0.5 text-slate-900 dark:text-slate-100 text-sm truncate">
        {value}
      </div>
    </div>
  );
}
