import { NextResponse } from "next/server";
import { regenerateSectionPlanner } from "@/lib/planner";
import type { RegenerateSectionRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RegenerateSectionRequest>;

  if (!body.section || !body.hypothesis || !body.parsed || !body.plan) {
    return NextResponse.json(
      { error: "section, hypothesis, parsed, and plan are required." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    await regenerateSectionPlanner({
      section: body.section,
      hypothesis: body.hypothesis,
      parsed: body.parsed,
      plan: body.plan,
      reviewMemory: body.reviewMemory ?? [],
      labSettings: body.labSettings,
    }),
  );
}
