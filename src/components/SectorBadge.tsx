"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSector } from "@/lib/gics";
import { translateCountry, translateIndustry } from "@/lib/i18n";

type Profile = {
  sector?: string | null;
  industry?: string | null;
  gicsId?: string | null;
  country?: string | null;
};

export default function SectorBadge({ symbol }: { symbol: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setProfile(null);
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

  if (loading || !profile) return null;

  const gics = profile.gicsId ? getSector(profile.gicsId) : null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {gics ? (
        <Link
          href={`/sector/${gics.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <span>{gics.emoji}</span>
          <span>{gics.nameJa}</span>
        </Link>
      ) : profile.sector ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
          {profile.sector}
        </span>
      ) : null}
      {profile.industry && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
          {translateIndustry(profile.industry)}
        </span>
      )}
      {profile.country && (
        <span className="text-xs text-slate-500">
          {translateCountry(profile.country)}
        </span>
      )}
    </div>
  );
}
