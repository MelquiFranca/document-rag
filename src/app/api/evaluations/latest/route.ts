import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLatestEvaluation } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ evaluation: await getLatestEvaluation(db) });
  } catch (error) {
    console.error("evaluations.latest_failed", error);
    return NextResponse.json(
      { code: "DATABASE_UNAVAILABLE", message: "Não foi possível carregar a avaliação." },
      { status: 503 },
    );
  }
}
