import { NextResponse } from "next/server";
import { generateExperimentPlanner } from "@/lib/planner";
import type { GeneratePlanRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GeneratePlanRequest>;
  const hypothesis = body.hypothesis?.trim();

  if (!hypothesis) {
    return NextResponse.json(
      { error: "Hypothesis is required." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    await generateExperimentPlanner(
      hypothesis,
      body.reviewMemory ?? [],
      body.labSettings,
    ),
  );
}
