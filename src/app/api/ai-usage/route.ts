/**
 * /api/ai-usage — AI APIコスト・メーターの集計を返す / リセットする
 */
import { NextResponse } from "next/server";
import { readUsage, resetUsage } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readUsage());
}

export async function DELETE() {
  resetUsage();
  return NextResponse.json({ ok: true });
}
